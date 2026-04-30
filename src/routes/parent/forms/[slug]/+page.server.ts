import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toDriveDownloadUrl } from '$lib/utils/drive-links';
import { requireApprovedParentPortal, resolveParentStudentContext } from '$lib/server/parent-access';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user } = await requireApprovedParentPortal(locals);
	const { students, selectedStudent } = await resolveParentStudentContext(
		locals.supabase,
		user.id,
		String(url.searchParams.get('student') ?? '')
	);
	if (!selectedStudent) throw error(400, 'No linked student selected.');

	const { data: formRecord } = await locals.supabase
		.from('form_types')
		.select('id,name,slug,description,template_drive_link,is_active,allow_student_view_submissions')
		.eq('slug', params.slug)
		.eq('is_active', true)
		.maybeSingle();
	if (!formRecord) throw error(404, 'Form not found');

	const { data: submissions } = await locals.supabase
		.from('form_submissions')
		.select('id,notes,status,review_notes,reviewed_at,created_at,attested,external_doc_links_json,cloud_link')
		.eq('form_type_id', formRecord.id)
		.eq('user_id', selectedStudent.id)
		.order('created_at', { ascending: false });

	return {
		students,
		selectedStudent,
		form: formRecord,
		submissions: submissions ?? [],
		showSubmissions: Boolean(formRecord.allow_student_view_submissions)
	};
};

export const actions: Actions = {
	submitForm: async ({ locals, params, request }) => {
		const { user } = await requireApprovedParentPortal(locals);
		const form = await request.formData();
		const studentUserId = String(form.get('student_user_id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const externalLinksRaw = String(form.get('external_doc_links') ?? '').trim();
		const externalDocLinks = externalLinksRaw
			.split('\n')
			.map((v) => v.trim())
			.filter(Boolean);
		const cloudLinkRaw = String(form.get('cloud_link') ?? '').trim();
		const cloudLink = toDriveDownloadUrl(cloudLinkRaw);
		if (!studentUserId) return fail(400, { error: 'Student is required.' });
		if (!cloudLink) return fail(400, { error: 'Cloud link is required.' });
		const { selectedStudent } = await resolveParentStudentContext(locals.supabase, user.id, studentUserId);
		if (!selectedStudent) return fail(403, { error: 'Student is not linked to your parent account.' });

		const { data: formRecord } = await locals.supabase
			.from('form_types')
			.select('id,is_active')
			.eq('slug', params.slug)
			.eq('is_active', true)
			.maybeSingle();
		if (!formRecord || !formRecord.is_active) return fail(400, { error: 'Invalid form.' });

		const { error: submitErr } = await locals.supabase.from('form_submissions').insert({
			form_type_id: formRecord.id,
			user_id: studentUserId,
			notes,
			external_doc_links_json: externalDocLinks,
			cloud_link: cloudLink,
			file_name: 'cloud-link',
			file_mime: 'text/uri-list',
			file_data_url: cloudLink
		});
		if (submitErr) return fail(400, { error: submitErr.message });
		return { ok: true };
	}
};
