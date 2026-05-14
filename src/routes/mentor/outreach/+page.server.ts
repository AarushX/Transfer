import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { isMentor } from '$lib/roles';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isMentor(profile)) throw redirect(303, '/dashboard');

	const { data: season } = await locals.supabase
		.from('lettering_seasons')
		.select('id,label,start_date,end_date')
		.eq('is_active', true)
		.maybeSingle();

	if (!season) {
		return { season: null, outreachHours: [], outreachEvents: [], parentVolunteerHours: [] };
	}

	const [
		{ data: outreachHours },
		{ data: outreachEvents },
		{ data: parentVolunteerHours }
	] = await Promise.all([
		locals.supabase
			.from('outreach_hours')
			.select('id,user_id,event_id,season_id,hours,description,verification_status,verified_by,verified_at,rejection_reason,created_at,profiles!outreach_hours_user_id_fkey(full_name,email)')
			.eq('season_id', season.id)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('outreach_events')
			.select('id,season_id,title')
			.eq('season_id', season.id)
			.order('title'),
		locals.supabase
			.from('parent_volunteer_hours')
			.select('id,parent_user_id,student_user_id,season_id,hours,activity_date,description,verification_status,verified_by,verified_at,rejection_reason,created_at,parent:profiles!parent_volunteer_hours_parent_user_id_fkey(full_name,email),student:profiles!parent_volunteer_hours_student_user_id_fkey(full_name,email)')
			.eq('season_id', season.id)
			.order('created_at', { ascending: false })
	]);

	return {
		season,
		outreachHours: (outreachHours ?? []).map((row: any) => ({
			...row,
			studentName: row.profiles?.full_name ?? row.profiles?.email ?? 'Unknown'
		})),
		outreachEvents: outreachEvents ?? [],
		parentVolunteerHours: (parentVolunteerHours ?? []).map((row: any) => ({
			...row,
			parentName: row.parent?.full_name ?? row.parent?.email ?? 'Unknown',
			studentName: row.student?.full_name ?? row.student?.email ?? 'Unknown'
		}))
	};
};

export const actions: Actions = {
	verifyOutreachHours: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const hoursId = String(form.get('hours_id') ?? '').trim();
		if (!hoursId) return fail(400, { error: 'Missing hours_id.' });

		const { error: updateErr } = await locals.supabase
			.from('outreach_hours')
			.update({
				verification_status: 'verified',
				verified_by: user.id,
				verified_at: new Date().toISOString()
			})
			.eq('id', hoursId);

		if (updateErr) return fail(400, { error: updateErr.message });
		return { ok: true };
	},

	rejectOutreachHours: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const hoursId = String(form.get('hours_id') ?? '').trim();
		const rejectionReason = String(form.get('rejection_reason') ?? '').trim();
		if (!hoursId) return fail(400, { error: 'Missing hours_id.' });

		const { error: updateErr } = await locals.supabase
			.from('outreach_hours')
			.update({
				verification_status: 'rejected',
				rejection_reason: rejectionReason || null,
				verified_by: user.id,
				verified_at: new Date().toISOString()
			})
			.eq('id', hoursId);

		if (updateErr) return fail(400, { error: updateErr.message });
		return { ok: true };
	},

	verifyParentHours: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const hoursId = String(form.get('hours_id') ?? '').trim();
		if (!hoursId) return fail(400, { error: 'Missing hours_id.' });

		const { error: updateErr } = await locals.supabase
			.from('parent_volunteer_hours')
			.update({
				verification_status: 'verified',
				verified_by: user.id,
				verified_at: new Date().toISOString()
			})
			.eq('id', hoursId);

		if (updateErr) return fail(400, { error: updateErr.message });
		return { ok: true };
	},

	rejectParentHours: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const hoursId = String(form.get('hours_id') ?? '').trim();
		const rejectionReason = String(form.get('rejection_reason') ?? '').trim();
		if (!hoursId) return fail(400, { error: 'Missing hours_id.' });

		const { error: updateErr } = await locals.supabase
			.from('parent_volunteer_hours')
			.update({
				verification_status: 'rejected',
				rejection_reason: rejectionReason || null,
				verified_by: user.id,
				verified_at: new Date().toISOString()
			})
			.eq('id', hoursId);

		if (updateErr) return fail(400, { error: updateErr.message });
		return { ok: true };
	}
};
