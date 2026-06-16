<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// Steps the user clicked the link for in *this* session. Used to flip the
	// confirmation checkbox on immediately rather than waiting for a reload to
	// pick up the server-side `link_clicked_at` write.
	let locallyClickedStepIds = $state<Set<string>>(new Set());

	type Step = {
		id: string;
		position: number;
		kind: 'welcome' | 'team_pick' | 'external_link' | 'content';
		title: string;
		body: string;
		link_url: string;
		requires_link_click: boolean;
		requires_checkbox: boolean;
	};
	type Progress = {
		step_id: string;
		link_clicked_at: string | null;
		completed_at: string | null;
	};

	const steps = $derived((data.steps ?? []) as Step[]);
	const progress = $derived((data.progress ?? []) as Progress[]);
	const progressById = $derived(new Map(progress.map((p) => [String(p.step_id), p])));
	const currentStep = $derived(data.currentStep as Step | null);
	const previewing = $derived(Boolean(data.previewing));
	const currentIndex = $derived(
		currentStep
			? Math.max(
					0,
					steps.findIndex((s) => s.id === currentStep.id)
				)
			: 0
	);
	const totalSteps = $derived(steps.length);

	const currentProgress = $derived.by(() => {
		if (!currentStep) return null;
		return progressById.get(String(currentStep.id)) ?? null;
	});

	let confirmedBox = $state(false);
	$effect(() => {
		confirmedBox = false;
		void currentStep?.id;
	});

	// Team picker reactive state (for the team_pick step kind)
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
		const allowedSubteamIds =
			linkedSubteamIdsByMainTeam.get(String(selectedPrimaryTeamGroupId)) ?? new Set<string>();
		for (const category of requiredCategories) {
			const categorySlug = String(category.slug);
			map.set(
				categorySlug,
				(data.subteams as any[]).filter(
					(subteam) =>
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
			if (
				!linkedSubteamIdsByMainTeam
					.get(String(selectedPrimaryTeamGroupId))
					?.has(String(row.team_id))
			)
				continue;
			return String(row.team_id);
		}
		return '';
	};
</script>

<div class="flex min-h-[50vh] items-center justify-center px-4">
	<div class="fade-up w-full max-w-2xl space-y-5">
		<div class="aurora-border">
			<div
				class="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			>
				<div
					class="pointer-events-none absolute inset-0 rounded-2xl"
					style="background: var(--app-glass-shine);"
				></div>
				<div class="relative space-y-2">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="eyebrow-label">Getting Started</p>
							<h1 class="gradient-text text-2xl font-bold tracking-tight">Onboarding</h1>
						</div>
						{#if previewing}
							<span
								class="rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
								style="border-color: color-mix(in srgb, var(--app-accent) 40%, transparent); background: color-mix(in srgb, var(--app-accent) 14%, transparent); color: var(--app-accent);"
								>Admin preview</span
							>
						{/if}
					</div>
					{#if totalSteps > 0}
						<div class="pt-2">
							<div class="aurora-progress">
								<div
									class="aurora-progress-fill"
									style="width: {Math.max(10, ((currentIndex + 1) / totalSteps) * 100)}%;"
								></div>
							</div>
							<p class="mono mt-1.5 text-xs" style="color: var(--app-text-dim);">
								Step {currentIndex + 1} of {totalSteps}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if form?.error}
			<div
				class="fade-up rounded-xl border p-3 text-sm"
				style="background: color-mix(in srgb, var(--app-danger) 12%, transparent); border-color: color-mix(in srgb, var(--app-danger) 30%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);"
			>
				{form.error}
			</div>
		{/if}

		<div
			class="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<div
				class="pointer-events-none absolute inset-0 rounded-2xl"
				style="background: var(--app-glass-shine);"
			></div>

			{#if !currentStep}
				<p class="text-sm" style="color: var(--app-text-muted);">
					Onboarding has no steps configured. Ask an admin to set them up at /admin/onboarding.
				</p>
			{:else}
				<div class="relative space-y-4">
					<header>
						<h2 class="text-lg font-bold tracking-tight" style="color: var(--app-text);">
							{currentStep.title}
						</h2>
						{#if currentStep.body}
							<p class="mt-1 text-sm whitespace-pre-wrap" style="color: var(--app-text-muted);">
								{currentStep.body}
							</p>
						{/if}
					</header>

					{#if currentStep.kind === 'welcome' || currentStep.kind === 'content'}
						<form method="POST" action="?/markComplete">
							<input type="hidden" name="step_id" value={currentStep.id} />
							<Button
								variant="primary"
								type="submit"
								class="w-full"
								size="lg"
								disabled={previewing}
							>
								Continue
							</Button>
						</form>
					{:else if currentStep.kind === 'team_pick'}
						<form method="POST" action="?/save" class="space-y-4">
							<input type="hidden" name="step_id" value={currentStep.id} />
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
									{#each data.teams as team}
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
											<option
												value={subteam.id}
												selected={currentTeamIdForCategory(categorySlug) === subteam.id}
											>
												{subteam.name}
											</option>
										{/each}
									</select>
								</label>
							{/each}
							<Button
								variant="primary"
								type="submit"
								class="w-full"
								size="lg"
								disabled={previewing}
							>
								Save and continue
							</Button>
						</form>
					{:else if currentStep.kind === 'external_link'}
						{@const linkClicked =
							Boolean(currentProgress?.link_clicked_at) ||
							locallyClickedStepIds.has(currentStep.id)}
						{@const stepIdForLink = currentStep.id}
						<div class="space-y-3">
							{#if currentStep.link_url}
								<a
									href={currentStep.link_url}
									target="_blank"
									rel="noopener noreferrer"
									class="aurora-border block"
									onclick={async () => {
										if (previewing) return;
										// Optimistic UI: enable the checkbox the instant the link is
										// clicked, before the round trip finishes. The server write +
										// invalidateAll() keep the persisted state correct.
										locallyClickedStepIds = new Set([...locallyClickedStepIds, stepIdForLink]);
										const body = new FormData();
										body.set('step_id', stepIdForLink);
										try {
											await fetch('?/trackLinkClick', { method: 'POST', body });
											await invalidateAll();
										} catch {
											/* best-effort; the URL still opens */
										}
									}}
								>
									<span
										class="block rounded-[14px] px-4 py-3 text-center text-sm font-semibold"
										style="background: var(--app-surface); color: var(--app-text);"
									>
										Open {currentStep.link_url.replace(/^https?:\/\//, '').split('/')[0]} ↗
									</span>
								</a>
								{#if linkClicked}
									<p class="text-xs" style="color: var(--app-success);">✓ Link opened</p>
								{/if}
							{/if}

							<form method="POST" action="?/markComplete" class="space-y-3">
								<input type="hidden" name="step_id" value={currentStep.id} />
								{#if currentStep.requires_checkbox}
									<label
										class="flex items-start gap-3 rounded-xl border p-3"
										style="border-color: var(--app-glass-border); background: var(--app-glass-bg);"
									>
										<input
											type="checkbox"
											bind:checked={confirmedBox}
											disabled={currentStep.requires_link_click && !linkClicked}
											class="mt-0.5 accent-purple-500"
										/>
										<span class="text-sm" style="color: var(--app-text);">
											I signed up.
											{#if currentStep.requires_link_click && !linkClicked}
												<span class="block text-xs" style="color: var(--app-text-dim);">
													Open the link above first.
												</span>
											{/if}
										</span>
									</label>
								{/if}
								<Button
									variant="primary"
									type="submit"
									class="w-full"
									size="lg"
									disabled={previewing ||
										(currentStep.requires_checkbox && !confirmedBox) ||
										(currentStep.requires_link_click && !linkClicked)}
								>
									Mark done and continue
								</Button>
							</form>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
