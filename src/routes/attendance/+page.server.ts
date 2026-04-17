import type { PageServerLoad } from './$types';
import QRCode from 'qrcode';
import {
	ATTENDANCE_PUBLIC_ACTIVATION_QR,
	ATTENDANCE_PUBLIC_DISPLAY_KEY,
	createAttendancePublicHourlyToken
} from '$lib/server/attendance';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: displaySession } = await locals.supabase
		.from('attendance_display_sessions')
		.select('id,activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.maybeSingle();
	if (!displaySession) {
		await locals.supabase.from('attendance_display_sessions').insert({
			attendee_user_id: null,
			access_token: ATTENDANCE_PUBLIC_DISPLAY_KEY
		});
	}

	const isActive = Boolean(displaySession?.activated_at);
	const token = isActive ? await createAttendancePublicHourlyToken() : ATTENDANCE_PUBLIC_ACTIVATION_QR;
	const qrDataUrl = await QRCode.toDataURL(token);
	return {
		authorized: true,
		isActive,
		qrDataUrl
	};
};
