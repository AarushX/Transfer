import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');

	const [{ data: sessions }, { data: displays }, { data: events }] = await Promise.all([
		locals.supabase
			.from('attendance_daily_sessions')
			.select('id,attendee_user_id,attendance_day,check_in_at,check_out_at,last_scanned_by,created_at')
			.order('attendance_day', { ascending: false })
			.order('check_in_at', { ascending: false })
			.limit(500),
		locals.supabase
			.from('attendance_display_sessions')
			.select('id,attendee_user_id,activated_at,activated_by,created_at')
			.order('created_at', { ascending: false })
			.limit(200),
		locals.supabase
			.from('attendance_scan_events')
			.select('id,attendee_user_id,scanned_by_user_id,attendance_day,action,created_at,metadata')
			.order('created_at', { ascending: false })
			.limit(1000)
	]);

	const profileIds = Array.from(
		new Set(
			[
				...(sessions ?? []).map((row: any) => row.attendee_user_id),
				...(sessions ?? []).map((row: any) => row.last_scanned_by),
				...(displays ?? []).map((row: any) => row.attendee_user_id),
				...(displays ?? []).map((row: any) => row.activated_by),
				...(events ?? []).map((row: any) => row.attendee_user_id),
				...(events ?? []).map((row: any) => row.scanned_by_user_id)
			].filter(Boolean)
		)
	);
	const { data: profiles } = profileIds.length
		? await locals.supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
		: { data: [] as any[] };
	const profileById = new Map((profiles ?? []).map((p: any) => [String(p.id), p]));

	return {
		timeZone: process.env.ATTENDANCE_TIMEZONE ?? 'America/New_York',
		sessions:
			(sessions ?? []).map((row: any) => ({
				...row,
				attendee: profileById.get(String(row.attendee_user_id)) ?? null,
				lastScanner: profileById.get(String(row.last_scanned_by ?? '')) ?? null
			})) ?? [],
		displays:
			(displays ?? []).map((row: any) => ({
				...row,
				attendee: profileById.get(String(row.attendee_user_id)) ?? null,
				activatedBy: profileById.get(String(row.activated_by ?? '')) ?? null
			})) ?? [],
		events:
			(events ?? []).map((row: any) => ({
				...row,
				attendee: profileById.get(String(row.attendee_user_id ?? '')) ?? null,
				scannedBy: profileById.get(String(row.scanned_by_user_id ?? '')) ?? null
			})) ?? []
	};
};
