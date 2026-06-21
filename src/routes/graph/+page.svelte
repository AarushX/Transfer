<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';

	let { data } = $props();

	type NodeTeamTarget = { node_id: string; team_id: string };
	type NodeTeamGroupTarget = { node_id: string; team_group_id: string };
	type ProfileTeam = { team_id: string; team_group_id?: string | null; category_slug?: string | null };
	type TeamRow = { id: string; name?: string | null; color_hex?: string | null; team_group_id?: string | null };
	type TeamGroupRow = { id: string; name?: string | null; color_hex?: string | null };

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
			((data.teams as TeamRow[]) ?? []).map((r) => [String(r.id), String(r.color_hex ?? '')])
		)
	);

	// Team groups the user belongs to
	const userTeamGroups = $derived(
		(data.teamGroups as TeamGroupRow[]).filter((tg) => userTeamGroupIds.has(String(tg.id)))
	);

	// Individual subteams the user belongs to, grouped by their team_group_id
	const userSubteams = $derived(
		(data.teams as TeamRow[]).filter((t) => userTeamIds.has(String(t.id)))
	);

	// Filter mode: { type: 'group', id } | { type: 'team', id }
	// Default to the first group the user belongs to
	type FilterMode = { type: 'group'; id: string } | { type: 'team'; id: string };
	let filter = $state<FilterMode>({ type: 'group', id: userTeamGroups[0] ? String(userTeamGroups[0].id) : '' });

	const filteredNodes = $derived.by(() => {
		const nodes = data.nodes as Array<{ id: string; title: string; slug: string }>;
		if (filter.type === 'group') {
			// Show nodes targeting this group directly, OR targeting any team within this group that the user belongs to
			return nodes.filter((n) => {
				const groupTargets = targetTeamGroupIdsByNode.get(String(n.id));
				if (groupTargets?.has(filter.id)) return true;
				const teamTargets = targetTeamIdsByNode.get(String(n.id));
				if (!teamTargets?.size) return false;
				for (const teamId of userTeamIds) {
					if (teamTargets.has(teamId)) {
						const team = (data.teams as TeamRow[]).find((t) => String(t.id) === teamId);
						if (team && String(team.team_group_id ?? '') === filter.id) return true;
					}
				}
				return false;
			});
		} else {
			// Show nodes targeting this specific subteam, or the parent group of this subteam
			const team = (data.teams as TeamRow[]).find((t) => String(t.id) === filter.id);
			const parentGroupId = team ? String(team.team_group_id ?? '') : '';
			return nodes.filter((n) => {
				const teamTargets = targetTeamIdsByNode.get(String(n.id));
				if (teamTargets?.has(filter.id)) return true;
				// Also include group-wide nodes that cover this subteam's parent group
				if (parentGroupId) {
					const groupTargets = targetTeamGroupIdsByNode.get(String(n.id));
					if (groupTargets?.has(parentGroupId)) return true;
				}
				return false;
			});
		}
	});

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

	function chipActive(f: FilterMode): boolean {
		return f.type === filter.type && f.id === filter.id;
	}
	function chipStyle(f: FilterMode, color?: string | null) {
		const active = chipActive(f);
		const bg = color ?? 'var(--app-accent)';
		return `background: ${active ? bg : 'var(--app-surface)'}; border-color: ${active ? bg : 'var(--app-border)'}; color: ${active ? 'white' : 'var(--app-text-muted)'};`;
	}
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
			<!-- Team group chips (main teams) -->
			{#each userTeamGroups as tg}
				<button
					type="button"
					onclick={() => (filter = { type: 'group', id: String(tg.id) })}
					class="rounded-full border px-3 py-1 text-[12px] font-bold transition-colors"
					style={chipStyle({ type: 'group', id: String(tg.id) }, tg.color_hex)}
				>
					{tg.name}
				</button>
				<!-- Subteams within this group -->
				{#each userSubteams.filter((t) => String(t.team_group_id) === String(tg.id)) as team}
					<button
						type="button"
						onclick={() => (filter = { type: 'team', id: String(team.id) })}
						class="rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
						style={chipStyle({ type: 'team', id: String(team.id) }, team.color_hex)}
					>
						{team.name}
					</button>
				{/each}
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
