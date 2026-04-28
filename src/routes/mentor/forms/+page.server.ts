import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: formTypes }, { data: submissions }] = await Promise.all([
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
		formTypes: formTypes ?? [],
		submissions: (submissions ?? []).map((row: any) => ({
			...row,
			user: profileById.get(String(row.user_id)) ?? null,
			reviewer: profileById.get(String(row.reviewed_by ?? '')) ?? null
		}))
	};
};

export const actions: Actions = {
	createFormType: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const slug = slugify(String(form.get('slug') ?? '').trim() || name);
		const description = String(form.get('description') ?? '').trim();
		const allowMultiple = String(form.get('allow_multiple') ?? '') === 'on';
		const isActive = String(form.get('is_active') ?? '') === 'on';
		const template = form.get('template_file');
		if (!name || !slug) return fail(400, { error: 'Name and slug are required.' });
		let templateFileName: string | null = null;
		let templateFileMime: string | null = null;
		let templateFileDataUrl: string | null = null;
		if (template instanceof File && template.size > 0) {
			if (template.size > MAX_FILE_BYTES) return fail(400, { error: 'Template file too large (max 10MB).' });
			const buffer = await template.arrayBuffer();
			templateFileName = template.name || 'template';
			templateFileMime = template.type || 'application/octet-stream';
			templateFileDataUrl = `data:${templateFileMime};base64,${Buffer.from(buffer).toString('base64')}`;
		}

		const { error } = await locals.supabase.from('form_types').insert({
			name,
			slug,
			description,
			allow_multiple: allowMultiple,
			is_active: isActive,
			template_file_name: templateFileName,
			template_file_mime: templateFileMime,
			template_file_data_url: templateFileDataUrl,
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
	}
};
