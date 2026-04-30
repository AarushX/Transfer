import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const teamFilter = url.searchParams.get('team') ?? '';
	const q = url.searchParams.get('q') ?? '';

	const { data: teams } = await locals.supabase
		.from('teams')
		.select('id,name,slug,team_groups(name,slug)')
		.order('name');

	let query = locals.supabase
		.from('nodes')
		.select('id,title,slug')
		.order('title', { ascending: true });

	if (q) query = query.ilike('title', `%${q}%`);

	const { data: nodes } = await query;
	const { data: nodeTargets } = await locals.supabase.from('node_team_targets').select('node_id,team_id');

	const teamIdsByNode = new Map<string, Set<string>>();
	for (const row of nodeTargets ?? []) {
		const set = teamIdsByNode.get(String(row.node_id)) ?? new Set<string>();
		set.add(String(row.team_id));
		teamIdsByNode.set(String(row.node_id), set);
	}
	const filteredNodes =
		teamFilter && teamFilter.trim()
			? (nodes ?? []).filter((node: any) => teamIdsByNode.get(String(node.id))?.has(teamFilter))
			: nodes ?? [];

	return {
		teams: teams ?? [],
		nodes: filteredNodes,
		nodeTargets: nodeTargets ?? [],
		filter: { team: teamFilter, q }
	};
};
