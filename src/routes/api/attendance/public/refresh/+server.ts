import { json, type RequestHandler } from '@sveltejs/kit';
import QRCode from 'qrcode';
import {
	ATTENDANCE_PUBLIC_ACTIVATION_QR,
	ATTENDANCE_PUBLIC_DISPLAY_KEY,
	attendanceHourBucket,
	createAttendancePublicHourlyToken
} from '$lib/server/attendance';

export const POST: RequestHandler = async ({ locals }) => {
	const { data: displaySessions } = await locals.supabase
		.from('attendance_display_sessions')
		.select('id,activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.order('created_at', { ascending: false })
		.limit(50);

	const isActive = (displaySessions ?? []).some((row: any) => Boolean(row.activated_at));
	const bucket = attendanceHourBucket();
	const studentToken = isActive ? await createAttendancePublicHourlyToken('students') : '';
	const mentorToken = isActive ? await createAttendancePublicHourlyToken('mentors') : '';
	const studentQrDataUrl = await QRCode.toDataURL(isActive ? studentToken : ATTENDANCE_PUBLIC_ACTIVATION_QR);
	const mentorQrDataUrl = await QRCode.toDataURL(isActive ? mentorToken : ATTENDANCE_PUBLIC_ACTIVATION_QR);
	return json(
		{ ok: true, isActive, bucket, studentQrDataUrl, mentorQrDataUrl },
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
