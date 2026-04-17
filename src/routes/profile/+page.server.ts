import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');
	return { profile };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const fullName = String(form.get('full_name') ?? '').trim();
		const bio = String(form.get('bio') ?? '').trim().slice(0, 500);

		if (!fullName) {
			return fail(400, { error: 'Display name is required.' });
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ full_name: fullName, bio })
			.eq('id', user.id);
		if (error) return fail(400, { error: error.message });

		return { ok: true };
	}
};
