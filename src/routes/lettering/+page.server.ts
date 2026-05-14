import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	// Fetch active lettering season
	const { data: season } = await locals.supabase
		.from('lettering_seasons')
		.select('id, label, start_date, end_date, is_active')
		.eq('is_active', true)
		.maybeSingle();

	if (!season) {
		return { season: null, requirements: [], progress: {} };
	}

	// Fetch all data in parallel
	const [reqResp, outreachResp, compAttendanceResp, compEventsResp, parentVolResp] =
		await Promise.all([
			locals.supabase
				.from('lettering_requirements')
				.select('id, season_id, category, label, required_value, sort_order')
				.eq('season_id', season.id)
				.order('sort_order', { ascending: true }),
			locals.supabase
				.from('outreach_hours')
				.select('hours')
				.eq('user_id', user.id)
				.eq('season_id', season.id)
				.eq('verification_status', 'verified'),
			locals.supabase
				.from('competition_attendance')
				.select('id, competition_id, check_in_at, check_out_at')
				.eq('user_id', user.id),
			locals.supabase
				.from('competition_events')
				.select('id, season_id, name')
				.eq('season_id', season.id),
			locals.supabase
				.from('parent_volunteer_hours')
				.select('hours')
				.eq('student_user_id', user.id)
				.eq('season_id', season.id)
				.eq('verification_status', 'verified')
		]);

	const requirements = reqResp.data ?? [];

	// Sum verified outreach hours
	const outreachTotal = (outreachResp.data ?? []).reduce(
		(sum: number, row: any) => sum + Number(row.hours ?? 0),
		0
	);

	// Compute competition attendance hours from check-in/check-out pairs
	const seasonCompIds = new Set(
		(compEventsResp.data ?? []).map((e: any) => String(e.id))
	);
	const compRecords = (compAttendanceResp.data ?? []).filter((r: any) =>
		seasonCompIds.has(String(r.competition_id))
	);
	let competitionHours = 0;
	let competitionCount = compRecords.length;
	for (const rec of compRecords) {
		if (rec.check_in_at && rec.check_out_at) {
			const inTime = new Date(rec.check_in_at).getTime();
			const outTime = new Date(rec.check_out_at).getTime();
			if (outTime > inTime) {
				competitionHours += (outTime - inTime) / (1000 * 60 * 60);
			}
		}
	}
	competitionHours = Math.round(competitionHours * 10) / 10;

	// Sum verified parent volunteer hours
	const parentVolTotal = (parentVolResp.data ?? []).reduce(
		(sum: number, row: any) => sum + Number(row.hours ?? 0),
		0
	);

	// Compute shop attendance hours from scan events within the season date range
	let shopHours = 0;
	const { data: scanRows } = await locals.supabase
		.from('attendance_scan_events')
		.select('scanned_at, direction')
		.eq('user_id', user.id)
		.gte('scanned_at', season.start_date)
		.lte('scanned_at', season.end_date)
		.order('scanned_at', { ascending: true });

	if (scanRows && scanRows.length > 0) {
		let lastIn: number | null = null;
		for (const scan of scanRows) {
			if (scan.direction === 'in') {
				lastIn = new Date(scan.scanned_at).getTime();
			} else if (scan.direction === 'out' && lastIn !== null) {
				const outTime = new Date(scan.scanned_at).getTime();
				if (outTime > lastIn) {
					shopHours += (outTime - lastIn) / (1000 * 60 * 60);
				}
				lastIn = null;
			}
		}
	}
	shopHours = Math.round(shopHours * 10) / 10;

	// Build progress map keyed by category
	const progress: Record<string, number> = {
		outreach_hours: outreachTotal,
		competition_hours: competitionHours,
		competition_attendance: competitionCount,
		parent_volunteer_hours: parentVolTotal,
		shop_hours: shopHours
	};

	return { season, requirements, progress };
};
