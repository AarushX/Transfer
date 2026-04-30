import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadTrainingCategories } from '$lib/server/training-categories';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const [
		nodesResp,
		statusesResp,
		subteamsResp,
		profileTeamsResp,
		profileTeamGroupsResp,
		nodeTeamTargetsResp,
		nodeTeamGroupTargetsResp,
		prereqResp,
		reviewResp,
		blockRowsResp,
		blockProgressResp,
		trainingData,
		coursesDashboard,
		requiredCategoriesResp,
		teamGroupsResp,
		teamsResp,
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
		locals.supabase.from('subteams').select('id,name,slug').order('name'),
		locals.supabase
			.from('profile_teams')
			.select('team_id,team_group_id,category_slug')
			.eq('user_id', user.id),
		locals.supabase
			.from('profile_teams')
			.select('team_group_id,team_groups(designator)')
			.eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase
			.from('checkoff_reviews')
			.select('node_id,status,updated_at')
			.eq('user_id', user.id)
			.in('status', ['needs_review', 'blocked']),
		locals.supabase.from('node_blocks').select('node_id,id'),
		locals.supabase
			.from('user_node_block_progress')
			.select('node_id,block_id,completed_at')
			.eq('user_id', user.id),
		loadTrainingCategories(locals.supabase),
		loadStudentCoursesDashboard(locals.supabase, user.id),
		locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding,sort_order')
			.eq('is_required_onboarding', true),
		locals.supabase.from('team_groups').select('id,name,color_hex'),
		locals.supabase.from('teams').select('id,name,color_hex,category_slug,team_group_id'),
		locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', user.id).maybeSingle()
	]);

	return {
		profile,
		nodes: nodesResp.data ?? [],
		statuses: statusesResp.data ?? [],
		subteams: subteamsResp.data ?? [],
		profileTeams: profileTeamsResp.data ?? [],
		profileTeamGroups: profileTeamGroupsResp.data ?? [],
		nodeTeamTargets: nodeTeamTargetsResp.data ?? [],
		nodeTeamGroupTargets: nodeTeamGroupTargetsResp.data ?? [],
		prerequisites: prereqResp.data ?? [],
		checkoffReviews: reviewResp.data ?? [],
		blockRows: blockRowsResp.data ?? [],
		blockProgress: blockProgressResp.data ?? [],
		trainingCategories: trainingData.categories,
		nodeCategories: trainingData.nodeCategories,
		coursesDashboard,
		teamGroups: teamGroupsResp.data ?? [],
		teams: teamsResp.data ?? [],
		primaryTeamGroupId: primaryTeamResp.data?.team_group_id ?? '',
		requiredOnboardingCategories: requiredCategoriesResp.data ?? []
	};
};
