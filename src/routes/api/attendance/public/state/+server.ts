import { json, type RequestHandler } from '@sveltejs/kit';
import { ATTENDANCE_PUBLIC_DISPLAY_KEY, attendanceHourBucket } from '$lib/server/attendance';

export const GET: RequestHandler = async ({ locals }) => {
	const { data: displaySessions, error } = await locals.supabase
		.from('attendance_display_sessions')
		.select('id,activated_at')
		.eq('access_token', ATTENDANCE_PUBLIC_DISPLAY_KEY)
		.order('created_at', { ascending: false })
		.limit(50);
	if (error) return json({ error: error.message }, { status: 500 });
	const isActive = (displaySessions ?? []).some((row: any) => Boolean(row.activated_at));

	return json(
		{
			ok: true,
			isActive,
			bucket: attendanceHourBucket()
		},
		{
			headers: {
				'cache-control': 'no-store'
			}
		}
	);
};
