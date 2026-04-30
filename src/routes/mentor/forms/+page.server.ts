import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toDriveDownloadUrl } from '$lib/utils/drive-links';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: forms }, { data: submissions }] = await Promise.all([
		locals.supabase.from('form_types').select('*').order('created_at', { ascending: false }),
		locals.supabase
			.from('form_submissions')
			.select(
				'id,form_type_id,user_id,notes,file_name,file_mime,file_data_url,status,review_notes,reviewed_at,reviewed_by,created_at'
			)
			.order('created_at', { ascending: false })
			.limit(1000)
	]);
	const userIds = Array.from(new Set((submissions ?? []).map((row: any) => String(row.user_id))));
	const reviewerIds = Array.from(new Set((submissions ?? []).map((row: any) => String(row.reviewed_by ?? '')).filter(Boolean)));
	const profileIds = Array.from(new Set([...userIds, ...reviewerIds]));
	const { data: profiles } = profileIds.length
		? await locals.supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
		: { data: [] as any[] };
	const profileById = new Map((profiles ?? []).map((row: any) => [String(row.id), row]));
	return {
		forms: forms ?? [],
		submissions: (submissions ?? []).map((row: any) => ({
			...row,
			user: profileById.get(String(row.user_id)) ?? null,
			reviewer: profileById.get(String(row.reviewed_by ?? '')) ?? null
		}))
	};
};

export const actions: Actions = {
	createForm: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const slug = slugify(String(form.get('slug') ?? '').trim() || name);
		const description = String(form.get('description') ?? '').trim();
		const isActive = String(form.get('is_active') ?? '') === 'on';
		const templateDriveLinkRaw = String(form.get('template_drive_link') ?? '').trim();
		const templateDriveLink = toDriveDownloadUrl(templateDriveLinkRaw);
		const allowStudentViewSubmissions = String(form.get('allow_student_view_submissions') ?? '') === 'on';
		if (!name || !slug) return fail(400, { error: 'Name and slug are required.' });

		const { error } = await locals.supabase.from('form_types').insert({
			name,
			slug,
			description,
			is_active: isActive,
			allow_student_view_submissions: allowStudentViewSubmissions,
			school_doc_links_json: [],
			template_file_name: null,
			template_file_mime: null,
			template_file_data_url: null,
			template_drive_link: templateDriveLink,
			created_by: user?.id ?? null
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	updateSubmission: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		const form = await request.formData();
		const submissionId = String(form.get('submission_id') ?? '').trim();
		const status = String(form.get('status') ?? '').trim() || 'submitted';
		const reviewNotes = String(form.get('review_notes') ?? '').trim();
		if (!submissionId) return fail(400, { error: 'Submission is required.' });
		const { error } = await locals.supabase
			.from('form_submissions')
			.update({
				status,
				review_notes: reviewNotes,
				reviewed_at: new Date().toISOString(),
				reviewed_by: user?.id ?? null
			})
			.eq('id', submissionId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	updateForm: async ({ locals, request }) => {
		const form = await request.formData();
		const formId = String(form.get('form_id') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		const slug = slugify(String(form.get('slug') ?? '').trim() || name);
		const description = String(form.get('description') ?? '').trim();
		const isActive = String(form.get('is_active') ?? '') === 'on';
		const templateDriveLinkRaw = String(form.get('template_drive_link') ?? '').trim();
		const templateDriveLink = toDriveDownloadUrl(templateDriveLinkRaw);
		const allowStudentViewSubmissions = String(form.get('allow_student_view_submissions') ?? '') === 'on';
		if (!formId) return fail(400, { error: 'Form is required.' });
		if (!name || !slug) return fail(400, { error: 'Name and slug are required.' });

		const { error } = await locals.supabase
			.from('form_types')
			.update({
				name,
				slug,
				description,
				is_active: isActive,
				allow_student_view_submissions: allowStudentViewSubmissions,
				school_doc_links_json: [],
				template_drive_link: templateDriveLink
			})
			.eq('id', formId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	deleteForm: async ({ locals, request }) => {
		const form = await request.formData();
		const formId = String(form.get('form_id') ?? '').trim();
		if (!formId) return fail(400, { error: 'Form is required.' });
		const { error } = await locals.supabase.from('form_types').delete().eq('id', formId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
