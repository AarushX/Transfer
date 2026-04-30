import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireApprovedParentPortal, resolveParentStudentContext } from '$lib/server/parent-access';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await requireApprovedParentPortal(locals);
	const { students, selectedStudent } = await resolveParentStudentContext(
		locals.supabase,
		user.id,
		String(url.searchParams.get('student') ?? '')
	);
	if (!selectedStudent) {
		return { students: [], selectedStudent: null, events: [], days: [], roles: [], signups: [] };
	}
	const { data: events } = await locals.supabase
		.from('carpool_events')
		.select('*')
		.eq('is_active', true)
		.order('created_at', { ascending: false });
	const eventIds = (events ?? []).map((row: any) => String(row.id));
	if (eventIds.length === 0) {
		return { students, selectedStudent, events: [], days: [], roles: [], signups: [] };
	}
	const { data: days } = await locals.supabase
		.from('carpool_event_days')
		.select('*')
		.in('event_id', eventIds)
		.order('day_date')
		.order('sort_order');
	const dayIds = (days ?? []).map((row: any) => String(row.id));
	const { data: roles } = dayIds.length
		? await locals.supabase.from('carpool_day_roles').select('*').in('day_id', dayIds).order('sort_order')
		: { data: [] as any[] };
	const roleIds = (roles ?? []).map((row: any) => String(row.id));
	const { data: signups } = roleIds.length
		? await locals.supabase
				.from('carpool_signups')
				.select('id,role_id,user_id,notes,capacity_count,created_at')
				.in('role_id', roleIds)
		: { data: [] as any[] };
	return {
		students,
		selectedStudent,
		events: events ?? [],
		days: days ?? [],
		roles: roles ?? [],
		signups: signups ?? []
	};
};

export const actions: Actions = {
	signUp: async ({ locals, request }) => {
		const { user } = await requireApprovedParentPortal(locals);
		const form = await request.formData();
		const roleId = String(form.get('role_id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const studentUserId = String(form.get('student_user_id') ?? '').trim();
		const capacityInput = Math.max(1, Number(form.get('capacity_count') ?? '1') || 1);
		if (!roleId || !studentUserId) return fail(400, { error: 'Role and student are required.' });
		const { selectedStudent } = await resolveParentStudentContext(locals.supabase, user.id, studentUserId);
		if (!selectedStudent) return fail(403, { error: 'Student is not linked to your parent account.' });
		const { error } = await locals.supabase.from('carpool_signups').insert({
			role_id: roleId,
			user_id: studentUserId,
			notes,
			capacity_count: capacityInput
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	cancelSignup: async ({ locals, request }) => {
		const { user } = await requireApprovedParentPortal(locals);
		const form = await request.formData();
		const signupId = String(form.get('signup_id') ?? '').trim();
		const studentUserId = String(form.get('student_user_id') ?? '').trim();
		if (!signupId || !studentUserId) return fail(400, { error: 'Signup and student are required.' });
		const { selectedStudent } = await resolveParentStudentContext(locals.supabase, user.id, studentUserId);
		if (!selectedStudent) return fail(403, { error: 'Student is not linked to your parent account.' });
		const { error } = await locals.supabase
			.from('carpool_signups')
			.delete()
			.eq('id', signupId)
			.eq('user_id', studentUserId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
