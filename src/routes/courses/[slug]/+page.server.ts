import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resolveCourseScope } from '$lib/server/course-access';
import { createSupabaseServiceClient } from '$lib/server/supabase';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

type BlockType = 'video' | 'quiz' | 'checkoff' | 'reading';
type BlockDraft = {
	id?: string;
	type: BlockType;
	config: Record<string, unknown>;
	optional?: boolean;
};
type QuizQuestionType = 'mc' | 'ms' | 'tf' | 'short' | 'matrix' | 'matrix_ms' | 'short_grid';

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.min(max, Math.max(min, Math.trunc(n)));
};

function normalizeVideoConfig(raw: any) {
	const title = String(raw?.title ?? '').trim();
	const video_url = String(raw?.video_url ?? '').trim();
	const start_seconds = Math.max(0, Math.trunc(Number(raw?.start_seconds ?? 0)) || 0);
	const endRaw = Number(raw?.end_seconds);
	const end_seconds = Number.isFinite(endRaw) && endRaw > 0 ? Math.trunc(endRaw) : null;
	return { title, video_url, start_seconds, end_seconds };
}

function normalizeQuizConfig(raw: any) {
	const normalizeQuestions = (input: unknown) => {
		const list = Array.isArray(input) ? input : [];
		const out: Array<{
			id: string;
			prompt: string;
			type: QuizQuestionType;
			options?: string[];
			correct: string | string[];
			randomize_options?: boolean;
			max_select?: number;
			short_ignore_punctuation?: boolean;
			short_ignore_case?: boolean;
			short_required?: boolean;
		}> = [];
		for (let i = 0; i < list.length; i += 1) {
			const rawQuestion = (list[i] ?? {}) as Record<string, unknown>;
			const type = String(rawQuestion.type ?? 'mc') as QuizQuestionType;
			const safeType: QuizQuestionType = [
				'mc',
				'ms',
				'tf',
				'short',
				'matrix',
				'matrix_ms',
				'short_grid'
			].includes(type)
				? type
				: 'mc';
			const prompt = String(rawQuestion.prompt ?? '').trim();
			const id = String(rawQuestion.id ?? `q${i + 1}`).trim() || `q${i + 1}`;
			const randomizeOptions = Boolean(rawQuestion.randomize_options);
			const shortIgnorePunctuation =
				rawQuestion.short_ignore_punctuation == null
					? false
					: Boolean(rawQuestion.short_ignore_punctuation);
			const shortIgnoreCase =
				rawQuestion.short_ignore_case == null ? true : Boolean(rawQuestion.short_ignore_case);
			const shortRequired =
				rawQuestion.short_required == null ? true : Boolean(rawQuestion.short_required);

			if (safeType === 'mc' || safeType === 'ms') {
				const options = (Array.isArray(rawQuestion.options) ? rawQuestion.options : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				const uniqueOptions = Array.from(new Set(options));
				if (safeType === 'mc') {
					const correctRaw = String(rawQuestion.correct ?? '').trim();
					const correct = uniqueOptions.includes(correctRaw) ? correctRaw : '';
					out.push({
						id,
						prompt,
						type: safeType,
						options: uniqueOptions,
						correct,
						randomize_options: randomizeOptions
					});
				} else {
					const correctList = Array.isArray(rawQuestion.correct)
						? rawQuestion.correct
						: typeof rawQuestion.correct === 'string'
							? [rawQuestion.correct]
							: [];
					const normalizedCorrect = Array.from(
						new Set(
							correctList
								.map((v) => String(v ?? '').trim())
								.filter((v) => uniqueOptions.includes(v))
						)
					);
					const rawMaxSelect = Number(rawQuestion.max_select);
					const maxSelect =
						Number.isFinite(rawMaxSelect) && rawMaxSelect > 0
							? clampInt(rawMaxSelect, 1, 1, uniqueOptions.length || 1)
							: null;
					out.push({
						id,
						prompt,
						type: safeType,
						options: uniqueOptions,
						correct: normalizedCorrect,
						max_select: maxSelect ?? undefined,
						randomize_options: randomizeOptions
					});
				}
				continue;
			}

			if (safeType === 'tf') {
				const rawCorrect = String(rawQuestion.correct ?? '')
					.trim()
					.toLowerCase();
				const correct = rawCorrect === 'false' ? 'false' : 'true';
				out.push({ id, prompt, type: safeType, correct });
				continue;
			}

			if (safeType === 'matrix') {
				const rows = (Array.isArray(rawQuestion.rows) ? rawQuestion.rows : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				const columns = (Array.isArray(rawQuestion.columns) ? rawQuestion.columns : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				const rawMap =
					rawQuestion.correct_map && typeof rawQuestion.correct_map === 'object'
						? (rawQuestion.correct_map as Record<string, unknown>)
						: {};
				const correct_map: Record<string, string> = {};
				for (const row of rows) {
					const candidate = String(rawMap[row] ?? '').trim();
					if (candidate && columns.includes(candidate)) correct_map[row] = candidate;
				}
				out.push({
					id,
					prompt,
					type: 'matrix',
					correct: '',
					rows,
					columns,
					correct_map
				} as any);
				continue;
			}
			if (safeType === 'matrix_ms') {
				const rows = (Array.isArray(rawQuestion.rows) ? rawQuestion.rows : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				const columns = (Array.isArray(rawQuestion.columns) ? rawQuestion.columns : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				const rawMap =
					rawQuestion.correct_map_multi && typeof rawQuestion.correct_map_multi === 'object'
						? (rawQuestion.correct_map_multi as Record<string, unknown>)
						: {};
				const correct_map_multi: Record<string, string[]> = {};
				for (const row of rows) {
					const candidate = Array.isArray(rawMap[row])
						? (rawMap[row] as unknown[])
								.map((v) => String(v ?? '').trim())
								.filter((v) => columns.includes(v))
						: [];
					correct_map_multi[row] = Array.from(new Set(candidate));
				}
				out.push({
					id,
					prompt,
					type: 'matrix_ms',
					correct: '',
					rows,
					columns,
					correct_map_multi
				} as any);
				continue;
			}
			if (safeType === 'short_grid') {
				const rows = (Array.isArray(rawQuestion.rows) ? rawQuestion.rows : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				const columns = (Array.isArray(rawQuestion.columns) ? rawQuestion.columns : [])
					.map((v) => String(v ?? '').trim())
					.filter(Boolean);
				out.push({
					id,
					prompt,
					type: 'short_grid',
					correct: '',
					rows,
					columns
				} as any);
				continue;
			}

			out.push({
				id,
				prompt,
				type: 'short',
				correct: String(rawQuestion.correct ?? '').trim(),
				short_ignore_punctuation: shortIgnorePunctuation,
				short_ignore_case: shortIgnoreCase,
				short_required: shortRequired
			});
		}
		return out;
	};

	const title = String(raw?.title ?? '').trim();
	const passing_score = clampInt(raw?.passing_score, 80, 1, 100);
	const min_seconds_between_attempts = clampInt(raw?.min_seconds_between_attempts, 15, 0, 3600);
	const max_attempts_raw = Number(raw?.max_attempts);
	const max_attempts =
		Number.isFinite(max_attempts_raw) && max_attempts_raw > 0
			? clampInt(max_attempts_raw, 1, 1, 1000)
			: null;
	const fail_window_minutes = clampInt(raw?.fail_window_minutes, 10, 1, 1440);
	const max_failed_in_window = clampInt(raw?.max_failed_in_window, 5, 1, 200);
	const short_answer_min_chars = clampInt(raw?.short_answer_min_chars, 3, 0, 5000);
	const short_answer_max_chars = clampInt(raw?.short_answer_max_chars, 300, 1, 5000);
	const questions = normalizeQuestions(raw?.questions);
	return {
		title,
		passing_score,
		min_seconds_between_attempts,
		max_attempts,
		fail_window_minutes,
		max_failed_in_window,
		short_answer_min_chars,
		short_answer_max_chars,
		questions
	};
}

function normalizeCheckoffConfig(raw: any) {
	const validEvidence = new Set(['none', 'photo_optional', 'photo_required']);
	const title = String(raw?.title ?? '').trim() || 'Skills Check';
	const directions = String(raw?.directions ?? '').trim();
	const evidence_mode = validEvidence.has(String(raw?.evidence_mode))
		? String(raw?.evidence_mode)
		: 'none';
	const mentor_checklist = Array.isArray(raw?.mentor_checklist)
		? raw.mentor_checklist.map((v: unknown) => String(v ?? '').trim()).filter(Boolean)
		: [];
	const resource_links = Array.isArray(raw?.resource_links)
		? raw.resource_links.map((v: unknown) => String(v ?? '').trim()).filter(Boolean)
		: [];
	const show_mentor_checklist_to_students = Boolean(
		raw?.show_mentor_checklist_to_students ?? false
	);
	return {
		title,
		directions,
		evidence_mode,
		mentor_checklist,
		resource_links,
		show_mentor_checklist_to_students
	};
}

function normalizeReadingConfig(raw: any) {
	const title = String(raw?.title ?? '').trim() || 'Reading';
	const content = String(raw?.content ?? '').trim();
	const resource_links = Array.isArray(raw?.resource_links)
		? raw.resource_links.map((v: unknown) => String(v ?? '').trim()).filter(Boolean)
		: [];
	return { title, content, resource_links };
}

// Whether the actor may edit this specific course. Mentors/admins always can;
// a subteam lead only if the course targets one of the subteams they lead.
async function leadCanEditNode(
	locals: App.Locals,
	scope: Awaited<ReturnType<typeof resolveCourseScope>>,
	nodeId: string
): Promise<boolean> {
	if (scope.isFull) return true;
	const ledSet = new Set(scope.ledTeamIds);
	const { data } = await locals.supabase
		.from('node_team_targets')
		.select('team_id')
		.eq('node_id', nodeId);
	return (data ?? []).some((r: any) => ledSet.has(String(r.team_id)));
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user, profile } = await locals.safeGetSession();
	const scope = await resolveCourseScope(locals.supabase, user, profile);
	if (!scope.canManage) throw redirect(303, '/dashboard');

	const { data: node, error: nodeErr } = await locals.supabase
		.from('nodes')
		.select('id,title,slug,description,proficiency_level,code,gating_mode')
		.eq('slug', params.slug)
		.single();
	if (nodeErr || !node) throw error(404, 'Course not found');

	const [
		prereqsResp,
		allNodesResp,
		blocksResp,
		trainingCategoriesResp,
		nodeCategoriesResp,
		teamsResp,
		nodeTeamTargetsResp
	] = await Promise.all([
		locals.supabase
			.from('node_prerequisites')
			.select('prerequisite_node_id')
			.eq('node_id', node.id),
		locals.supabase.from('nodes').select('id,title,slug').neq('id', node.id).order('title'),
		locals.supabase
			.from('node_blocks')
			.select('id,position,type,config,optional')
			.eq('node_id', node.id)
			.order('position'),
		locals.supabase
			.from('training_categories')
			.select('id,name,slug,parent_id,kind,sort_order')
			.eq('is_active', true)
			.order('sort_order', { ascending: true }),
		locals.supabase.from('node_categories').select('category_id').eq('node_id', node.id),
		locals.supabase
			.from('teams')
			.select('id,name,slug,team_group_id,team_groups(name,slug,sort_order)')
			.order('name'),
		locals.supabase.from('node_team_targets').select('team_id').eq('node_id', node.id)
	]);

	const allTeams = teamsResp.data ?? [];
	const nodeTeamIds = (nodeTeamTargetsResp.data ?? []).map((row: any) => String(row.team_id));

	// Subteam leads may only open courses that target one of their subteams, and
	// only their own subteams are editable targets. Targets on other subteams are
	// preserved and shown read-only.
	const ledSet = scope.isFull ? null : new Set(scope.ledTeamIds);
	if (ledSet && !nodeTeamIds.some((id: string) => ledSet.has(id))) {
		throw redirect(303, '/courses');
	}
	const visibleTeams = ledSet ? allTeams.filter((t: any) => ledSet.has(String(t.id))) : allTeams;
	const lockedTeamTargets = ledSet
		? allTeams
				.filter((t: any) => nodeTeamIds.includes(String(t.id)) && !ledSet.has(String(t.id)))
				.map((t: any) => ({ id: String(t.id), name: String(t.name) }))
		: [];

	return {
		node,
		prereqIds: (prereqsResp.data ?? []).map(
			(p: { prerequisite_node_id: string }) => p.prerequisite_node_id
		),
		allNodes: allNodesResp.data ?? [],
		blocks: blocksResp.data ?? [],
		trainingCategories: trainingCategoriesResp.data ?? [],
		nodeCategoryIds: (nodeCategoriesResp.data ?? []).map((row: any) => String(row.category_id)),
		teams: visibleTeams,
		nodeTeamIds,
		isFullCourseAccess: scope.isFull,
		lockedTeamTargets
	};
};

export const actions: Actions = {
	saveTemplate: async ({ locals, params, request }) => {
		const { user, profile } = await locals.safeGetSession();
		// Templates are global, so saving one stays mentor/admin only.
		const scope = await resolveCourseScope(locals.supabase, user, profile);
		if (!scope.isFull) return fail(403, { error: 'Forbidden', section: 'details' });
		const form = await request.formData();
		const templateName = String(form.get('template_name') ?? '').trim();
		if (!templateName)
			return fail(400, { error: 'Template name is required.', section: 'details' });

		const { data: node } = await locals.supabase
			.from('nodes')
			.select('id,title,description')
			.eq('slug', params.slug)
			.single();
		if (!node) return fail(404, { error: 'Course not found.', section: 'details' });

		const [{ data: teamTargets }, { data: categories }, { data: prereqs }, { data: blocks }] =
			await Promise.all([
				locals.supabase.from('node_team_targets').select('team_id').eq('node_id', node.id),
				locals.supabase.from('node_categories').select('category_id').eq('node_id', node.id),
				locals.supabase
					.from('node_prerequisites')
					.select('prerequisite_node_id')
					.eq('node_id', node.id),
				locals.supabase
					.from('node_blocks')
					.select('position,type,config')
					.eq('node_id', node.id)
					.order('position')
			]);

		const { error: templateErr } = await locals.supabase.from('course_templates').insert({
			name: templateName,
			title: String(node.title ?? ''),
			description: String(node.description ?? ''),
			team_ids: (teamTargets ?? []).map((row: any) => String(row.team_id)),
			category_ids: (categories ?? []).map((row: any) => String(row.category_id)),
			prereq_ids: (prereqs ?? []).map((row: any) => String(row.prerequisite_node_id)),
			blocks_json: blocks ?? [],
			created_by: user?.id ?? null
		});
		if (templateErr) return fail(400, { error: templateErr.message, section: 'details' });
		return { ok: true, section: 'details' };
	},
	updateNode: async ({ locals, params, request }) => {
		const { user, profile } = await locals.safeGetSession();
		const scope = await resolveCourseScope(locals.supabase, user, profile);
		if (!scope.canManage) return fail(403, { error: 'Forbidden', section: 'details' });
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const rawSlug = String(form.get('slug') ?? '').trim();
		const slug = rawSlug ? slugify(rawSlug) : slugify(title);
		const teamIds = form
			.getAll('team_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const description = String(form.get('description') ?? '');
		const rawLevel = String(form.get('proficiency_level') ?? '').trim();
		const proficiencyLevel = ['beginner', 'intermediate', 'advanced'].includes(rawLevel)
			? rawLevel
			: null;
		const rawGating = String(form.get('gating_mode') ?? '').trim();
		const gatingMode = ['require_checkoff', 'blocks_only'].includes(rawGating)
			? rawGating
			: 'require_checkoff';
		const categoryIds = form
			.getAll('category_ids')
			.map((v) => String(v))
			.filter(Boolean);

		if (!title || !slug) {
			return fail(400, { error: 'Title and slug are required.', section: 'details' });
		}

		// Authorize a subteam lead against the course's current targets, and confirm
		// any submitted targets are within the subteams they lead.
		const { data: existingNode } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.slug)
			.single();
		if (!existingNode?.id) return fail(404, { error: 'Course not found', section: 'details' });
		const ledSet = scope.isFull ? null : new Set(scope.ledTeamIds);
		if (ledSet) {
			if (!(await leadCanEditNode(locals, scope, String(existingNode.id))))
				return fail(403, { error: 'Forbidden', section: 'details' });
			if (teamIds.some((id) => !ledSet.has(id)))
				return fail(403, {
					error: 'You can only target the subteams you lead.',
					section: 'details'
				});
		}
		// Lead writes bypass mentor/admin RLS via the service client after the
		// authorization above; mentors/admins keep the RLS-bound client.
		const db = scope.isFull ? locals.supabase : createSupabaseServiceClient();

		const { error: err } = await db
			.from('nodes')
			.update({
				title,
				slug,
				subteam_id: null,
				description,
				proficiency_level: proficiencyLevel,
				gating_mode: gatingMode
			})
			.eq('slug', params.slug);

		if (err) return fail(400, { error: err.message, section: 'details' });

		const { data: currentNode } = await db.from('nodes').select('id').eq('slug', slug).single();
		if (currentNode?.id) {
			if (ledSet) {
				// Merge: only toggle targets for the subteams this lead controls,
				// leaving other subteams' targets on the course untouched.
				const { data: existingTargets } = await db
					.from('node_team_targets')
					.select('team_id')
					.eq('node_id', currentNode.id);
				const existingLed = (existingTargets ?? [])
					.map((r: any) => String(r.team_id))
					.filter((id: string) => ledSet.has(id));
				const desiredLed = teamIds.filter((id) => ledSet.has(id));
				const toRemove = existingLed.filter((id: string) => !desiredLed.includes(id));
				const toAdd = desiredLed.filter((id) => !existingLed.includes(id));
				if (toRemove.length > 0) {
					const { error: removeErr } = await db
						.from('node_team_targets')
						.delete()
						.eq('node_id', currentNode.id)
						.in('team_id', toRemove);
					if (removeErr) return fail(400, { error: removeErr.message, section: 'details' });
				}
				if (toAdd.length > 0) {
					const { error: addErr } = await db
						.from('node_team_targets')
						.insert(toAdd.map((teamId) => ({ node_id: currentNode.id, team_id: teamId })));
					if (addErr) return fail(400, { error: addErr.message, section: 'details' });
				}
			} else {
				const { error: deleteTeamsErr } = await db
					.from('node_team_targets')
					.delete()
					.eq('node_id', currentNode.id);
				if (deleteTeamsErr) return fail(400, { error: deleteTeamsErr.message, section: 'details' });
				if (teamIds.length > 0) {
					const { error: insertTeamsErr } = await db.from('node_team_targets').insert(
						teamIds.map((teamId) => ({
							node_id: currentNode.id,
							team_id: teamId
						}))
					);
					if (insertTeamsErr)
						return fail(400, { error: insertTeamsErr.message, section: 'details' });
				}
			}
			const { error: deleteCategoriesErr } = await db
				.from('node_categories')
				.delete()
				.eq('node_id', currentNode.id);
			if (deleteCategoriesErr)
				return fail(400, { error: deleteCategoriesErr.message, section: 'details' });
			if (categoryIds.length > 0) {
				const { error: insertCategoriesErr } = await db.from('node_categories').insert(
					categoryIds.map((categoryId) => ({
						node_id: currentNode.id,
						category_id: categoryId
					}))
				);
				if (insertCategoriesErr)
					return fail(400, { error: insertCategoriesErr.message, section: 'details' });
			}
		}

		if (slug !== params.slug) throw redirect(303, `/courses/${slug}`);
		return { ok: true, section: 'details' };
	},

	saveBlocks: async ({ locals, params, request }) => {
		const { user, profile } = await locals.safeGetSession();
		const scope = await resolveCourseScope(locals.supabase, user, profile);
		if (!scope.canManage) return fail(403, { error: 'Forbidden', section: 'blocks' });
		const form = await request.formData();
		const rawBlocksJson = String(form.get('blocks_json') ?? '[]');
		let draftBlocks: BlockDraft[] = [];
		try {
			draftBlocks = JSON.parse(rawBlocksJson);
		} catch {
			return fail(400, {
				error: 'Block payload is malformed.',
				section: 'blocks',
				blocks_json: rawBlocksJson
			});
		}
		if (!Array.isArray(draftBlocks)) {
			return fail(400, {
				error: 'Blocks must be an array.',
				section: 'blocks',
				blocks_json: rawBlocksJson
			});
		}

		const { data: nodeRow } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.slug)
			.single();
		if (!nodeRow) {
			return fail(404, {
				error: 'Course not found',
				section: 'blocks',
				blocks_json: rawBlocksJson
			});
		}
		if (!(await leadCanEditNode(locals, scope, String(nodeRow.id)))) {
			return fail(403, { error: 'Forbidden', section: 'blocks', blocks_json: rawBlocksJson });
		}
		// Lead writes go through the service client after the authorization above.
		const db = scope.isFull ? locals.supabase : createSupabaseServiceClient();

		const rows: Array<{
			id?: string;
			node_id: string;
			position: number;
			type: BlockType;
			config: object;
			optional: boolean;
		}> = [];
		const blockErrors: Record<number, string> = {};
		for (let i = 0; i < draftBlocks.length; i += 1) {
			const block = draftBlocks[i];
			const type = block.type as BlockType;
			if (!['video', 'quiz', 'checkoff', 'reading'].includes(type)) {
				blockErrors[i] = `Unknown block type at position ${i + 1}.`;
				continue;
			}
			let config: Record<string, unknown>;
			if (type === 'video') {
				const v = normalizeVideoConfig(block.config);
				if (!v.video_url) {
					blockErrors[i] = `Video block #${i + 1} needs a YouTube URL.`;
					continue;
				}
				if (v.end_seconds != null && v.end_seconds <= v.start_seconds) {
					blockErrors[i] = `Video block #${i + 1} has an invalid end time.`;
					continue;
				}
				config = v;
			} else if (type === 'quiz') {
				const q = normalizeQuizConfig(block.config);
				if (q.short_answer_max_chars < q.short_answer_min_chars) {
					blockErrors[i] = `Quiz block #${i + 1} has min > max for short answer length.`;
					continue;
				}
				if (!Array.isArray(q.questions) || q.questions.length === 0) {
					blockErrors[i] = `Quiz block #${i + 1} needs at least one question.`;
					continue;
				}
				const invalidQuestion = q.questions.find((question) => {
					if (!String(question.prompt ?? '').trim()) return true;
					if (question.type === 'mc') {
						return (
							!Array.isArray(question.options) || question.options.length < 2 || !question.correct
						);
					}
					if (question.type === 'ms') {
						const maxSelectRaw = Number((question as any).max_select);
						const maxSelect =
							Number.isFinite(maxSelectRaw) && maxSelectRaw > 0 ? Math.trunc(maxSelectRaw) : null;
						return (
							!Array.isArray(question.options) ||
							question.options.length < 2 ||
							!Array.isArray(question.correct) ||
							question.correct.length === 0 ||
							(maxSelect != null && question.correct.length > maxSelect)
						);
					}
					if (question.type === 'short') {
						const required =
							(question as { short_required?: boolean }).short_required == null
								? true
								: Boolean((question as { short_required?: boolean }).short_required);
						if (!required) return false;
						return !String(question.correct ?? '').trim();
					}
					return false;
				});
				if (invalidQuestion) {
					const questionNumber = q.questions.indexOf(invalidQuestion) + 1;
					const prompt = String(invalidQuestion.prompt ?? '').trim();
					if (!prompt) {
						blockErrors[i] =
							`Quiz block #${i + 1}, Q${questionNumber}: question prompt is required.`;
						continue;
					}
					if (invalidQuestion.type === 'mc') {
						if (!Array.isArray(invalidQuestion.options) || invalidQuestion.options.length < 2) {
							blockErrors[i] =
								`Quiz block #${i + 1}, Q${questionNumber}: multiple choice needs at least 2 options.`;
							continue;
						}
						if (!invalidQuestion.correct) {
							blockErrors[i] =
								`Quiz block #${i + 1}, Q${questionNumber}: select the correct multiple-choice answer.`;
							continue;
						}
					}
					if (invalidQuestion.type === 'ms') {
						if (!Array.isArray(invalidQuestion.options) || invalidQuestion.options.length < 2) {
							blockErrors[i] =
								`Quiz block #${i + 1}, Q${questionNumber}: multiple select needs at least 2 options.`;
							continue;
						}
						if (!Array.isArray(invalidQuestion.correct) || invalidQuestion.correct.length === 0) {
							blockErrors[i] =
								`Quiz block #${i + 1}, Q${questionNumber}: choose at least one correct multiple-select answer.`;
							continue;
						}
						const maxSelectRaw = Number((invalidQuestion as any).max_select);
						if (
							Number.isFinite(maxSelectRaw) &&
							maxSelectRaw > 0 &&
							invalidQuestion.correct.length > Math.trunc(maxSelectRaw)
						) {
							blockErrors[i] =
								`Quiz block #${i + 1}, Q${questionNumber}: correct answers exceed max selections.`;
							continue;
						}
					}
					if (
						invalidQuestion.type === 'short' &&
						((invalidQuestion as { short_required?: boolean }).short_required == null
							? true
							: Boolean((invalidQuestion as { short_required?: boolean }).short_required)) &&
						!String(invalidQuestion.correct ?? '').trim()
					) {
						blockErrors[i] =
							`Quiz block #${i + 1}, Q${questionNumber}: expected short-answer text is required.`;
						continue;
					}
					if (
						invalidQuestion.type === 'matrix' ||
						invalidQuestion.type === 'matrix_ms' ||
						invalidQuestion.type === 'short_grid'
					) {
						const rows = Array.isArray((invalidQuestion as any).rows)
							? ((invalidQuestion as any).rows as string[])
									.map((v) => String(v).trim())
									.filter(Boolean)
							: [];
						const columns = Array.isArray((invalidQuestion as any).columns)
							? ((invalidQuestion as any).columns as string[])
									.map((v) => String(v).trim())
									.filter(Boolean)
							: [];
						if (rows.length === 0 || columns.length < 2) {
							blockErrors[i] =
								`Quiz block #${i + 1}, Q${questionNumber}: grid needs at least 1 row and 2 columns.`;
							continue;
						}
					}
					blockErrors[i] = `Quiz block #${i + 1}, Q${questionNumber}: invalid question setup.`;
					continue;
				}
				config = q;
			} else if (type === 'checkoff') {
				config = normalizeCheckoffConfig(block.config);
			} else {
				const r = normalizeReadingConfig(block.config);
				if (!r.content && r.resource_links.length === 0) {
					blockErrors[i] = `Reading block #${i + 1} needs content or at least one resource link.`;
					continue;
				}
				config = r;
			}
			rows.push({
				id: block.id,
				node_id: nodeRow.id,
				position: i + 1,
				type,
				config,
				optional: Boolean(block.optional)
			});
		}

		if (Object.keys(blockErrors).length > 0) {
			return fail(400, {
				error: 'Please fix the highlighted block errors.',
				section: 'blocks',
				block_errors: blockErrors,
				blocks_json: rawBlocksJson
			});
		}

		const { data: existingBlocks, error: existingErr } = await locals.supabase
			.from('node_blocks')
			.select('id,position')
			.eq('node_id', nodeRow.id);
		if (existingErr) {
			return fail(400, {
				error: existingErr.message,
				section: 'blocks',
				blocks_json: rawBlocksJson
			});
		}
		const existingIds = new Set((existingBlocks ?? []).map((b: any) => String(b.id)));

		const deleteIds = [...existingIds].filter(
			(id) => !rows.some((r) => r.id && String(r.id) === id)
		);
		if (deleteIds.length > 0) {
			const { error: deleteErr } = await db
				.from('node_blocks')
				.delete()
				.eq('node_id', nodeRow.id)
				.in('id', deleteIds);
			if (deleteErr) {
				return fail(400, {
					error: deleteErr.message,
					section: 'blocks',
					blocks_json: rawBlocksJson
				});
			}
		}

		const survivingBlocks = (existingBlocks ?? [])
			.filter((b: any) => !deleteIds.includes(String(b.id)))
			.sort((a: any, b: any) => Number(b.position) - Number(a.position));
		for (let i = 0; i < survivingBlocks.length; i++) {
			const { error: shiftErr } = await db
				.from('node_blocks')
				.update({ position: 1000000 + i })
				.eq('id', String(survivingBlocks[i].id))
				.eq('node_id', nodeRow.id);
			if (shiftErr) {
				return fail(400, {
					error: shiftErr.message,
					section: 'blocks',
					blocks_json: rawBlocksJson
				});
			}
		}

		const keepIds: string[] = [];
		for (const row of rows) {
			const persistedId = row.id ? String(row.id) : '';
			if (persistedId && existingIds.has(persistedId)) {
				const { data: updated, error: updateErr } = await db
					.from('node_blocks')
					.update({
						position: row.position,
						type: row.type,
						config: row.config,
						optional: row.optional
					})
					.eq('id', persistedId)
					.eq('node_id', nodeRow.id)
					.select('id')
					.single();
				if (updateErr) {
					return fail(400, {
						error: updateErr.message,
						section: 'blocks',
						blocks_json: rawBlocksJson
					});
				}
				if (updated?.id) keepIds.push(String(updated.id));
			} else {
				const { data: inserted, error: insertErr } = await db
					.from('node_blocks')
					.insert({
						node_id: row.node_id,
						position: row.position,
						type: row.type,
						config: row.config,
						optional: row.optional
					})
					.select('id')
					.single();
				if (insertErr) {
					return fail(400, {
						error: insertErr.message,
						section: 'blocks',
						blocks_json: rawBlocksJson
					});
				}
				if (inserted?.id) keepIds.push(String(inserted.id));
			}
		}

		if (rows.length === 0) {
			const { error: clearErr } = await db.from('node_blocks').delete().eq('node_id', nodeRow.id);
			if (clearErr) {
				return fail(400, {
					error: clearErr.message,
					section: 'blocks',
					blocks_json: rawBlocksJson
				});
			}
		}

		const checkoffBlock = rows.find((r) => r.type === 'checkoff');
		if (checkoffBlock) {
			const cfg = checkoffBlock.config as ReturnType<typeof normalizeCheckoffConfig>;
			const { error: checkoffErr } = await db.from('node_checkoff_requirements').upsert(
				{
					node_id: nodeRow.id,
					title: cfg.title,
					directions: cfg.directions,
					mentor_checklist: cfg.mentor_checklist,
					resource_links: cfg.resource_links,
					evidence_mode: cfg.evidence_mode
				},
				{ onConflict: 'node_id' }
			);
			if (checkoffErr) return fail(400, { error: checkoffErr.message, section: 'blocks' });
		} else {
			const { error: resetCheckoffErr } = await db.from('node_checkoff_requirements').upsert(
				{
					node_id: nodeRow.id,
					title: 'Skills Check',
					directions: '',
					mentor_checklist: [],
					resource_links: [],
					evidence_mode: 'none'
				},
				{ onConflict: 'node_id' }
			);
			if (resetCheckoffErr)
				return fail(400, { error: resetCheckoffErr.message, section: 'blocks' });
		}

		const quizBlocks = rows.filter((r) => r.type === 'quiz');
		const firstQuiz = quizBlocks[0]?.config as ReturnType<typeof normalizeQuizConfig> | undefined;
		if (firstQuiz) {
			const { error: assessmentErr } = await db.from('assessments').upsert(
				{
					node_id: nodeRow.id,
					passing_score: firstQuiz.passing_score,
					questions: firstQuiz.questions,
					min_seconds_between_attempts: firstQuiz.min_seconds_between_attempts,
					fail_window_minutes: firstQuiz.fail_window_minutes,
					max_failed_in_window: firstQuiz.max_failed_in_window,
					short_answer_min_chars: firstQuiz.short_answer_min_chars,
					short_answer_max_chars: firstQuiz.short_answer_max_chars
				},
				{ onConflict: 'node_id' }
			);
			if (assessmentErr) return fail(400, { error: assessmentErr.message, section: 'blocks' });
		}

		return { ok: true, section: 'blocks' };
	},

	savePrereqs: async ({ locals, params, request }) => {
		const { user, profile } = await locals.safeGetSession();
		const scope = await resolveCourseScope(locals.supabase, user, profile);
		if (!scope.canManage) return fail(403, { error: 'Forbidden', section: 'prereqs' });
		const form = await request.formData();
		const ids = form
			.getAll('prereq_ids')
			.map((v) => String(v))
			.filter(Boolean);

		const { data: nodeRow } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.slug)
			.single();
		if (!nodeRow) return fail(404, { error: 'Course not found', section: 'prereqs' });
		if (!(await leadCanEditNode(locals, scope, String(nodeRow.id))))
			return fail(403, { error: 'Forbidden', section: 'prereqs' });
		const db = scope.isFull ? locals.supabase : createSupabaseServiceClient();

		const { error: delErr } = await db
			.from('node_prerequisites')
			.delete()
			.eq('node_id', nodeRow.id);
		if (delErr) return fail(400, { error: delErr.message, section: 'prereqs' });

		if (ids.length) {
			const insertRows = ids
				.filter((id) => id !== nodeRow.id)
				.map((id) => ({ node_id: nodeRow.id, prerequisite_node_id: id }));
			if (insertRows.length) {
				const { error: insErr } = await db.from('node_prerequisites').insert(insertRows);
				if (insErr) return fail(400, { error: insErr.message, section: 'prereqs' });
			}
		}
		return { ok: true, section: 'prereqs' };
	},

	deleteNode: async ({ locals, params }) => {
		const { user, profile } = await locals.safeGetSession();
		// Deleting a course stays mentor/admin only.
		const scope = await resolveCourseScope(locals.supabase, user, profile);
		if (!scope.isFull) return fail(403, { error: 'Forbidden', section: 'delete' });
		const { error: err } = await locals.supabase.from('nodes').delete().eq('slug', params.slug);
		if (err) return fail(400, { error: err.message, section: 'delete' });
		throw redirect(303, '/courses');
	}
};
