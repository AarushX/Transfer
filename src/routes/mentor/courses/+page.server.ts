import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { isMentor } from '$lib/roles';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isMentor(profile)) throw redirect(303, '/dashboard');

	const teamFilter = url.searchParams.get('team') ?? '';
	const q = url.searchParams.get('q') ?? '';

	const { data: teams } = await locals.supabase
		.from('teams')
		.select('id,name,slug,team_group_id')
		.order('name');

	let query = locals.supabase
		.from('nodes')
		.select('id,title,slug')
		.order('title', { ascending: true });

	if (q) query = query.ilike('title', `%${q}%`);

	const [{ data: nodes }, { data: nodeTargets }, { data: nodeGroupTargets }, { data: teamGroups }, { data: templates }] = await Promise.all([
		query,
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('team_groups').select('id,name,slug'),
		locals.supabase
			.from('course_templates')
			.select('id,name,title,description,team_ids,category_ids,prereq_ids,blocks_json')
			.order('created_at', { ascending: false })
	]);

	const teamIdsByNode = new Map<string, Set<string>>();
	for (const row of nodeTargets ?? []) {
		const set = teamIdsByNode.get(String(row.node_id)) ?? new Set<string>();
		set.add(String(row.team_id));
		teamIdsByNode.set(String(row.node_id), set);
	}
	const filteredNodes =
		teamFilter && teamFilter.trim()
			? (nodes ?? []).filter((node: any) => teamIdsByNode.get(String(node.id))?.has(teamFilter))
			: nodes ?? [];

	return {
		teams: teams ?? [],
		teamGroups: teamGroups ?? [],
		nodes: filteredNodes,
		nodeTargets: nodeTargets ?? [],
		nodeGroupTargets: nodeGroupTargets ?? [],
		templates: templates ?? [],
		filter: { team: teamFilter, q }
	};
};

export const actions: Actions = {
	createFromTemplate: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const templateId = String(form.get('template_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const slugRaw = String(form.get('slug') ?? '').trim();
		if (!templateId) return fail(400, { error: 'Template is required.' });
		if (!title) return fail(400, { error: 'Course title is required.' });
		const slug = slugRaw ? slugify(slugRaw) : slugify(title);
		if (!slug) return fail(400, { error: 'Valid slug required.' });

		const { data: template } = await locals.supabase
			.from('course_templates')
			.select('id,description,team_ids,category_ids,prereq_ids,blocks_json')
			.eq('id', templateId)
			.maybeSingle();
		if (!template) return fail(404, { error: 'Template not found.' });

		const { data: node, error: createErr } = await locals.supabase
			.from('nodes')
			.insert({
				title,
				slug,
				video_url: '',
				description: String(template.description ?? ''),
				subteam_id: null
			})
			.select('id,slug')
			.single();
		if (createErr || !node) return fail(400, { error: createErr?.message ?? 'Could not create course from template.' });

		const teamIds: string[] = Array.isArray((template as any).team_ids)
			? (template as any).team_ids.map((v: any) => String(v))
			: [];
		const categoryIds: string[] = Array.isArray((template as any).category_ids)
			? (template as any).category_ids.map((v: any) => String(v))
			: [];
		const prereqIds: string[] = Array.isArray((template as any).prereq_ids)
			? (template as any).prereq_ids.map((v: any) => String(v))
			: [];
		const blocks = Array.isArray((template as any).blocks_json) ? (template as any).blocks_json : [];

		if (teamIds.length) {
			const { error: teamErr } = await locals.supabase
				.from('node_team_targets')
				.insert(teamIds.map((teamId: string) => ({ node_id: node.id, team_id: teamId })));
			if (teamErr) return fail(400, { error: teamErr.message });
		}
		if (categoryIds.length) {
			const { error: categoryErr } = await locals.supabase
				.from('node_categories')
				.insert(
					categoryIds.map((categoryId: string) => ({
						node_id: node.id,
						category_id: categoryId
					}))
				);
			if (categoryErr) return fail(400, { error: categoryErr.message });
		}
		if (prereqIds.length) {
			const insertRows = prereqIds
				.filter((id: string) => id !== node.id)
				.map((id: string) => ({ node_id: node.id, prerequisite_node_id: id }));
			if (insertRows.length) {
				const { error: prereqErr } = await locals.supabase.from('node_prerequisites').insert(insertRows);
				if (prereqErr) return fail(400, { error: prereqErr.message });
			}
		}
		if (blocks.length) {
			const { error: blockErr } = await locals.supabase.from('node_blocks').insert(
				blocks.map((block: any, idx: number) => ({
					node_id: node.id,
					position: idx + 1,
					type: String(block.type ?? 'reading'),
					config: block.config ?? {}
				}))
			);
			if (blockErr) return fail(400, { error: blockErr.message });
		}

		const checkoffBlock = blocks.find((b: any) => String(b?.type) === 'checkoff');
		if (checkoffBlock?.config) {
			const cfg = checkoffBlock.config;
			const { error: checkoffErr } = await locals.supabase.from('node_checkoff_requirements').upsert(
				{
					node_id: node.id,
					title: String(cfg.title ?? 'Skills Check'),
					directions: String(cfg.directions ?? ''),
					mentor_checklist: Array.isArray(cfg.mentor_checklist) ? cfg.mentor_checklist : [],
					resource_links: Array.isArray(cfg.resource_links) ? cfg.resource_links : [],
					evidence_mode: String(cfg.evidence_mode ?? 'none')
				},
				{ onConflict: 'node_id' }
			);
			if (checkoffErr) return fail(400, { error: checkoffErr.message });
		}
		const quizBlock = blocks.find((b: any) => String(b?.type) === 'quiz');
		if (quizBlock?.config) {
			const cfg = quizBlock.config;
			const { error: assessmentErr } = await locals.supabase.from('assessments').upsert(
				{
					node_id: node.id,
					passing_score: Number(cfg.passing_score ?? 80),
					questions: Array.isArray(cfg.questions) ? cfg.questions : [],
					min_seconds_between_attempts: Number(cfg.min_seconds_between_attempts ?? 15),
					fail_window_minutes: Number(cfg.fail_window_minutes ?? 10),
					max_failed_in_window: Number(cfg.max_failed_in_window ?? 5),
					short_answer_min_chars: Number(cfg.short_answer_min_chars ?? 3),
					short_answer_max_chars: Number(cfg.short_answer_max_chars ?? 300)
				},
				{ onConflict: 'node_id' }
			);
			if (assessmentErr) return fail(400, { error: assessmentErr.message });
		}

		throw redirect(303, `/mentor/courses/${node.slug}`);
	}
};
