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

	const totalSteps = $derived(requiredCategories.length + 1);
</script>

<div class="flex min-h-[50vh] items-center justify-center px-4">
	<div class="fade-up w-full max-w-xl space-y-5">
		<!-- Header card -->
		<div class="aurora-border">
			<div class="relative overflow-hidden rounded-2xl border backdrop-blur-xl p-5" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
				<div class="relative space-y-2">
					<p class="eyebrow-label">Getting Started</p>
					<h1 class="gradient-text text-2xl font-bold tracking-tight">Onboarding</h1>
					<p class="text-sm" style="color: var(--app-text-muted);">Choose your team and subteam to unlock your required courses.</p>

					<!-- Step progress bar -->
					<div class="pt-2">
						<div class="aurora-progress">
							<div class="aurora-progress-fill" style="width: {Math.max(10, (1 / totalSteps) * 100)}%;"></div>
						</div>
						<p class="mt-1.5 text-xs mono" style="color: var(--app-text-dim);">Step 1 of {totalSteps}</p>
					</div>
				</div>
			</div>
		</div>

		{#if form?.error}
			<div class="fade-up rounded-xl border p-3 text-sm" style="background: color-mix(in srgb, var(--app-danger) 12%, transparent); border-color: color-mix(in srgb, var(--app-danger) 30%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);">
				{form.error}
			</div>
		{/if}

		<!-- Form card -->
		<div class="relative overflow-hidden rounded-2xl border backdrop-blur-xl p-5" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<form method="POST" action="?/save" class="relative space-y-4">
				<label class="flex flex-col gap-1.5 text-sm">
					<span class="eyebrow-label">Main team</span>
					<select
						class="w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="primary_team_group_id"
						bind:value={selectedPrimaryTeamGroupId}
						required
					>
						<option value="">Select main team</option>
						{#each teamGroups as team}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</label>
				{#each requiredCategories as category}
					{@const categorySlug = String(category.slug)}
					{@const options = subteamsByDesignator.get(categorySlug) ?? []}
					<label class="flex flex-col gap-1.5 text-sm">
						<span class="eyebrow-label">{category.name} subteam</span>
						<select
							class="w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
							style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
							name={`team_id_${categorySlug}`}
							required
						>
							<option value="">Select {String(category.name).toLowerCase()} subteam</option>
							{#each options as subteam}
								<option value={subteam.id} selected={currentTeamIdForCategory(categorySlug) === subteam.id}>
									{subteam.name}
								</option>
							{/each}
						</select>
					</label>
				{/each}
				<div class="pt-1">
					<Button variant="primary" type="submit" class="w-full" size="lg">Continue</Button>
				</div>
			</form>
		</div>
	</div>
</div>
