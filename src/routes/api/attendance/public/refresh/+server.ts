import { json, type RequestHandler } from '@sveltejs/kit';
import QRCode from 'qrcode';
import {
	ATTENDANCE_PUBLIC_ACTIVATION_QR,
	ATTENDANCE_PUBLIC_DISPLAY_KEY,
	createAttendancePublicHourlyToken
} from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals }) => {
	const { data: displaySession } = await locals.supabase
		.from('attendance_display_sessions')
		.select('activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.maybeSingle();

	const isActive = Boolean(displaySession?.activated_at);
	const token = isActive ? await createAttendancePublicHourlyToken() : ATTENDANCE_PUBLIC_ACTIVATION_QR;
	const qrDataUrl = await QRCode.toDataURL(token);
	return json({ ok: true, isActive, qrDataUrl });
};
