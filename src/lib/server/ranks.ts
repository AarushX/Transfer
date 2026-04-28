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
};

export type UserRankSummary = {
	userId: string;
	courseCompletions: number;
	attendanceDays: number;
	coursePoints: number;
	attendancePoints: number;
	totalPoints: number;
	rank: RankTier | null;
	badges: string[];
};

const COURSE_POINTS = 10;
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

	const [tiers, certsResp, attendanceResp] = await Promise.all([
		loadRankTiers(supabase),
		supabase
			.from('certifications')
			.select('user_id,nodes!inner(title)')
			.in('user_id', ids)
			.eq('status', 'completed'),
		supabase
			.from('attendance_daily_sessions')
			.select('attendee_user_id')
			.in('attendee_user_id', ids)
	]);

	const certs = (certsResp.data ?? []) as CourseCompletionRow[];
	const attendance = (attendanceResp.data ?? []) as AttendanceRow[];

	const coursesByUser = new Map<string, CourseCompletionRow[]>();
	for (const row of certs) {
		const key = String(row.user_id);
		const list = coursesByUser.get(key) ?? [];
		list.push(row);
		coursesByUser.set(key, list);
	}

	const attendanceByUser = new Map<string, number>();
	for (const row of attendance) {
		const key = String(row.attendee_user_id);
		attendanceByUser.set(key, (attendanceByUser.get(key) ?? 0) + 1);
	}

	for (const userId of ids) {
		const completed = coursesByUser.get(userId) ?? [];
		const attendanceDays = attendanceByUser.get(userId) ?? 0;
		const coursePoints = completed.length * COURSE_POINTS;
		const attendancePoints = attendanceDays * ATTENDANCE_POINTS;
		const totalPoints = coursePoints + attendancePoints;
		const rank = selectRank(tiers, totalPoints);
		output.set(userId, {
			userId,
			courseCompletions: completed.length,
			attendanceDays,
			coursePoints,
			attendancePoints,
			totalPoints,
			rank,
			badges: completed.map((r) => String(r.nodes?.title ?? '')).filter(Boolean)
		});
	}

	return output;
}
