import { json, type RequestHandler } from '@sveltejs/kit';
import { ATTENDANCE_PUBLIC_DISPLAY_KEY, attendanceHourBucket } from '$lib/server/attendance';

export const GET: RequestHandler = async ({ locals }) => {
	const { data: displaySession } = await locals.supabase
		.from('attendance_display_sessions')
		.select('activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.maybeSingle();

	return json(
		{
			ok: true,
			isActive: Boolean(displaySession?.activated_at),
			bucket: attendanceHourBucket()
		},
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
