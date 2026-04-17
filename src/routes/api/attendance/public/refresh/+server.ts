import { json, type RequestHandler } from '@sveltejs/kit';
import QRCode from 'qrcode';
import {
	createAttendanceActivationToken,
	createAttendanceHourlyToken,
	verifyAttendanceAccessToken
} from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals, request }) => {
	const body = await request.json().catch(() => null);
	const accessToken = String(body?.accessToken ?? '').trim();
	if (!accessToken) return json({ error: 'Attendance access token is required.' }, { status: 400 });

	let attendeeUserId = '';
	try {
		const resolved = await verifyAttendanceAccessToken(accessToken);
		attendeeUserId = resolved.attendeeUserId;
	} catch {
		return json({ error: 'Invalid or expired attendance link.' }, { status: 400 });
	}

	const { data: attendee } = await locals.supabase
		.from('profiles')
		.select('id,full_name,email')
		.eq('id', attendeeUserId)
		.maybeSingle();
	if (!attendee) return json({ error: 'Attendee not found.' }, { status: 404 });

	const { data: displaySession } = await locals.supabase
		.from('attendance_display_sessions')
		.select('activated_at')
		.eq('access_token', accessToken)
		.maybeSingle();

	const isActive = Boolean(displaySession?.activated_at);
	const token = isActive
		? await createAttendanceHourlyToken(attendeeUserId)
		: await createAttendanceActivationToken(accessToken);
	const qrDataUrl = await QRCode.toDataURL(token);
	return json({ ok: true, attendee, isActive, qrDataUrl });
};
