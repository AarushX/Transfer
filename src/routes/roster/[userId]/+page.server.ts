import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isMentor } from '$lib/roles';
import { computeUserRanks } from '$lib/server/ranks';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || (!isMentor(profile) && profile.role !== 'admin')) {
		throw redirect(303, '/dashboard');
	}

	const userId = params.userId;
	const [profileResp, coursesResp, attendanceResp, categoriesResp, nodeCategoriesResp, rankMap] =
		await Promise.all([
			locals.supabase
				.from('profiles')
				.select('id,full_name,email,role,subteam_id,avatar_url,bio')
				.eq('id', userId)
				.single(),
			locals.supabase
				.from('certifications')
				.select('node_id,status,approved_at,nodes!inner(title,slug)')
				.eq('user_id', userId)
				.eq('status', 'completed')
				.order('approved_at', { ascending: false }),
			locals.supabase
				.from('attendance_daily_sessions')
				.select('attendance_day,check_in_at,check_out_at,last_scanned_by')
				.eq('attendee_user_id', userId)
				.order('attendance_day', { ascending: false }),
			locals.supabase
				.from('training_categories')
				.select('id,name,slug,parent_id,color_token')
				.eq('is_active', true),
			locals.supabase.from('node_categories').select('node_id,category_id'),
			computeUserRanks(locals.supabase, [userId])
		]);

	const member = profileResp.data;
	if (!member) throw redirect(303, '/roster');

	const rankSummary = rankMap.get(userId) ?? null;
	const categoryById = new Map((categoriesResp.data ?? []).map((c: any) => [String(c.id), c]));
	const categoryIdsByNode = new Map<string, string[]>();
	for (const row of nodeCategoriesResp.data ?? []) {
		const key = String((row as any).node_id);
		const list = categoryIdsByNode.get(key) ?? [];
		list.push(String((row as any).category_id));
		categoryIdsByNode.set(key, list);
	}

	const completedCourses = (coursesResp.data ?? []).map((row: any) => {
		const ids = categoryIdsByNode.get(String(row.node_id)) ?? [];
		return {
			...row,
			categories: ids.map((id) => categoryById.get(id)).filter(Boolean)
		};
	});

	return {
		member,
		rankSummary,
		completedCourses,
		attendanceSessions: attendanceResp.data ?? []
	};
};
