import { json, type RequestHandler } from '@sveltejs/kit';
import { attendanceDayKey } from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !['mentor', 'admin'].includes(profile.role)) {
		return json({ error: 'Only mentors can manually check in members.' }, { status: 403 });
	}

	const body = await request.json().catch(() => null);
	const attendeeUserId = String(body?.attendeeUserId ?? '').trim();
	const reasonRaw = String(body?.reason ?? '').trim();
	const reason = reasonRaw ? reasonRaw.slice(0, 300) : null;
	if (!attendeeUserId) {
		return json({ error: 'attendeeUserId is required.' }, { status: 400 });
	}

	const attendanceDay = attendanceDayKey();
	const nowIso = new Date().toISOString();
	const { data: existing } = await locals.supabase
		.from('attendance_daily_sessions')
		.select('id,check_in_at,check_out_at,counts_for_rank')
		.eq('attendee_user_id', attendeeUserId)
		.eq('attendance_day', attendanceDay)
		.maybeSingle();

	if (existing?.check_in_at && !existing?.check_out_at) {
		return json({ error: 'This member is already checked in for today.' }, { status: 409 });
	}
	if (existing?.check_out_at) {
		return json({ error: 'This member is already checked out for today.' }, { status: 409 });
	}

	if (!existing) {
		const { error: insertErr } = await locals.supabase.from('attendance_daily_sessions').insert({
			attendee_user_id: attendeeUserId,
			attendance_day: attendanceDay,
			check_in_at: nowIso,
			check_out_at: null,
			last_scanned_by: user.id,
			counts_for_rank: false
		});
		if (insertErr) return json({ error: insertErr.message }, { status: 400 });
	} else {
		const { error: updateErr } = await locals.supabase
			.from('attendance_daily_sessions')
			.update({
				check_in_at: nowIso,
				check_out_at: null,
				last_scanned_by: user.id,
				counts_for_rank: false
			})
			.eq('id', existing.id);
		if (updateErr) return json({ error: updateErr.message }, { status: 400 });
	}

	await locals.supabase.from('attendance_scan_events').insert({
		attendee_user_id: attendeeUserId,
		scanned_by_user_id: user.id,
		attendance_day: attendanceDay,
		action: 'manual_check_in',
		metadata: {
			source: 'mentor_manual',
			rr_excluded: true,
			reason
		}
	});

	await locals.supabase.from('audit_log').insert({
		actor_id: user.id,
		action: 'attendance_manual_check_in',
		target_user_id: attendeeUserId,
		metadata: {
			attendance_day: attendanceDay,
			counts_for_rank: false,
			reason
		}
	});

	return json({ ok: true, attendanceDay, countsForRank: false });
};
