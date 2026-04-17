import type { PageServerLoad } from './$types';
import QRCode from 'qrcode';
import {
	createAttendanceActivationToken,
	createAttendanceHourlyToken,
	verifyAttendanceAccessToken
} from '$lib/server/attendance';

export const load: PageServerLoad = async ({ locals, url }) => {
	const accessToken = String(url.searchParams.get('k') ?? '').trim();
	if (!accessToken) return { authorized: false, reason: 'missing' as const };

	let attendeeUserId = '';
	try {
		const resolved = await verifyAttendanceAccessToken(accessToken);
		attendeeUserId = resolved.attendeeUserId;
	} catch {
		return { authorized: false, reason: 'invalid' as const };
	}

	const { data: attendee } = await locals.supabase
		.from('profiles')
		.select('id,full_name,email')
		.eq('id', attendeeUserId)
		.maybeSingle();
	if (!attendee) return { authorized: false, reason: 'invalid' as const };

	const { data: displaySession } = await locals.supabase
		.from('attendance_display_sessions')
		.select('id,activated_at')
		.eq('access_token', accessToken)
		.maybeSingle();
	if (!displaySession) {
		await locals.supabase.from('attendance_display_sessions').insert({
			attendee_user_id: attendeeUserId,
			access_token: accessToken
		});
	}

	const isActive = Boolean(displaySession?.activated_at);
	const token = isActive
		? await createAttendanceHourlyToken(attendeeUserId)
		: await createAttendanceActivationToken(accessToken);
	const qrDataUrl = await QRCode.toDataURL(token);
	return {
		authorized: true,
		accessToken,
		attendee,
		isActive,
		qrDataUrl
	};
};
