import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');
	return {};
};
