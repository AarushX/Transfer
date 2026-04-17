import type { PageServerLoad } from './$types';
import QRCode from 'qrcode';
import {
	ATTENDANCE_PUBLIC_ACTIVATION_QR,
	ATTENDANCE_PUBLIC_DISPLAY_KEY,
	attendanceHourBucket,
	createAttendancePublicHourlyToken
} from '$lib/server/attendance';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: displaySessions, error } = await locals.supabase
		.from('attendance_display_sessions')
		.select('id,activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.order('created_at', { ascending: false })
		.limit(50);
	if (error) {
		return {
			authorized: true,
			isActive: false,
			bucket: attendanceHourBucket(),
			studentQrDataUrl: await QRCode.toDataURL(ATTENDANCE_PUBLIC_ACTIVATION_QR),
			mentorQrDataUrl: await QRCode.toDataURL(ATTENDANCE_PUBLIC_ACTIVATION_QR)
		};
	}

	const isActive = (displaySessions ?? []).some((row: any) => Boolean(row.activated_at));
	const bucket = attendanceHourBucket();
	const studentToken = isActive ? await createAttendancePublicHourlyToken('students') : '';
	const mentorToken = isActive ? await createAttendancePublicHourlyToken('mentors') : '';
	const studentQrDataUrl = await QRCode.toDataURL(isActive ? studentToken : ATTENDANCE_PUBLIC_ACTIVATION_QR);
	const mentorQrDataUrl = await QRCode.toDataURL(isActive ? mentorToken : ATTENDANCE_PUBLIC_ACTIVATION_QR);
	return {
		authorized: true,
		isActive,
		bucket,
		studentQrDataUrl,
		mentorQrDataUrl
	};
};
