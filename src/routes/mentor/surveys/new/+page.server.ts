import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { applyWorkflowPrefixToSlug } from '$lib/surveys/workflows';
import { isMentor } from '$lib/roles';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const normalizeQuestions = (input: unknown) => {
	const rawList = Array.isArray(input) ? input : [];
	const normalized: any[] = [];
	for (let i = 0; i < rawList.length; i += 1) {
		const q = (rawList[i] ?? {}) as Record<string, unknown>;
		const type = String(q.type ?? 'short');
		const id = String(q.id ?? `q${i + 1}`).trim() || `q${i + 1}`;
		const prompt = String(q.prompt ?? '').trim();
		if (!prompt) return { error: `Question ${i + 1} prompt is required.` };
		if (type === 'mc' || type === 'ms') {
			const options = Array.from(
				new Set(
					(Array.isArray(q.options) ? q.options : [])
						.map((v) => String(v ?? '').trim())
						.filter(Boolean)
				)
			);
			if (options.length < 2) return { error: `Question ${i + 1} needs at least 2 options.` };
			if (type === 'mc') {
				const correct = String(q.correct ?? '').trim();
				if (!correct || !options.includes(correct))
					return { error: `Question ${i + 1} must select one correct option.` };
				normalized.push({ id, prompt, type, options, correct, randomize_options: Boolean(q.randomize_options) });
			} else {
				const correct = Array.isArray(q.correct)
					? q.correct.map((v) => String(v ?? '').trim()).filter((v) => options.includes(v))
					: [];
				if (correct.length === 0)
					return { error: `Question ${i + 1} must select at least one correct option.` };
				const maxSelectRaw = Number(q.max_select);
				const maxSelect =
					Number.isFinite(maxSelectRaw) && maxSelectRaw > 0
						? Math.min(Math.trunc(maxSelectRaw), options.length)
						: null;
				if (maxSelect != null && correct.length > maxSelect) {
					return { error: `Question ${i + 1} has more correct answers than max selections.` };
				}
				normalized.push({
					id,
					prompt,
					type,
					options,
					correct: Array.from(new Set(correct)),
					max_select: maxSelect ?? undefined,
					randomize_options: Boolean(q.randomize_options)
				});
			}
			continue;
		}
		if (type === 'tf') {
			normalized.push({ id, prompt, type, correct: String(q.correct ?? '').toLowerCase() === 'false' ? 'false' : 'true' });
			continue;
		}
		normalized.push({
			id,
			prompt,
			type: 'short',
			correct: String(q.correct ?? '').trim(),
			short_ignore_case: q.short_ignore_case == null ? true : Boolean(q.short_ignore_case),
			short_ignore_punctuation: Boolean(q.short_ignore_punctuation)
		});
	}
	return { questions: normalized };
};

const toIsoOrNull = (value: string) => {
	if (!value.trim()) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString();
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isMentor(profile)) throw redirect(303, '/dashboard');

	const [{ data: nodes }, { data: templates }] = await Promise.all([
		locals.supabase.from('nodes').select('id,title').order('title'),
		locals.supabase
			.from('survey_templates')
			.select('id,name,title,workflow_kind,description,questions,is_active,show_when_inactive,visible_from,visible_until,prereq_node_ids')
			.order('created_at', { ascending: false })
	]);
	return { nodes: nodes ?? [], templates: templates ?? [] };
};

export const actions: Actions = {
	createSurvey: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slugRaw = String(form.get('slug') ?? '').trim();
		const workflowKindRaw = String(form.get('workflow_kind') ?? 'custom').trim();
		const workflowKind =
			workflowKindRaw === 'leadership' ||
			workflowKindRaw === 'school' ||
			workflowKindRaw === 'carpool'
				? workflowKindRaw
				: 'custom';
		const baseSlug = slugify(slugRaw || title);
		const slug = applyWorkflowPrefixToSlug(workflowKind, baseSlug);
		const description = String(form.get('description') ?? '').trim();
		const questionsRaw = String(form.get('questions_json') ?? '[]').trim();
		const isActive = String(form.get('is_active') ?? '') === 'on';
		const showWhenInactive = String(form.get('show_when_inactive') ?? '') === 'on';
		const visibleFromRaw = String(form.get('visible_from') ?? '').trim();
		const visibleUntilRaw = String(form.get('visible_until') ?? '').trim();
		const maxSubmissionsRaw = Number(form.get('max_submissions') ?? '1');
		const maxSubmissions =
			Number.isFinite(maxSubmissionsRaw) && maxSubmissionsRaw >= 1 ? Math.trunc(maxSubmissionsRaw) : 1;
		const allowStudentViewSubmissions = String(form.get('allow_student_view_submissions') ?? '') === 'on';
		const allowStudentEdits = String(form.get('allow_student_edits') ?? '') === 'on';
		const studentEditDeadlineRaw = String(form.get('student_edit_deadline') ?? '').trim();
		const prereqIds = form
			.getAll('prereq_node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const saveAsTemplate = String(form.get('save_as_template') ?? '') === 'on';
		const templateName = String(form.get('template_name') ?? '').trim();

		if (!title || !slug) return fail(400, { error: 'Title and slug are required.' });

		let questions: unknown;
		try {
			questions = JSON.parse(questionsRaw || '[]');
		} catch {
			return fail(400, { error: 'Questions JSON must be valid JSON.' });
		}
		if (!Array.isArray(questions)) return fail(400, { error: 'Questions JSON must be an array.' });
		const normalized = normalizeQuestions(questions);
		if ('error' in normalized) return fail(400, { error: normalized.error });
		const visibleFrom = toIsoOrNull(visibleFromRaw);
		const visibleUntil = toIsoOrNull(visibleUntilRaw);
		const studentEditDeadline = toIsoOrNull(studentEditDeadlineRaw);
		if (visibleFromRaw && !visibleFrom) return fail(400, { error: 'Invalid visible-from date.' });
		if (visibleUntilRaw && !visibleUntil) return fail(400, { error: 'Invalid visible-until date.' });
		if (studentEditDeadlineRaw && !studentEditDeadline)
			return fail(400, { error: 'Invalid student edit deadline.' });
		if (visibleFrom && visibleUntil && visibleFrom > visibleUntil) {
			return fail(400, { error: 'Visible-from date must be before visible-until date.' });
		}
		if (studentEditDeadline && visibleUntil && studentEditDeadline > visibleUntil) {
			return fail(400, { error: 'Student edit deadline must be before visible-until date.' });
		}

		const { data: created, error: createErr } = await locals.supabase
			.from('surveys')
			.insert({
				title,
				slug,
				description,
				questions: normalized.questions,
				is_active: isActive,
				show_when_inactive: showWhenInactive,
				visible_from: visibleFrom,
				visible_until: visibleUntil,
				allow_student_view_submissions: allowStudentViewSubmissions,
				allow_student_edits: allowStudentEdits,
				student_edit_deadline: studentEditDeadline,
				max_submissions: maxSubmissions
			})
			.select('id,slug')
			.single();
		if (createErr || !created) return fail(400, { error: createErr?.message ?? 'Could not create survey.' });

		if (prereqIds.length > 0) {
			const rows = prereqIds.map((nodeId) => ({ survey_id: created.id, node_id: nodeId }));
			const { error: prereqErr } = await locals.supabase.from('survey_prerequisites').insert(rows);
			if (prereqErr) return fail(400, { error: prereqErr.message });
		}

		if (saveAsTemplate) {
			if (!templateName) return fail(400, { error: 'Template name is required when saving a template.' });
			const { error: templateErr } = await locals.supabase.from('survey_templates').insert({
				name: templateName,
				title,
				workflow_kind: workflowKind,
				description,
				questions: normalized.questions,
				is_active: isActive,
				show_when_inactive: showWhenInactive,
				visible_from: visibleFrom,
				visible_until: visibleUntil,
				prereq_node_ids: prereqIds,
				created_by: user?.id ?? null
			});
			if (templateErr) return fail(400, { error: templateErr.message });
		}

		throw redirect(303, `/mentor/surveys/${created.slug}`);
	}
};
