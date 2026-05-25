import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';
import { isParentGuardian } from '$lib/roles';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	if (isParentGuardian(profile)) throw redirect(303, '/dashboard');

	const coursesDashboard = await loadStudentCoursesDashboard(locals.supabase, user.id);
	return { coursesDashboard };
};
