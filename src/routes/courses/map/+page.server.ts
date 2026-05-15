import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isMentor } from '$lib/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const scope = url.searchParams.get('scope') ?? (isMentor(profile) ? 'all' : 'user');

	const [{ data: nodes }, { data: prerequisites }, { data: statuses }, { data: profileTeams }, { data: profilePrimaryTeam }] = await Promise.all([
		locals.supabase.from('nodes').select('id,title,slug'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('profile_teams').select('team_id,team_group_id').eq('user_id', user.id),
		locals.supabase
			.from('profile_primary_teams')
			.select('team_group_id')
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	let scopeNodeIds: string[] | undefined;
	if (scope === 'user') {
		const teamIds = (profileTeams ?? []).map((r: any) => String(r.team_id));
		const groupIds = [
			...(profileTeams ?? []).map((r: any) => String(r.team_group_id ?? '')),
			String((profilePrimaryTeam as any)?.team_group_id ?? '')
		].filter(Boolean);
		const [{ data: tnodes }, { data: gnodes }] = await Promise.all([
			teamIds.length > 0
				? locals.supabase.from('node_team_targets').select('node_id').in('team_id', teamIds)
				: Promise.resolve({ data: [] as any[] }),
			groupIds.length > 0
				? locals.supabase
						.from('node_team_group_targets')
						.select('node_id')
						.in('team_group_id', groupIds)
				: Promise.resolve({ data: [] as any[] })
		]);
		scopeNodeIds = Array.from(
			new Set([
				...(tnodes ?? []).map((r: any) => String(r.node_id)),
				...(gnodes ?? []).map((r: any) => String(r.node_id))
			])
		);
	} else if (scope.startsWith('team:')) {
		const teamId = scope.slice('team:'.length);
		if (teamId) {
			const { data } = await locals.supabase
				.from('node_team_targets')
				.select('node_id')
				.eq('team_id', teamId);
			scopeNodeIds = (data ?? []).map((r: any) => String(r.node_id));
		} else {
			scopeNodeIds = [];
		}
	} else if (scope.startsWith('teamgroup:')) {
		const tgId = scope.slice('teamgroup:'.length);
		if (tgId) {
			const { data } = await locals.supabase
				.from('node_team_group_targets')
				.select('node_id')
				.eq('team_group_id', tgId);
			scopeNodeIds = (data ?? []).map((r: any) => String(r.node_id));
		} else {
			scopeNodeIds = [];
		}
	} else {
		// 'all' or unrecognized → no filter
		scopeNodeIds = undefined;
	}

	return {
		nodes: nodes ?? [],
		prerequisites: prerequisites ?? [],
		statuses: statuses ?? [],
		scopeNodeIds,
		scope,
		canEdit: isMentor(profile)
	};
};
