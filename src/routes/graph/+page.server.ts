import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	if (profile?.is_parent_guardian) throw redirect(303, '/parent/dashboard');

	const [
		nodesResp,
		statusesResp,
		nodeTeamTargetsResp,
		nodeTeamGroupTargetsResp,
		prereqResp,
		teamsResp,
		teamGroupsResp,
		profileTeamsResp,
		profileTeamGroupsResp,
		primaryTeamResp
	] = await Promise.all([
		locals.supabase
			.from('nodes')
			.select('id,title,slug,subteam_id,video_url')
			.order('title', { ascending: true }),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase.from('teams').select('id,name,color_hex,category_slug,team_group_id'),
		locals.supabase.from('team_groups').select('id,name,color_hex'),
		locals.supabase
			.from('profile_teams')
			.select('team_id,team_group_id,category_slug')
			.eq('user_id', user.id),
		locals.supabase
			.from('profile_teams')
			.select('team_group_id,team_groups(designator)')
			.eq('user_id', user.id),
		locals.supabase
			.from('profile_primary_teams')
			.select('team_group_id')
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	return {
		nodes: nodesResp.data ?? [],
		statuses: statusesResp.data ?? [],
		nodeTeamTargets: nodeTeamTargetsResp.data ?? [],
		nodeTeamGroupTargets: nodeTeamGroupTargetsResp.data ?? [],
		prerequisites: prereqResp.data ?? [],
		teams: teamsResp.data ?? [],
		teamGroups: teamGroupsResp.data ?? [],
		profileTeams: profileTeamsResp.data ?? [],
		profileTeamGroups: profileTeamGroupsResp.data ?? [],
		primaryTeamGroupId: primaryTeamResp.data?.team_group_id ?? null
	};
};
