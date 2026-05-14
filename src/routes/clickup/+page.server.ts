import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');
	return {
		clickupSignedUp: profile.clickup_signed_up ?? false
	};
};

export const actions: Actions = {
	setSignedUp: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const value = form.get('signed_up') === 'true';
		const service = createSupabaseServiceClient();
		const { error } = await service.from('profiles').update({ clickup_signed_up: value }).eq('id', user.id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, signed_up: value };
	}
};
