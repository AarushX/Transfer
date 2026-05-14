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

<section class="space-y-5">
	<div>
		<a href="/dashboard" class="text-xs" style="color: var(--app-text-muted);">← Dashboard</a>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Applications & Signups</h1>
		<p class="text-sm" style="color: var(--app-text-muted);">Apply for leadership, complete school intakes, and volunteer for carpooling.</p>
	</div>

	{#if (data.surveys ?? []).length === 0}
		<p class="rounded border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">No surveys are available right now.</p>
	{:else}
		{#each groupOrder as kind}
			{#if groups[kind].length > 0}
				<div class="space-y-2">
					<h2 class="text-sm font-semibold" style="color: var(--app-text);">
						{groupLabel(kind)}
					</h2>
					<div class="grid gap-3 md:grid-cols-2">
						{#each groups[kind] as survey (survey.id)}
							<GlassCard hover>
								<div class="flex items-start justify-between gap-3">
									<div>
										<h3 class="font-medium" style="color: var(--app-text);">{survey.title}</h3>
										{#if survey.description}
											<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{survey.description}</p>
										{/if}
									</div>
									<span class={`rounded px-2 py-0.5 text-xs ${survey.capReached ? 'bg-amber-900/40 text-amber-200' : 'bg-emerald-900/40 text-emerald-200'}`}>
										{survey.submissions}/{survey.maxSubmissions}
									</span>
								</div>
								<p class="mt-3 text-xs" style="color: var(--app-text-muted);">
									Window:
									{survey.visible_from ? new Date(survey.visible_from).toLocaleString() : 'Any time'} -
									{survey.visible_until ? new Date(survey.visible_until).toLocaleString() : 'Any time'}
								</p>
								<Button variant="primary" size="sm" href={`/surveys/${survey.slug}`} class="mt-3">
									Open
								</Button>
							</GlassCard>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	{/if}
</section>
