<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
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
	<GlassCard>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Onboarding</h1>
		<p class="text-sm" style="color: var(--app-text-muted);">Choose your team and subteam to unlock your required courses.</p>
	</GlassCard>

	{#if form?.error}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{/if}

	<form method="POST" action="?/save" class="space-y-3 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text-muted);">Main team</span>
			<select class="rounded px-2 py-2" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" name="primary_team_group_id" bind:value={selectedPrimaryTeamGroupId} required>
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
				<span style="color: var(--app-text-muted);">{category.name} subteam</span>
				<select class="rounded px-2 py-2" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" name={`team_id_${categorySlug}`} required>
					<option value="">Select {String(category.name).toLowerCase()} subteam</option>
					{#each options as subteam}
						<option value={subteam.id} selected={currentTeamIdForCategory(categorySlug) === subteam.id}>
							{subteam.name}
						</option>
					{/each}
				</select>
			</label>
		{/each}
		<Button variant="primary" type="submit">Continue</Button>
	</form>
</section>
