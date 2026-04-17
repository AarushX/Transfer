import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: node } = await locals.supabase
		.from('nodes')
		.select('id,title,description,video_url,subteam_id')
		.eq('slug', params.nodeSlug)
		.single();

	if (!node) throw error(404, 'Module not found');

	const [{ data: assessment }, { data: cert }, { data: statusRow }, { data: checkoff }, { data: submission }] =
		await Promise.all([
		locals.supabase
			.from('assessments')
			.select('questions,passing_score')
			.eq('node_id', node.id)
			.maybeSingle(),
		locals.supabase
			.from('certifications')
			.select('status,quiz_score,quiz_passed_at,approved_at')
			.eq('node_id', node.id)
			.eq('user_id', user.id)
			.maybeSingle(),
		locals.supabase
			.from('v_user_node_status')
			.select('computed_status')
			.eq('node_id', node.id)
			.eq('user_id', user.id)
			.maybeSingle(),
		locals.supabase
			.from('node_checkoff_requirements')
			.select('title,directions,mentor_checklist,resource_links,evidence_mode')
			.eq('node_id', node.id)
			.maybeSingle(),
		locals.supabase
			.from('checkoff_submissions')
			.select('notes,photo_data_url,updated_at')
			.eq('node_id', node.id)
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	return {
		node,
		questions: assessment?.questions ?? [],
		passingScore: assessment?.passing_score ?? 80,
		certStatus: statusRow?.computed_status ?? cert?.status ?? 'locked',
		cert: cert ?? null,
		checkoff: checkoff ?? {
			title: 'Physical checkoff',
			directions: '',
			mentor_checklist: [],
			resource_links: [],
			evidence_mode: 'none'
		},
		submission: submission ?? null
	};
};

export const actions: Actions = {
	saveSubmission: async ({ locals, request, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const { data: node } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.nodeSlug)
			.single();
		if (!node) return fail(404, { error: 'Module not found' });

		const form = await request.formData();
		const notes = String(form.get('notes') ?? '').trim();
		const photoDataUrl = String(form.get('photo_data_url') ?? '').trim();

		if (photoDataUrl && !photoDataUrl.startsWith('data:image/')) {
			return fail(400, { error: 'Photo upload data is invalid.', section: 'checkoff' });
		}
		if (photoDataUrl.length > 3_000_000) {
			return fail(400, { error: 'Uploaded image is too large. Please use a smaller photo.', section: 'checkoff' });
		}

		const { error: upsertError } = await locals.supabase.from('checkoff_submissions').upsert(
			{
				user_id: user.id,
				node_id: node.id,
				notes,
				photo_data_url: photoDataUrl || null
			},
			{ onConflict: 'user_id,node_id' }
		);
		if (upsertError) return fail(400, { error: upsertError.message, section: 'checkoff' });

		return { ok: true, section: 'checkoff' };
	}
};
