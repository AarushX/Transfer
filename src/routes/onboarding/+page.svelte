<script lang="ts">
	let { data, form } = $props();
	const currentByGroup = $derived(
		new Map((data.current as any[]).map((row: any) => [String(row.team_group_id), String(row.team_id)]))
	);
	const teamGroups = $derived((data.teams as any[]) ?? []);
	const subteams = $derived((data.subteams as any[]) ?? []);
	let selectedPrimaryTeamGroupId = $state('');
	$effect(() => {
		if (selectedPrimaryTeamGroupId) return;
		const currentPrimary = String((data as any).currentPrimaryTeamGroupId ?? '');
		if (currentPrimary) {
			selectedPrimaryTeamGroupId = currentPrimary;
			return;
		}
		const firstMainTeam = String((data.teams as any[])[0]?.id ?? '');
		if (firstMainTeam) selectedPrimaryTeamGroupId = firstMainTeam;
	});
	const linkedSubteamIdsByMainTeam = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of data.subteamLinks as Array<{ team_group_id: string; team_id: string }>) {
			const set = map.get(String(row.team_group_id)) ?? new Set<string>();
			set.add(String(row.team_id));
			map.set(String(row.team_group_id), set);
		}
		return map;
	});
	const requiredCategories = $derived((data.requiredCategories as any[]) ?? []);
	const subteamsByDesignator = $derived.by(() => {
		const map = new Map<string, any[]>();
		const allowedSubteamIds = linkedSubteamIdsByMainTeam.get(String(selectedPrimaryTeamGroupId)) ?? new Set<string>();
		for (const category of requiredCategories) {
			const categorySlug = String(category.slug);
			map.set(
				categorySlug,
				subteams.filter((subteam) =>
					allowedSubteamIds.has(String(subteam.id)) &&
					String(subteam.category_slug ?? '') === categorySlug
				)
			);
		}
		return map;
	});
	const currentTeamIdForCategory = (categorySlug: string) => {
		for (const row of data.current as any[]) {
			if (String(row.category_slug ?? '') !== categorySlug) continue;
			if (!linkedSubteamIdsByMainTeam.get(String(selectedPrimaryTeamGroupId))?.has(String(row.team_id))) continue;
			return String(row.team_id);
		}
		return '';
	};
</script>

<section class="mx-auto max-w-xl space-y-4">
	<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
		<h1 class="text-2xl font-semibold">Onboarding</h1>
		<p class="text-sm text-slate-400">Choose your team and subteam to unlock your required courses.</p>
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}

	<form method="POST" action="?/save" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Main team</span>
			<select class="rounded bg-slate-800 px-2 py-2" name="primary_team_group_id" bind:value={selectedPrimaryTeamGroupId} required>
				<option value="">Select main team</option>
				{#each teamGroups as team}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
		</label>
		{#each requiredCategories as category}
			{@const categorySlug = String(category.slug)}
			{@const options = subteamsByDesignator.get(categorySlug) ?? []}
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">{category.name} subteam</span>
				<select class="rounded bg-slate-800 px-2 py-2" name={`team_id_${categorySlug}`} required>
					<option value="">Select {String(category.name).toLowerCase()} subteam</option>
					{#each options as subteam}
						<option value={subteam.id} selected={currentTeamIdForCategory(categorySlug) === subteam.id}>
							{subteam.name}
						</option>
					{/each}
				</select>
			</label>
		{/each}
		<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Continue</button>
	</form>
</section>
