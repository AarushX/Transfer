<script lang="ts">
	import { WORKFLOW_META } from '$lib/surveys/workflows';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
	const groupOrder = ['leadership', 'school', 'carpool', 'custom'] as const;
	type GroupKind = (typeof groupOrder)[number];
	const groupLabel = (kind: GroupKind) => (kind === 'custom' ? 'Other' : WORKFLOW_META[kind].label);

	const groups = $derived.by(() => {
		const rows = (data.surveys ?? []) as any[];
		return {
			leadership: rows.filter((row) => row.workflowKind === 'leadership'),
			school: rows.filter((row) => row.workflowKind === 'school'),
			carpool: rows.filter((row) => row.workflowKind === 'carpool'),
			custom: rows.filter((row) => row.workflowKind === 'custom')
		};
	});
</script>

<section class="space-y-6">
	<header class="fade-up">
		<a href="/dashboard" class="text-xs transition-colors" style="color: var(--app-text-dim);">← Dashboard</a>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight gradient-text">Applications & Signups</h1>
		<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">Apply for leadership, complete school intakes, and volunteer for carpooling.</p>
	</header>

	{#if (data.surveys ?? []).length === 0}
		<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 60ms;">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<p class="relative text-sm" style="color: var(--app-text-muted);">No surveys are available right now.</p>
		</div>
	{:else}
		{#each groupOrder as kind, gi}
			{#if groups[kind].length > 0}
				<div class="fade-up space-y-3" style="animation-delay: {60 + gi * 60}ms;">
					<p class="eyebrow-label">{groupLabel(kind)}</p>
					<div class="grid gap-3 md:grid-cols-2">
						{#each groups[kind] as survey, si (survey.id)}
							<div class="fade-up" style="animation-delay: {100 + gi * 60 + si * 40}ms;">
								<GlassCard hover>
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="font-medium" style="color: var(--app-text);">{survey.title}</h3>
											{#if survey.description}
												<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{survey.description}</p>
											{/if}
										</div>
										<span class="mono inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium {survey.capReached ? 'chip-amber' : 'chip-emerald'}">
											{survey.submissions}/{survey.maxSubmissions}
										</span>
									</div>
									<p class="mt-3 text-xs" style="color: var(--app-text-dim);">
										Window:
										{survey.visible_from ? new Date(survey.visible_from).toLocaleString() : 'Any time'} -
										{survey.visible_until ? new Date(survey.visible_until).toLocaleString() : 'Any time'}
									</p>
									<Button variant="primary" size="sm" href={`/surveys/${survey.slug}`} class="mt-3">
										Open
									</Button>
								</GlassCard>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	{/if}
</section>
