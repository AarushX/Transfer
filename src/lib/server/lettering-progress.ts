import type { SupabaseClient } from '@supabase/supabase-js';

export type LetteringProgress = {
	pct: number;
	completedCount: number;
	totalRequired: number;
	overflow: boolean;
};

type Requirement = { category: string; required_value: number };
type Tally = Record<string, number>;

/**
 * Pure helper — computes lettering progress given requirements + a tally of
 * actual values per category.
 *
 * Algorithm:
 * - Each requirement's ratio is clamped to [0, 1] per-category for the pct
 *   calculation, so partially-met requirements contribute proportionally and a
 *   single over-achievement does not inflate the average while other categories
 *   are incomplete.
 * - `completedCount` counts categories where actual >= required.
 * - `overflow` fires when ALL requirements are met AND at least one category's
 *   actual value exceeds its required_value (i.e., the student has done more
 *   than the minimum across the board). When overflow is true, pct uses the
 *   unclamped average so it can exceed 100.
 */
export function computeLetteringProgressPure(
	requirements: Requirement[],
	tally: Tally
): LetteringProgress {
	if (requirements.length === 0) {
		return { pct: 0, completedCount: 0, totalRequired: 0, overflow: false };
	}

	let clampedSum = 0;
	let rawSum = 0;
	let completed = 0;
	let anyExcess = false;

	for (const r of requirements) {
		const actual = tally[r.category] ?? 0;
		const rawRatio = actual / r.required_value;
		if (rawRatio >= 1) {
			completed++;
			if (rawRatio > 1) anyExcess = true;
		}
		clampedSum += Math.min(rawRatio, 1);
		rawSum += rawRatio;
	}

	const allComplete = completed === requirements.length;
	const overflow = allComplete && anyExcess;

	// When all requirements are met with excess, use the unclamped average so
	// pct can exceed 100 and signal "beyond the minimum".  Otherwise use the
	// clamped average so partial progress is proportional.
	const avg = overflow ? rawSum / requirements.length : clampedSum / requirements.length;

	return {
		pct: Math.round(avg * 100),
		completedCount: completed,
		totalRequired: requirements.length,
		overflow
	};
}

/**
 * DB-aware helper — loads the active lettering season, its requirements, and
 * tallies each category from the appropriate tracking tables, then delegates to
 * `computeLetteringProgressPure`.
 *
 * Supported categories (matching admin-UI presets):
 *  - `outreach_hours`        → sum of verified hours in `outreach_hours`
 *  - `competition_hours`     → count of distinct attendance days in `competition_attendance`
 *  - `parent_volunteer_hours`→ sum of verified hours in `parent_volunteer_hours` (for student)
 *  - `shop_hours`            → sum of session durations in `attendance_daily_sessions`
 *
 * Any unrecognised category is silently tallied as 0; the pure helper still
 * produces a sensible (conservative) answer.
 */
export async function computeLetteringProgress(
	supabase: SupabaseClient,
	userId: string
): Promise<LetteringProgress> {
	// 1. Find the active season
	const { data: seasonRows } = await supabase
		.from('lettering_seasons')
		.select('id,is_active,start_date,end_date')
		.eq('is_active', true);

	const season = (seasonRows ?? [])[0];
	if (!season) {
		return { pct: 0, completedCount: 0, totalRequired: 0, overflow: false };
	}

	// 2. Load requirements for the active season
	const { data: requirementsData } = await supabase
		.from('lettering_requirements')
		.select('category,required_value')
		.eq('season_id', season.id);

	const requirements: Requirement[] = (requirementsData ?? []) as Requirement[];
	if (requirements.length === 0) {
		return { pct: 0, completedCount: 0, totalRequired: 0, overflow: false };
	}

	const categories = new Set(requirements.map((r) => r.category));
	const tally: Tally = {};

	// 3a. outreach_hours — sum verified hours in `outreach_hours` table for this season
	if (categories.has('outreach_hours')) {
		const { data: rows } = await supabase
			.from('outreach_hours')
			.select('hours')
			.eq('user_id', userId)
			.eq('season_id', season.id)
			.eq('verification_status', 'verified');
		tally.outreach_hours = (rows ?? []).reduce(
			(acc: number, r: { hours: number }) => acc + Number(r.hours),
			0
		);
	}

	// 3b. competition_hours — count distinct attendance days in `competition_attendance`
	//     (join through competition_events to scope to this season)
	if (categories.has('competition_hours')) {
		const { data: rows } = await supabase
			.from('competition_attendance')
			.select('attendance_date, competition_events!inner(season_id)')
			.eq('user_id', userId)
			.eq('competition_events.season_id', season.id);
		// Each distinct attendance_date counts as one "day" of competition presence
		const distinctDays = new Set((rows ?? []).map((r: { attendance_date: string }) => r.attendance_date));
		tally.competition_hours = distinctDays.size;
	}

	// 3c. parent_volunteer_hours — sum verified hours in `parent_volunteer_hours` for student
	if (categories.has('parent_volunteer_hours')) {
		const { data: rows } = await supabase
			.from('parent_volunteer_hours')
			.select('hours')
			.eq('student_user_id', userId)
			.eq('season_id', season.id)
			.eq('verification_status', 'verified');
		tally.parent_volunteer_hours = (rows ?? []).reduce(
			(acc: number, r: { hours: number }) => acc + Number(r.hours),
			0
		);
	}

	// 3d. shop_hours — sum session durations from `attendance_daily_sessions` during the season
	if (categories.has('shop_hours')) {
		const { data: sessions } = await supabase
			.from('attendance_daily_sessions')
			.select('check_in_at,check_out_at')
			.eq('attendee_user_id', userId)
			.not('check_out_at', 'is', null)
			.gte('attendance_day', season.start_date)
			.lte('attendance_day', season.end_date);
		tally.shop_hours = (sessions ?? []).reduce(
			(acc: number, s: { check_in_at: string; check_out_at: string }) => {
				const start = new Date(s.check_in_at).getTime();
				const end = new Date(s.check_out_at).getTime();
				return acc + Math.max(0, (end - start) / 3_600_000);
			},
			0
		);
	}

	return computeLetteringProgressPure(requirements, tally);
}
