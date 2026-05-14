import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const [
		{ data: profileTeams },
		{ data: nodes },
		{ data: nodeStatuses },
		{ data: nodeTeamTargets },
		{ data: nodeTeamGroupTargets },
		{ data: nodePrereqs },
		{ data: blockRows },
		{ data: blockProgress },
		{ data: teamGroups },
		{ data: teams },
		{ data: subteams },
		{ data: primaryTeam },
		{ data: attendanceSum }
	] = await Promise.all([
		locals.supabase
			.from('profile_teams')
			.select('team_id,team_group_id,category_slug,teams(name,slug,color_hex),team_groups(id,name,slug,color_hex,designator)')
			.eq('user_id', user.id),
		locals.supabase.from('nodes').select('id,title,slug,subteam_id,video_url').order('title'),
		locals.supabase.from('v_user_node_status').select('node_id,computed_status').eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase.from('node_blocks').select('node_id,id'),
		locals.supabase.from('user_node_block_progress').select('node_id,block_id,completed_at').eq('user_id', user.id),
		locals.supabase.from('team_groups').select('id,name,slug,color_hex,designator').order('sort_order'),
		locals.supabase.from('teams').select('id,name,slug,color_hex,category_slug,team_group_id'),
		locals.supabase.from('subteams').select('id,name,slug'),
		locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', user.id).maybeSingle(),
		locals.supabase.from('attendance_daily_sessions').select('duration_hours').eq('attendee_user_id', user.id)
	]);

	const userTeamGroupIds = new Set(
		(profileTeams ?? []).map((row: any) => row.team_group_id).filter(Boolean)
	);
	const userTeamIds = new Set(
		(profileTeams ?? []).map((row: any) => row.team_id).filter(Boolean)
	);
	const userSubteamIds = new Set(
		(profileTeams ?? [])
			.map((row: any) => {
				const t = (teams ?? []).find((tt: any) => tt.id === row.team_id);
				return t?.category_slug ? null : null;
			})
			.filter(Boolean)
	);

	const myTeamGroups = (teamGroups ?? []).filter((g: any) => userTeamGroupIds.has(g.id));

	const requestedTeamGroupId = String(url.searchParams.get('team') ?? '').trim();
	const primaryTeamGroupId = primaryTeam?.team_group_id ?? null;
	const selectedTeamGroupId =
		(requestedTeamGroupId && userTeamGroupIds.has(requestedTeamGroupId)) ? requestedTeamGroupId
		: primaryTeamGroupId && userTeamGroupIds.has(primaryTeamGroupId) ? primaryTeamGroupId
		: myTeamGroups[0]?.id ?? null;

	const selectedTeamGroup = (teamGroups ?? []).find((g: any) => g.id === selectedTeamGroupId) ?? null;

	const statusByNode = new Map(
		(nodeStatuses ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)])
	);
	const teamTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamTargets ?? []) {
		const set = teamTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_id);
		teamTargetsByNode.set(row.node_id, set);
	}
	const tgTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamGroupTargets ?? []) {
		const set = tgTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_group_id);
		tgTargetsByNode.set(row.node_id, set);
	}

	const selectedTeamIds = new Set(
		(teams ?? []).filter((t: any) => t.team_group_id === selectedTeamGroupId).map((t: any) => t.id)
	);

	const courses = (nodes ?? [])
		.filter((n: any) => {
			const tgTargets = tgTargetsByNode.get(n.id) ?? new Set();
			const tTargets = teamTargetsByNode.get(n.id) ?? new Set();
			if (selectedTeamGroupId && tgTargets.has(selectedTeamGroupId)) return true;
			for (const tid of selectedTeamIds) if (tTargets.has(tid)) return true;
			return false;
		})
		.map((n: any) => ({
			id: n.id,
			title: n.title,
			slug: n.slug,
			subteam_id: n.subteam_id,
			status: statusByNode.get(String(n.id)) ?? 'not_started'
		}));

	const completedCount = courses.filter((c) => c.status === 'completed').length;
	const inProgressCount = courses.filter((c) => c.status === 'in_progress' || c.status === 'quiz_pending' || c.status === 'awaiting_checkoff').length;

	const segmentCompletions = (blockProgress ?? []).filter((p: any) => p.completed_at).length;
	const totalHours = (attendanceSum ?? []).reduce((sum: number, row: any) => sum + Number(row.duration_hours ?? 0), 0);
	const rrTotal = segmentCompletions * 3 + Math.floor(totalHours) * 2;

	let leadPages: any[] = [];
	if (selectedTeamGroupId) {
		const subteamIds = (subteams ?? []).map((s: any) => s.id);
		const { data: pages } = await locals.supabase
			.from('pages')
			.select('id,scope_kind,scope_id,title,slug,kind,redirect_url,sort_order')
			.or(`and(scope_kind.eq.team_group,scope_id.eq.${selectedTeamGroupId})${subteamIds.length ? `,and(scope_kind.eq.subteam,scope_id.in.(${subteamIds.join(',')}))` : ''}`)
			.order('scope_kind')
			.order('sort_order');
		leadPages = pages ?? [];
	}

	return {
		myTeamGroups,
		selectedTeamGroup,
		selectedTeamGroupId,
		courses,
		completedCount,
		inProgressCount,
		totalCount: courses.length,
		segmentCompletions,
		totalHours,
		rrTotal,
		leadPages,
		nodes: nodes ?? [],
		nodeStatuses: nodeStatuses ?? [],
		nodePrereqs: nodePrereqs ?? []
	};
};
