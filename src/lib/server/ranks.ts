type RankTier = {
	slug: string;
	name: string;
	min_points: number;
	medal_label: string;
	medal_icon: string;
	color_token: string;
	sort_order: number;
};

type CourseCompletionRow = {
	user_id: string;
	nodes?: { title?: string | null } | null;
};

type AttendanceRow = {
	attendee_user_id: string;
	check_in_at: string;
	check_out_at: string | null;
};

type SegmentProgressRow = {
	user_id: string;
	segment_id: string;
};

export type UserRankSummary = {
	userId: string;
	courseCompletions: number;
	segmentCompletions: number;
	attendanceDays: number;
	attendanceHours: number;
	coursePoints: number;
	attendancePoints: number;
	totalPoints: number;
	rank: RankTier | null;
	badges: string[];
};

export type ValorantRankSummary = {
	tier: string;
	division: number | null;
	label: string;
	nextLabel: string | null;
	pointsIntoTier: number;
	pointsToNext: number | null;
};

const COURSE_SEGMENT_POINTS = 3;
const ATTENDANCE_POINTS = 2;

const selectRank = (tiers: RankTier[], totalPoints: number): RankTier | null => {
	let best: RankTier | null = null;
	for (const tier of tiers) {
		if (totalPoints >= Number(tier.min_points) && (!best || tier.min_points >= best.min_points)) {
			best = tier;
		}
	}
	return best;
};

const VALORANT_TIERS = [
	{ name: 'Iron', min: 0 },
	{ name: 'Bronze', min: 40 },
	{ name: 'Silver', min: 90 },
	{ name: 'Gold', min: 150 },
	{ name: 'Platinum', min: 220 },
	{ name: 'Diamond', min: 300 },
	{ name: 'Ascendant', min: 390 },
	{ name: 'Immortal', min: 490 },
	{ name: 'Radiant', min: 600 }
] as const;

const DIVISION_SIZE = 20;

export const computeValorantRank = (points: number): ValorantRankSummary => {
	const total = Math.max(0, Math.trunc(points || 0));
	let tierIndex = 0;
	for (let i = 0; i < VALORANT_TIERS.length; i += 1) {
		if (total >= VALORANT_TIERS[i].min) tierIndex = i;
	}

	const tier = VALORANT_TIERS[tierIndex];
	const nextTier = tierIndex < VALORANT_TIERS.length - 1 ? VALORANT_TIERS[tierIndex + 1] : null;
	const hasDivision = tier.name !== 'Radiant';
	const pointsIntoTier = total - tier.min;
	const division = hasDivision ? Math.min(3, Math.floor(pointsIntoTier / DIVISION_SIZE) + 1) : null;
	const label = hasDivision ? `${tier.name} ${division}` : tier.name;
	const nextLabel = hasDivision
		? division! < 3
			? `${tier.name} ${division! + 1}`
			: nextTier
				? `${nextTier.name} 1`
				: 'Radiant'
		: null;
	const nextThreshold = hasDivision
		? tier.min + (division === 3 ? DIVISION_SIZE * 3 : DIVISION_SIZE * division!)
		: null;

	return {
		tier: tier.name,
		division,
		label,
		nextLabel,
		pointsIntoTier,
		pointsToNext: nextThreshold == null ? null : Math.max(0, nextThreshold - total)
	};
};

export async function loadRankTiers(supabase: any): Promise<RankTier[]> {
	const { data } = await supabase
		.from('rank_tiers')
		.select('slug,name,min_points,medal_label,medal_icon,color_token,sort_order')
		.order('min_points', { ascending: true });
	return (data ?? []) as RankTier[];
}

export async function computeUserRanks(
	supabase: any,
	userIds: string[]
): Promise<Map<string, UserRankSummary>> {
	const ids = Array.from(new Set(userIds.filter(Boolean)));
	const output = new Map<string, UserRankSummary>();
	if (ids.length === 0) return output;

	const [tiers, certsResp, attendanceResp, segmentsResp] = await Promise.all([
		loadRankTiers(supabase),
		supabase
			.from('certifications')
			.select('user_id,nodes!inner(title)')
			.in('user_id', ids)
			.eq('status', 'completed'),
		supabase
			.from('attendance_daily_sessions')
			.select('attendee_user_id,check_in_at,check_out_at')
			.in('attendee_user_id', ids),
		supabase
			.from('user_node_segment_progress')
			.select('user_id,segment_id')
			.in('user_id', ids)
			.not('passed_at', 'is', null)
	]);

	const certs = (certsResp.data ?? []) as CourseCompletionRow[];
	const attendance = (attendanceResp.data ?? []) as AttendanceRow[];
	const segments = (segmentsResp.data ?? []) as SegmentProgressRow[];

	const coursesByUser = new Map<string, CourseCompletionRow[]>();
	for (const row of certs) {
		const key = String(row.user_id);
		const list = coursesByUser.get(key) ?? [];
		list.push(row);
		coursesByUser.set(key, list);
	}

	const attendanceByUser = new Map<string, number>();
	const attendanceHoursByUser = new Map<string, number>();
	for (const row of attendance) {
		const key = String(row.attendee_user_id);
		attendanceByUser.set(key, (attendanceByUser.get(key) ?? 0) + 1);
		const startMs = new Date(row.check_in_at).getTime();
		const endMs = row.check_out_at ? new Date(row.check_out_at).getTime() : Date.now();
		const elapsedHours = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs ? (endMs - startMs) / (1000 * 60 * 60) : 0;
		attendanceHoursByUser.set(key, (attendanceHoursByUser.get(key) ?? 0) + elapsedHours);
	}

	const segmentsByUser = new Map<string, Set<string>>();
	for (const row of segments) {
		const key = String(row.user_id);
		const set = segmentsByUser.get(key) ?? new Set<string>();
		set.add(String(row.segment_id));
		segmentsByUser.set(key, set);
	}

	for (const userId of ids) {
		const completed = coursesByUser.get(userId) ?? [];
		const attendanceDays = attendanceByUser.get(userId) ?? 0;
		const segmentCompletions = (segmentsByUser.get(userId) ?? new Set<string>()).size;
		const attendanceHours = Math.ceil(attendanceHoursByUser.get(userId) ?? 0);
		const coursePoints = segmentCompletions * COURSE_SEGMENT_POINTS;
		const attendancePoints = attendanceHours * ATTENDANCE_POINTS;
		const totalPoints = coursePoints + attendancePoints;
		const rank = selectRank(tiers, totalPoints);
		output.set(userId, {
			userId,
			courseCompletions: completed.length,
			segmentCompletions,
			attendanceDays,
			attendanceHours,
			coursePoints,
			attendancePoints,
			totalPoints,
			rank,
			badges: completed.map((r) => String(r.nodes?.title ?? '')).filter(Boolean)
		});
	}

	return output;
}
