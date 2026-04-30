import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { computeUserRanks, computeValorantRank } from '$lib/server/ranks';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id,full_name,avatar_url,is_parent_guardian')
		.neq('is_parent_guardian', true)
		.order('full_name', { ascending: true });

	const users = (profiles ?? []).map((row: any) => ({
		id: String(row.id),
		fullName: String(row.full_name ?? '').trim() || 'Anonymous member',
		avatarUrl: String(row.avatar_url ?? '')
	}));

	const rankMap = await computeUserRanks(
		locals.supabase,
		users.map((u) => u.id)
	);

	const leaderboard = users
		.map((member) => {
			const summary = rankMap.get(member.id);
			const totalPoints = summary?.totalPoints ?? 0;
			return {
				userId: member.id,
				fullName: member.fullName,
				avatarUrl: member.avatarUrl,
				totalPoints,
				segmentCompletions: summary?.segmentCompletions ?? 0,
				attendanceHours: summary?.attendanceHours ?? 0,
				valorant: computeValorantRank(totalPoints)
			};
		})
		.sort((a, b) => {
			if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
			return a.fullName.localeCompare(b.fullName);
		})
		.map((row, index) => ({ ...row, placement: index + 1 }));

	const myEntry =
		leaderboard.find((entry) => entry.userId === user.id) ?? {
			userId: user.id,
			fullName: String(profile.full_name ?? '').trim() || 'You',
			avatarUrl: String(profile.avatar_url ?? ''),
			totalPoints: 0,
			segmentCompletions: 0,
			attendanceHours: 0,
			valorant: computeValorantRank(0),
			placement: leaderboard.length + 1
		};

	return {
		leaderboard,
		myEntry,
		totalMembers: leaderboard.length
	};
};
