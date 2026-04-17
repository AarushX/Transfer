import { json, type RequestHandler } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { createAttendanceAccessToken } from '$lib/server/attendance';

const encoder = new TextEncoder();

export const POST: RequestHandler = async ({ locals, request, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !['mentor', 'admin'].includes(profile.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = await request.json().catch(() => null);
	const passportToken = String(body?.passportToken ?? '').trim();
	if (!passportToken) return json({ error: 'Passport QR token is required.' }, { status: 400 });

	let attendeeUserId = '';
	try {
		const { payload } = await jwtVerify(
			passportToken,
			encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me')
		);
		attendeeUserId = String(payload.user_id ?? '');
	} catch {
		return json({ error: 'Invalid or expired passport QR token.' }, { status: 400 });
	}
	if (!attendeeUserId) return json({ error: 'Could not resolve attendee from passport QR.' }, { status: 400 });

	const { data: attendee } = await locals.supabase
		.from('profiles')
		.select('id,full_name,email')
		.eq('id', attendeeUserId)
		.maybeSingle();
	if (!attendee) return json({ error: 'Attendee profile not found.' }, { status: 404 });

	const accessToken = await createAttendanceAccessToken(attendeeUserId, user.id);
	await locals.supabase.from('attendance_display_sessions').upsert(
		{
			attendee_user_id: attendeeUserId,
			access_token: accessToken,
			activated_at: null,
			activated_by: null
		},
		{ onConflict: 'access_token' }
	);
	const attendanceUrl = `${url.origin}/attendance?k=${encodeURIComponent(accessToken)}`;
	return json({ ok: true, attendee, attendanceUrl });
};
