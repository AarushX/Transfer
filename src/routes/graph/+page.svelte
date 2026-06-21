<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';

	let { data } = $props();

	type NodeTeamTarget = { node_id: string; team_id: string };
	type NodeTeamGroupTarget = { node_id: string; team_group_id: string };
	type ProfileTeam = { team_id: string; team_group_id?: string | null; category_slug?: string | null };

	// Build lookup maps
	const targetTeamIdsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of (data.nodeTeamTargets as NodeTeamTarget[]) ?? []) {
			const set = map.get(String(row.node_id)) ?? new Set<string>();
			set.add(String(row.team_id));
			map.set(String(row.node_id), set);
		}
		return map;
	});
	const targetTeamGroupIdsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of (data.nodeTeamGroupTargets as NodeTeamGroupTarget[]) ?? []) {
			const set = map.get(String(row.node_id)) ?? new Set<string>();
			set.add(String(row.team_group_id));
			map.set(String(row.node_id), set);
		}
		return map;
	});

	const userTeamIds = $derived(
		new Set(((data.profileTeams as ProfileTeam[]) ?? []).map((r) => String(r.team_id)))
	);
	const userTeamGroupIds = $derived(
		new Set(
			[
				...((data.profileTeamGroups as Array<{ team_group_id: string }>) ?? []).map((r) =>
					String(r.team_group_id)
				),
				String((data as any).primaryTeamGroupId ?? '')
			].filter(Boolean)
		)
	);

	const teamColorById = $derived(
		new Map(
			((data.teams as Array<{ id: string; color_hex?: string | null }>) ?? []).map((r) => [
				String(r.id),
				String(r.color_hex ?? '')
			])
		)
	);

	// All unique team groups that have nodes
	type TeamGroupRow = { id: string; name?: string | null; color_hex?: string | null };
	const allTeamGroups = $derived(
		(data.teamGroups as TeamGroupRow[]).filter((tg) => {
			const tgId = String(tg.id);
			return (data.nodeTeamGroupTargets as NodeTeamGroupTarget[]).some(
				(r) => String(r.team_group_id) === tgId
			);
		})
	);

	// Selected filter — null = user's teams, string = specific team group id
	let filterGroupId = $state<string | null>(null);

	const activeGroupIds = $derived(
		filterGroupId ? new Set([filterGroupId]) : userTeamGroupIds
	);

	const filteredNodes = $derived(
		(data.nodes as Array<{ id: string; title: string; slug: string }>).filter((n) => {
			const teamTargets = targetTeamIdsByNode.get(String(n.id));
			const groupTargets = targetTeamGroupIdsByNode.get(String(n.id));
			if (!teamTargets?.size && !groupTargets?.size) return false;
			for (const gid of activeGroupIds) {
				if (groupTargets?.has(gid)) return true;
			}
			// Also include nodes targeted at teams within the active group
			for (const teamId of userTeamIds) {
				if (teamTargets?.has(teamId)) {
					const team = (data.teams as Array<{ id: string; team_group_id?: string | null }>).find(
						(t) => String(t.id) === teamId
					);
					if (team && activeGroupIds.has(String(team.team_group_id ?? ''))) return true;
				}
			}
			return false;
		})
	);

	const filteredScope = $derived(new Set(filteredNodes.map((n) => String(n.id))));

	const subteamByNode = $derived.by(() => {
		const out: Record<string, string> = {};
		for (const node of filteredNodes) {
			const targets = targetTeamIdsByNode.get(String(node.id));
			if (targets) {
				for (const teamId of userTeamIds) {
					if (targets.has(teamId)) {
						out[String(node.id)] = teamId;
						break;
					}
				}
			}
		}
		return out;
	});

	const teamColorMap = $derived.by(() => {
		const out: Record<string, string> = {};
		for (const [id, color] of teamColorById.entries()) {
			if (color) out[id] = color;
		}
		return out;
	});
</script>

<div class="flex h-[calc(100dvh-5rem)] flex-col gap-3 md:h-[calc(100dvh-4rem)]">
	<!-- Header + filter chips -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-bold tracking-tight" style="color: var(--app-text);">Skill map</h1>
			<p class="text-[12px]" style="color: var(--app-text-dim);">
				{filteredNodes.length} skill{filteredNodes.length !== 1 ? 's' : ''}
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={() => (filterGroupId = null)}
				class="rounded-full border px-3 py-1 text-[12px] font-bold transition-colors"
				style="background: {filterGroupId === null
					? 'var(--app-accent)'
					: 'var(--app-surface)'}; border-color: {filterGroupId === null
					? 'var(--app-accent)'
					: 'var(--app-border)'}; color: {filterGroupId === null
					? 'white'
					: 'var(--app-text-muted)'};"
			>
				My teams
			</button>
			{#each allTeamGroups as tg}
				<button
					type="button"
					onclick={() => (filterGroupId = filterGroupId === String(tg.id) ? null : String(tg.id))}
					class="rounded-full border px-3 py-1 text-[12px] font-bold transition-colors"
					style="background: {filterGroupId === String(tg.id)
						? (tg.color_hex ?? 'var(--app-accent)')
						: 'var(--app-surface)'}; border-color: {filterGroupId === String(tg.id)
						? (tg.color_hex ?? 'var(--app-accent)')
						: 'var(--app-border)'}; color: {filterGroupId === String(tg.id)
						? 'white'
						: 'var(--app-text-muted)'};"
				>
					{tg.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Full-height skill tree -->
	<div class="min-h-0 flex-1">
		<SkillTree
			nodes={data.nodes}
			statuses={data.statuses}
			prerequisites={data.prerequisites}
			scope={filteredScope}
			{subteamByNode}
			teamColors={teamColorMap}
			clickHrefBase="/learn/"
		/>
	</div>
</div>
