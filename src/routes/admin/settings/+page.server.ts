import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');
	const { data: org } = await locals.supabase.from('org_settings').select('name').eq('id', 1).maybeSingle();
	return { orgName: org?.name ?? 'Workspace' };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });
		const { error } = await locals.supabase
			.from('org_settings')
			.upsert({ id: 1, name }, { onConflict: 'id' });
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
