import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toDriveDownloadUrl } from '$lib/utils/drive-links';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: formRecord } = await locals.supabase
		.from('form_types')
		.select(
			'id,name,slug,description,template_drive_link,is_active,allow_student_view_submissions'
		)
		.eq('slug', params.slug)
		.eq('is_active', true)
		.maybeSingle();
	if (!formRecord) throw error(404, 'Form not found');

	const { data: submissions } = await locals.supabase
		.from('form_submissions')
		.select(
			'id,notes,status,review_notes,reviewed_at,created_at,attested,external_doc_links_json,cloud_link'
		)
		.eq('form_type_id', formRecord.id)
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	return {
		form: formRecord,
		submissions: submissions ?? [],
		showSubmissions: Boolean(formRecord.allow_student_view_submissions)
	};
};

export const actions: Actions = {
	submitForm: async ({ locals, params, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const notes = String(form.get('notes') ?? '').trim();
		const externalLinksRaw = String(form.get('external_doc_links') ?? '').trim();
		const externalDocLinks = externalLinksRaw
			.split('\n')
			.map((v) => v.trim())
			.filter(Boolean);
		const cloudLinkRaw = String(form.get('cloud_link') ?? '').trim();
		const cloudLink = toDriveDownloadUrl(cloudLinkRaw);
		if (!cloudLink) return fail(400, { error: 'Cloud link is required.' });

		const { data: formRecord } = await locals.supabase
			.from('form_types')
			.select('id,is_active')
			.eq('slug', params.slug)
			.eq('is_active', true)
			.maybeSingle();
		if (!formRecord || !formRecord.is_active) return fail(400, { error: 'Invalid form.' });
		const { error: submitErr } = await locals.supabase.rpc('submit_form_submission_once', {
			p_form_type_id: formRecord.id,
			p_notes: notes,
			p_external_doc_links_json: externalDocLinks,
			p_cloud_link: cloudLink,
			p_file_name: 'cloud-link',
			p_file_mime: 'text/uri-list',
			p_file_data_url: cloudLink
		});
		if (submitErr) return fail(400, { error: submitErr.message });
		return { ok: true };
	}
};
