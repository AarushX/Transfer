import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';
import { isParentGuardian } from '$lib/roles';

type Node = {
	id: string;
	title: string;
	slug: string;
	subteam_id: string | null;
	code: string | null;
	proficiency_level: 'beginner' | 'intermediate' | 'advanced' | null;
	description: string | null;
};

export type CatalogCourse = {
	nodeId: string;
	title: string;
	slug: string;
	code: string | null;
	proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | null;
	description: string;
	subteamIds: string[];
	teamGroupIds: string[];
	status: string;
	isRequired: boolean;
	href: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	if (isParentGuardian(profile)) throw redirect(303, '/dashboard');

	const [coursesDashboard, profileTeamsResp] = await Promise.all([
		loadStudentCoursesDashboard(locals.supabase, user.id),
		locals.supabase.from('profile_teams').select('team_id,team_group_id').eq('user_id', user.id)
	]);

	const userTeamIds = new Set((profileTeamsResp.data ?? []).map((r: any) => String(r.team_id)));
	const userTeamGroupIds = new Set(
		(profileTeamsResp.data ?? []).map((r: any) => String(r.team_group_id))
	);

	if (userTeamIds.size === 0 && userTeamGroupIds.size === 0) {
		return {
			coursesDashboard,
			catalog: [] as CatalogCourse[],
			teams: [] as Array<{ id: string; name: string; color_hex: string; team_group_id: string }>,
			teamGroups: [] as Array<{ id: string; name: string; color_hex: string }>
		};
	}

	const [
		nodesResp,
		nodeTeamTargetsResp,
		nodeGroupTargetsResp,
		teamsResp,
		teamGroupsResp,
		certsResp
	] = await Promise.all([
		locals.supabase
			.from('nodes')
			.select('id,title,slug,subteam_id,code,proficiency_level,description'),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase
			.from('teams')
			.select('id,name,color_hex,team_group_id')
			.in(
				'id',
				Array.from(userTeamIds.size > 0 ? userTeamIds : ['00000000-0000-0000-0000-000000000000'])
			),
		locals.supabase
			.from('team_groups')
			.select('id,name,color_hex')
			.in(
				'id',
				Array.from(
					userTeamGroupIds.size > 0 ? userTeamGroupIds : ['00000000-0000-0000-0000-000000000000']
				)
			),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id)
	]);

	const allNodes: Node[] = (nodesResp.data ?? []) as Node[];
	const teamTargets = nodeTeamTargetsResp.data ?? [];
	const groupTargets = nodeGroupTargetsResp.data ?? [];

	const subteamsByNode = new Map<string, Set<string>>();
	for (const row of teamTargets) {
		const set = subteamsByNode.get(String(row.node_id)) ?? new Set<string>();
		set.add(String(row.team_id));
		subteamsByNode.set(String(row.node_id), set);
	}
	const groupsByNode = new Map<string, Set<string>>();
	for (const row of groupTargets) {
		const set = groupsByNode.get(String(row.node_id)) ?? new Set<string>();
		set.add(String(row.team_group_id));
		groupsByNode.set(String(row.node_id), set);
	}

	const statusByNode = new Map(
		(certsResp.data ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)])
	);

	const requiredNodeIds = new Set<string>();
	for (const cl of coursesDashboard.courseloads) {
		for (const c of cl.courses) if (c.required) requiredNodeIds.add(c.nodeId);
	}

	const catalog: CatalogCourse[] = [];
	for (const node of allNodes) {
		const subteamIds = Array.from(subteamsByNode.get(node.id) ?? []);
		const teamGroupIds = Array.from(groupsByNode.get(node.id) ?? []);
		const legacySubteam = node.subteam_id ? String(node.subteam_id) : null;

		const matchesUserSubteam =
			subteamIds.some((id) => userTeamIds.has(id)) ||
			(legacySubteam && userTeamIds.has(legacySubteam));
		const matchesUserGroup = teamGroupIds.some((id) => userTeamGroupIds.has(id));
		if (!matchesUserSubteam && !matchesUserGroup) continue;

		const combinedSubteams = new Set(subteamIds);
		if (legacySubteam) combinedSubteams.add(legacySubteam);

		catalog.push({
			nodeId: String(node.id),
			title: String(node.title ?? 'Course'),
			slug: String(node.slug ?? ''),
			code: node.code ?? null,
			proficiencyLevel: node.proficiency_level ?? null,
			description: String(node.description ?? ''),
			subteamIds: Array.from(combinedSubteams),
			teamGroupIds,
			status: statusByNode.get(String(node.id)) ?? 'locked',
			isRequired: requiredNodeIds.has(String(node.id)),
			href: `/learn/${node.slug}`
		});
	}

	return {
		coursesDashboard,
		catalog,
		teams: teamsResp.data ?? [],
		teamGroups: teamGroupsResp.data ?? []
	};
};
