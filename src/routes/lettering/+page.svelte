<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	type Requirement = {
		id: string;
		season_id: string;
		category: string;
		label: string;
		required_value: number;
		sort_order: number;
	};

	let { data } = $props();

	const season = $derived(data.season as { id: string; label: string; start_date: string; end_date: string } | null);
	const requirements = $derived((data.requirements ?? []) as Requirement[]);
	const progress = $derived((data.progress ?? {}) as Record<string, number>);

	const metCount = $derived(
		requirements.filter((r) => (progress[r.category] ?? 0) >= r.required_value).length
	);
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-5 p-4">
	<PageHeader
		title="Lettering Progress"
		description={season ? season.label : ''}
	/>

	{#if !season}
		<GlassCard>
			<p class="text-center text-sm" style="color: var(--app-text-muted);">
				No active lettering season.
			</p>
		</GlassCard>
	{:else}
		{#each requirements as req (req.id)}
			{@const current = progress[req.category] ?? 0}
			{@const met = current >= req.required_value}
			<GlassCard>
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium" style="color: var(--app-text);">
							{req.label}
						</span>
						{#if met}
							<span
								class="rounded-full px-2 py-0.5 text-xs font-semibold"
								style="background: color-mix(in srgb, var(--app-success) 20%, transparent); color: var(--app-success);"
							>
								Complete
							</span>
						{/if}
					</div>
					<ProgressBar
						value={current}
						max={req.required_value}
						color={met ? 'var(--app-success)' : undefined}
						size="md"
						showPercent={true}
					/>
					<p class="text-xs" style="color: var(--app-text-muted);">
						{current} / {req.required_value} {req.category.includes('hour') ? 'hours' : req.category.includes('attendance') ? 'events' : 'hours'}
					</p>
				</div>
			</GlassCard>
		{/each}

		<!-- Summary -->
		<GlassCard>
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium" style="color: var(--app-text);">
					Requirements Met
				</span>
				<span
					class="text-sm font-semibold"
					style="color: {metCount === requirements.length ? 'var(--app-success)' : 'var(--app-accent)'};"
				>
					{metCount} of {requirements.length}
				</span>
			</div>
			{#if metCount === requirements.length && requirements.length > 0}
				<p class="mt-2 text-center text-xs font-medium" style="color: var(--app-success);">
					All lettering requirements met!
				</p>
			{/if}
		</GlassCard>

		<!-- Action buttons -->
		<div class="flex flex-wrap gap-3">
			<Button variant="primary" href="/outreach">Log Outreach Hours</Button>
			<Button variant="secondary" href="/outreach">View Competitions</Button>
		</div>
	{/if}
</div>
