import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';

const BASE_ALLOWED = new Set(['member', 'admin']);

const toLegacyRole = (baseRole: string, isMentor: boolean, isLead: boolean) => {
	if (baseRole === 'admin') return 'admin';
	if (isMentor) return 'mentor';
	if (isLead) return 'student_lead';
	return 'student';
};

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	const canManageUsers = isAdmin(profile);
	const [{ data: profiles }, { data: certs }, { data: attendanceSessions }] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('id,full_name,email,role,base_role,is_mentor,is_lead,subteam_id'),
		locals.supabase
			.from('certifications')
			.select('user_id,status,node_id,quiz_score,quiz_passed_at,approved_at,nodes!inner(title,slug)')
			.not('status', 'eq', 'locked'),
		locals.supabase
			.from('attendance_daily_sessions')
			.select('attendee_user_id,attendance_day,check_in_at,check_out_at')
			.order('attendance_day', { ascending: false })
	]);

	const byUser = new Map<string, { completed: number; pending: number }>();
	const bottlenecks = new Map<string, number>();
	for (const cert of certs ?? []) {
		const agg = byUser.get(cert.user_id) ?? { completed: 0, pending: 0 };
		if (cert.status === 'completed') agg.completed += 1;
		if (cert.status === 'mentor_checkoff_pending') {
			agg.pending += 1;
			const title = (cert as any).nodes?.title ?? 'Unknown module';
			bottlenecks.set(title, (bottlenecks.get(title) ?? 0) + 1);
		}
		byUser.set(cert.user_id, agg);
	}

	const rows = (profiles ?? []).map((profile) => {
		const agg = byUser.get(profile.id) ?? { completed: 0, pending: 0 };
		const total = Math.max(agg.completed + agg.pending, 1);
		const userCourses = (certs ?? [])
			.filter((c: any) => c.user_id === profile.id)
			.map((c: any) => ({
				node_id: c.node_id,
				title: c.nodes?.title,
				slug: c.nodes?.slug,
				status: c.status,
				quiz_score: c.quiz_score,
				quiz_passed_at: c.quiz_passed_at,
				approved_at: c.approved_at
			}))
			.sort((a: any, b: any) => {
				const aTs = a.approved_at || a.quiz_passed_at || '';
				const bTs = b.approved_at || b.quiz_passed_at || '';
				return String(bTs).localeCompare(String(aTs));
			});
		return {
			...profile,
			progressPercent: Math.round((agg.completed / total) * 100),
			pendingCheckoffs: agg.pending,
			courses: userCourses
		};
	});

	return {
		rows,
		bottlenecks: Array.from(bottlenecks.entries()).map(([node, count]) => ({ node, count })),
		canManageUsers,
		attendanceSessions: attendanceSessions ?? []
	};
};

export const actions: Actions = {
	setRole: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '');
		const baseRole = String(form.get('base_role') ?? '');
		const isMentor = String(form.get('is_mentor') ?? '') === 'on';
		const isLead = String(form.get('is_lead') ?? '') === 'on';
		if (!userId || !BASE_ALLOWED.has(baseRole)) return fail(400, { error: 'Invalid role update.' });
		const role = toLegacyRole(baseRole, isMentor, isLead);
		const { error } = await locals.supabase
			.from('profiles')
			.update({
				base_role: baseRole,
				is_mentor: isMentor,
				is_lead: isLead,
				role
			})
			.eq('id', userId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'roles' };
	}
};
