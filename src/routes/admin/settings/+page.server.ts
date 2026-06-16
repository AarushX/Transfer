import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/roles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !isAdmin(profile)) throw redirect(303, '/dashboard');
	const { data: org } = await locals.supabase
		.from('org_settings')
		.select('name,icon_data_url')
		.eq('id', 1)
		.maybeSingle();
	return {
		orgName: org?.name ?? 'Workspace',
		iconDataUrl: org?.icon_data_url ?? ''
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });
		const iconDataUrl = String(form.get('icon_data_url') ?? '').trim();
		const clearIcon = String(form.get('clear_icon') ?? '') === 'on';
		const { error } = await locals.supabase.from('org_settings').upsert(
			{
				id: 1,
				name,
				icon_data_url: clearIcon ? '' : iconDataUrl
			},
			{ onConflict: 'id' }
		);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
