import { json, type RequestHandler } from '@sveltejs/kit';
import {
	attendanceDayKey,
	verifyAttendanceActivationToken,
	verifyAttendanceHourlyToken
} from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	const token = String(body?.token ?? '').trim();
	if (!token) return json({ error: 'Attendance QR token is required.' }, { status: 400 });

	try {
		const { accessToken } = await verifyAttendanceActivationToken(token);
		if (!profile || !['mentor', 'admin'].includes(profile.role)) {
			return json({ error: 'Only mentors can activate attendance displays.' }, { status: 403 });
		}
		const { data: session } = await locals.supabase
			.from('attendance_display_sessions')
			.select('id,activated_at')
			.eq('access_token', accessToken)
			.maybeSingle();
		if (!session) return json({ error: 'Attendance display session not found.' }, { status: 404 });
		if (!session.activated_at) {
			const { error: activateErr } = await locals.supabase
				.from('attendance_display_sessions')
				.update({
					activated_at: new Date().toISOString(),
					activated_by: user.id
				})
				.eq('id', session.id);
			if (activateErr) return json({ error: activateErr.message }, { status: 400 });
		}
		return json({ ok: true, action: 'activate' });
	} catch {
		// Not an activation QR; continue with hourly attendance token flow.
	}

	let attendeeUserId = '';
	try {
		const resolved = await verifyAttendanceHourlyToken(token);
		attendeeUserId = resolved.attendeeUserId;
	} catch {
		return json({ error: 'Invalid or expired attendance QR token.' }, { status: 400 });
	}

	const todayKey = attendanceDayKey();
	const nowIso = new Date().toISOString();

	const { data: existing } = await locals.supabase
		.from('attendance_daily_sessions')
		.select('id,check_in_at,check_out_at')
		.eq('attendee_user_id', attendeeUserId)
		.eq('attendance_day', todayKey)
		.maybeSingle();

	if (!existing) {
		const { error: insertErr } = await locals.supabase.from('attendance_daily_sessions').insert({
			attendee_user_id: attendeeUserId,
			attendance_day: todayKey,
			check_in_at: nowIso,
			check_out_at: null,
			last_scanned_by: user.id
		});
		if (insertErr) return json({ error: insertErr.message }, { status: 400 });
		return json({ ok: true, action: 'check_in', attendanceDay: todayKey });
	}

	const { error: updateErr } = await locals.supabase
		.from('attendance_daily_sessions')
		.update({
			check_out_at: nowIso,
			last_scanned_by: user.id
		})
		.eq('id', existing.id);
	if (updateErr) return json({ error: updateErr.message }, { status: 400 });

	return json({ ok: true, action: 'check_out', attendanceDay: todayKey });
};
