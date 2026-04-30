import { json, type RequestHandler } from '@sveltejs/kit';
import { ATTENDANCE_PUBLIC_DISPLAY_KEY, attendanceDayKey } from '$lib/server/attendance';

type ManualAction = 'activate' | 'deactivate' | 'check_in' | 'check_out';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || profile.role !== 'admin') {
		return json({ error: 'Only admins can perform manual attendance actions.' }, { status: 403 });
	}

	const body = await request.json().catch(() => null);
	const action = String(body?.action ?? '').trim() as ManualAction;
	const attendeeUserId = String(body?.attendeeUserId ?? '').trim() || null;
	const note = String(body?.note ?? '').trim().slice(0, 300);
	const attendanceDay = attendanceDayKey();
	const nowIso = new Date().toISOString();

	if (!['activate', 'deactivate', 'check_in', 'check_out'].includes(action)) {
		return json({ error: 'Invalid manual action.' }, { status: 400 });
	}

	if (action === 'activate' || action === 'deactivate') {
		const { data: sessions } = await locals.supabase
			.from('attendance_display_sessions')
			.select('id')
			.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
			.limit(1);
		if (!sessions || sessions.length === 0) {
			const { error: createErr } = await locals.supabase.from('attendance_display_sessions').insert({
				attendee_user_id: null,
				access_token: ATTENDANCE_PUBLIC_DISPLAY_KEY
			});
			if (createErr) return json({ error: createErr.message }, { status: 400 });
		}

		const { error: toggleErr } = await locals.supabase
			.from('attendance_display_sessions')
			.update({
				activated_at: action === 'activate' ? nowIso : null,
				activated_by: user.id
			})
			.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY);
		if (toggleErr) return json({ error: toggleErr.message }, { status: 400 });

		await locals.supabase.from('attendance_scan_events').insert({
			attendee_user_id: null,
			scanned_by_user_id: user.id,
			attendance_day: attendanceDay,
			action: action === 'activate' ? 'display_activate' : 'display_deactivate',
			metadata: { source: 'admin_manual_panel', note: note || null }
		});
		await locals.supabase.from('audit_log').insert({
			actor_id: user.id,
			action: `attendance_admin_manual_${action}`,
			metadata: { attendance_day: attendanceDay, note: note || null }
		});
		return json({ ok: true, action, attendanceDay });
	}

	if (!attendeeUserId) {
		return json({ error: 'attendeeUserId is required for check-in/check-out.' }, { status: 400 });
	}

	const { data: existing } = await locals.supabase
		.from('attendance_daily_sessions')
		.select('id,check_in_at,check_out_at')
		.eq('attendee_user_id', attendeeUserId)
		.eq('attendance_day', attendanceDay)
		.maybeSingle();

	if (action === 'check_in') {
		if (existing?.check_in_at && !existing?.check_out_at) {
			return json({ error: 'Member is already checked in.' }, { status: 409 });
		}
		if (existing?.check_out_at) {
			return json({ error: 'Member is already checked out for this day.' }, { status: 409 });
		}
		const { error: writeErr } = existing
			? await locals.supabase
					.from('attendance_daily_sessions')
					.update({
						check_in_at: nowIso,
						check_out_at: null,
						last_scanned_by: user.id,
						counts_for_rank: false
					})
					.eq('id', existing.id)
			: await locals.supabase.from('attendance_daily_sessions').insert({
					attendee_user_id: attendeeUserId,
					attendance_day: attendanceDay,
					check_in_at: nowIso,
					check_out_at: null,
					last_scanned_by: user.id,
					counts_for_rank: false
				});
		if (writeErr) return json({ error: writeErr.message }, { status: 400 });
	}

	if (action === 'check_out') {
		if (!existing?.check_in_at) {
			return json({ error: 'Member is not checked in yet.' }, { status: 409 });
		}
		if (existing.check_out_at) {
			return json({ error: 'Member is already checked out.' }, { status: 409 });
		}
		const { error: updateErr } = await locals.supabase
			.from('attendance_daily_sessions')
			.update({
				check_out_at: nowIso,
				last_scanned_by: user.id
			})
			.eq('id', existing.id);
		if (updateErr) return json({ error: updateErr.message }, { status: 400 });
	}

	await locals.supabase.from('attendance_scan_events').insert({
		attendee_user_id: attendeeUserId,
		scanned_by_user_id: user.id,
		attendance_day: attendanceDay,
		action: action === 'check_in' ? 'check_in' : 'check_out',
		metadata: {
			source: 'admin_manual_panel',
			note: note || null,
			counts_for_rank: action === 'check_in' ? false : undefined
		}
	});
	await locals.supabase.from('audit_log').insert({
		actor_id: user.id,
		action: `attendance_admin_manual_${action}`,
		target_user_id: attendeeUserId,
		metadata: {
			attendance_day: attendanceDay,
			note: note || null,
			counts_for_rank: action === 'check_in' ? false : undefined
		}
	});

	return json({ ok: true, action, attendanceDay, attendeeUserId });
};
