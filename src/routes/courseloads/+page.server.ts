import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const dashboard = await loadStudentCoursesDashboard(locals.supabase, user.id);

	return {
		courseloads: dashboard.courseloads,
		teams: dashboard.teams
	};
};
