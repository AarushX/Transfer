import { json, type RequestHandler } from '@sveltejs/kit';
import {
	ATTENDANCE_PUBLIC_ACTIVATION_QR,
	ATTENDANCE_PUBLIC_DISPLAY_KEY,
	attendanceDayKey,
	verifyAttendancePublicHourlyToken
} from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	const token = String(body?.token ?? '').trim();
	if (!token) return json({ error: 'Attendance QR token is required.' }, { status: 400 });

	if (token === ATTENDANCE_PUBLIC_ACTIVATION_QR) {
		if (!profile || !['mentor', 'admin'].includes(profile.role)) {
			return json({ error: 'Only mentors can activate attendance displays.' }, { status: 403 });
		}
		const { data: session } = await locals.supabase
			.from('attendance_display_sessions')
			.select('id,activated_at')
			.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
			.maybeSingle();
		if (!session) return json({ error: 'Attendance display session not found.' }, { status: 404 });
		const nextActive = !session.activated_at;
		const { error: toggleErr } = await locals.supabase
			.from('attendance_display_sessions')
			.update({
				activated_at: nextActive ? new Date().toISOString() : null,
				activated_by: nextActive ? user.id : null
			})
			.eq('id', session.id);
		if (toggleErr) return json({ error: toggleErr.message }, { status: 400 });
		return json({ ok: true, action: nextActive ? 'activate' : 'deactivate' });
	}

	try {
		const resolved = await verifyAttendancePublicHourlyToken(token);
		if (!profile) return json({ error: 'Unauthorized' }, { status: 401 });
		if (resolved.audience === 'students' && ['mentor', 'admin'].includes(profile.role)) {
			return json({ error: 'Mentors must use the mentor attendance QR.' }, { status: 403 });
		}
		if (resolved.audience === 'mentors' && !['mentor', 'admin'].includes(profile.role)) {
			return json({ error: 'This attendance QR is for mentors only.' }, { status: 403 });
		}
	} catch {
		return json({ error: 'Invalid or expired attendance QR token.' }, { status: 400 });
	}
	const { data: displaySession } = await locals.supabase
		.from('attendance_display_sessions')
		.select('activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.maybeSingle();
	if (!displaySession?.activated_at) {
		return json({ error: 'Attendance display is not activated yet.' }, { status: 400 });
	}

	const todayKey = attendanceDayKey();
	const nowIso = new Date().toISOString();

	const { data: existing } = await locals.supabase
		.from('attendance_daily_sessions')
		.select('id,check_in_at,check_out_at')
		.eq('attendee_user_id', user.id)
		.eq('attendance_day', todayKey)
		.maybeSingle();

	if (!existing) {
		const { error: insertErr } = await locals.supabase.from('attendance_daily_sessions').insert({
			attendee_user_id: user.id,
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
