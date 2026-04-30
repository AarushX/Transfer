import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !isAdmin(profile)) throw redirect(303, '/dashboard');
	throw redirect(303, '/roster');
};
