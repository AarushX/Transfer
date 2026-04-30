import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	const [{ data: formTypes }, { data: submissions }] = await Promise.all([
		locals.supabase.from('form_types').select('*').eq('is_active', true).order('name'),
		locals.supabase
			.from('form_submissions')
			.select('id,form_type_id,notes,file_name,file_mime,status,review_notes,reviewed_at,created_at')
			.eq('user_id', user!.id)
			.order('created_at', { ascending: false })
	]);

	return {
		formTypes: formTypes ?? [],
		submissions: submissions ?? []
	};
};

export const actions: Actions = {
	submitForm: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const formTypeId = String(form.get('form_type_id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const upload = form.get('file');
		if (!formTypeId) return fail(400, { error: 'Form type is required.' });
		if (!(upload instanceof File)) return fail(400, { error: 'Please upload a file.' });
		if (upload.size <= 0) return fail(400, { error: 'Please upload a non-empty file.' });
		if (upload.size > MAX_FILE_BYTES) return fail(400, { error: 'File too large (max 10MB).' });

		const { data: formType } = await locals.supabase
			.from('form_types')
			.select('id,allow_multiple,is_active')
			.eq('id', formTypeId)
			.maybeSingle();
		if (!formType || !formType.is_active) return fail(400, { error: 'Invalid form type.' });
		if (!formType.allow_multiple) {
			const { count } = await locals.supabase
				.from('form_submissions')
				.select('id', { count: 'exact', head: true })
				.eq('form_type_id', formTypeId)
				.eq('user_id', user.id);
			if ((count ?? 0) > 0) return fail(400, { error: 'This form only allows one submission.' });
		}

		const arrayBuffer = await upload.arrayBuffer();
		const dataUrl = `data:${upload.type || 'application/octet-stream'};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
		const { error } = await locals.supabase.from('form_submissions').insert({
			form_type_id: formTypeId,
			user_id: user.id,
			notes,
			file_name: upload.name || 'submission',
			file_mime: upload.type || 'application/octet-stream',
			file_data_url: dataUrl
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
