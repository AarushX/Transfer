import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { inferWorkflowKindFromSlug } from '$lib/surveys/workflows';
import { applyWorkflowPrefixToSlug } from '$lib/surveys/workflows';
import { isMentor } from '$lib/roles';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isMentor(profile)) throw redirect(303, '/dashboard');

	const [{ data: surveys }, { data: nodes }, { data: templates }] = await Promise.all([
		locals.supabase
			.from('surveys')
			.select('id,title,slug,is_active,show_when_inactive,visible_from,visible_until,updated_at')
			.order('updated_at', { ascending: false }),
		locals.supabase.from('nodes').select('id,title').order('title'),
		locals.supabase
			.from('survey_templates')
			.select('id,name,title,workflow_kind,description,questions,is_active,show_when_inactive,visible_from,visible_until,prereq_node_ids')
			.order('created_at', { ascending: false })
	]);

	return {
		surveys: (surveys ?? []).map((survey: any) => ({
			...survey,
			workflowKind: inferWorkflowKindFromSlug(String(survey.slug ?? ''))
		})),
		nodes: nodes ?? [],
		templates: templates ?? []
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
		if (!title) return fail(400, { error: 'Title is required.' });

		const { data: template } = await locals.supabase
			.from('survey_templates')
			.select('workflow_kind,description,questions,is_active,show_when_inactive,visible_from,visible_until,prereq_node_ids')
			.eq('id', templateId)
			.maybeSingle();
		if (!template) return fail(404, { error: 'Template not found.' });
		const workflowKind = String((template as any).workflow_kind ?? 'custom');
		const baseSlug = slugify(slugRaw || title);
		const slug = applyWorkflowPrefixToSlug(
			workflowKind === 'leadership' || workflowKind === 'school' || workflowKind === 'carpool'
				? (workflowKind as any)
				: 'custom',
			baseSlug
		);

		const { data: created, error: createErr } = await locals.supabase
			.from('surveys')
			.insert({
				title,
				slug,
				description: String((template as any).description ?? ''),
				questions: Array.isArray((template as any).questions) ? (template as any).questions : [],
				is_active: Boolean((template as any).is_active),
				show_when_inactive: Boolean((template as any).show_when_inactive),
				visible_from: (template as any).visible_from ?? null,
				visible_until: (template as any).visible_until ?? null,
				max_submissions: 1
			})
			.select('id,slug')
			.single();
		if (createErr || !created) return fail(400, { error: createErr?.message ?? 'Could not create survey from template.' });

		const prereqIds = Array.isArray((template as any).prereq_node_ids)
			? (template as any).prereq_node_ids.map((v: any) => String(v)).filter(Boolean)
			: [];
		if (prereqIds.length > 0) {
			const rows = prereqIds.map((nodeId: string) => ({ survey_id: created.id, node_id: nodeId }));
			const { error: prereqErr } = await locals.supabase.from('survey_prerequisites').insert(rows);
			if (prereqErr) return fail(400, { error: prereqErr.message });
		}

		throw redirect(303, `/mentor/surveys/${created.slug}`);
	}
};
