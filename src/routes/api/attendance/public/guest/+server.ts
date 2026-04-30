import { json, type RequestHandler } from '@sveltejs/kit';
import { attendanceDayKey } from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals, request }) => {
	const body = await request.json().catch(() => null);
	const guestName = String(body?.guestName ?? '').trim();
	const reasonRaw = String(body?.reason ?? '').trim();
	const reason = reasonRaw ? reasonRaw.slice(0, 300) : null;
	if (!guestName) return json({ error: 'Guest name is required.' }, { status: 400 });
	if (guestName.length > 120) return json({ error: 'Guest name is too long.' }, { status: 400 });

	const { user } = await locals.safeGetSession();
	const attendanceDay = attendanceDayKey();
	const { data: inserted, error: insertErr } = await locals.supabase
		.from('attendance_guest_signins')
		.insert({
			guest_name: guestName,
			reason,
			attendance_day: attendanceDay,
			created_by_user_id: user?.id ?? null
		})
		.select('id')
		.single();
	if (insertErr) return json({ error: insertErr.message }, { status: 400 });

	await locals.supabase.from('attendance_scan_events').insert({
		attendee_user_id: null,
		scanned_by_user_id: user?.id ?? null,
		attendance_day: attendanceDay,
		action: 'guest_sign_in',
		metadata: {
			source: 'attendance_public_guest_signin',
			guest_name: guestName,
			reason,
			guest_signin_id: inserted?.id ?? null
		}
	});

	if (user?.id) {
		await locals.supabase.from('audit_log').insert({
			actor_id: user.id,
			action: 'attendance_guest_sign_in',
			metadata: {
				attendance_day: attendanceDay,
				guest_name: guestName,
				reason,
				guest_signin_id: inserted?.id ?? null
			}
		});
	}

	return json({ ok: true, attendanceDay, guestSigninId: inserted?.id ?? null });
};
