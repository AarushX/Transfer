import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { requireParentPortal, listActiveLinkedStudents } from '$lib/server/parent-access';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireParentPortal(locals);

	const students = await listActiveLinkedStudents(locals.supabase, user.id);

	const { data: season } = await locals.supabase
		.from('lettering_seasons')
		.select('id,label,start_date,end_date')
		.eq('is_active', true)
		.maybeSingle();

	if (!season) {
		return { students, season: null, myHours: [] };
	}

	const { data: myHours } = await locals.supabase
		.from('parent_volunteer_hours')
		.select('id,parent_user_id,student_user_id,season_id,hours,activity_date,description,verification_status,rejection_reason,created_at,student:profiles!parent_volunteer_hours_student_user_id_fkey(full_name,email)')
		.eq('parent_user_id', user.id)
		.eq('season_id', season.id)
		.order('activity_date', { ascending: false });

	return {
		students,
		season,
		myHours: (myHours ?? []).map((row: any) => ({
			...row,
			studentName: row.student?.full_name ?? row.student?.email ?? 'Unknown'
		}))
	};
};

export const actions: Actions = {
	logHours: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);

		const form = await request.formData();
		const studentUserId = String(form.get('student_user_id') ?? '').trim();
		const hoursRaw = String(form.get('hours') ?? '').trim();
		const activityDate = String(form.get('activity_date') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();

		if (!studentUserId) return fail(400, { error: 'Please select a student.' });
		if (!hoursRaw || isNaN(Number(hoursRaw)) || Number(hoursRaw) <= 0) return fail(400, { error: 'Please enter valid hours.' });
		if (!activityDate) return fail(400, { error: 'Please select a date.' });
		if (!description) return fail(400, { error: 'Please enter a description.' });

		const students = await listActiveLinkedStudents(locals.supabase, user.id);
		const linked = students.find((s) => s.id === studentUserId);
		if (!linked) return fail(403, { error: 'Student is not linked to your account.' });

		const { data: season } = await locals.supabase
			.from('lettering_seasons')
			.select('id')
			.eq('is_active', true)
			.maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const { error: insertErr } = await locals.supabase
			.from('parent_volunteer_hours')
			.insert({
				parent_user_id: user.id,
				student_user_id: studentUserId,
				season_id: season.id,
				hours: Number(hoursRaw),
				activity_date: activityDate,
				description
			});

		if (insertErr) return fail(400, { error: insertErr.message });
		return { ok: true };
	}
};
