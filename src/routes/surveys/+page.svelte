<script lang="ts">
	import { WORKFLOW_META } from '$lib/surveys/workflows';
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
		<a href="/dashboard" class="text-xs text-slate-400">← Dashboard</a>
		<h1 class="text-2xl font-semibold">Applications & Signups</h1>
		<p class="text-sm text-slate-400">Apply for leadership, complete school intakes, and volunteer for carpooling.</p>
	</div>

	{#if (data.surveys ?? []).length === 0}
		<p class="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">No surveys are available right now.</p>
	{:else}
		{#each groupOrder as kind}
			{#if groups[kind].length > 0}
				<div class="space-y-2">
					<h2 class="text-sm font-semibold">
						{groupLabel(kind)}
					</h2>
					<div class="grid gap-3 md:grid-cols-2">
						{#each groups[kind] as survey (survey.id)}
							<article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
								<div class="flex items-start justify-between gap-3">
									<div>
										<h3 class="font-medium">{survey.title}</h3>
										{#if survey.description}
											<p class="mt-1 text-sm text-slate-300">{survey.description}</p>
										{/if}
									</div>
									<span class={`rounded px-2 py-0.5 text-xs ${survey.capReached ? 'bg-amber-900/40 text-amber-200' : 'bg-emerald-900/40 text-emerald-200'}`}>
										{survey.submissions}/{survey.maxSubmissions}
									</span>
								</div>
								<p class="mt-3 text-xs text-slate-400">
									Window:
									{survey.visible_from ? new Date(survey.visible_from).toLocaleString() : 'Any time'} -
									{survey.visible_until ? new Date(survey.visible_until).toLocaleString() : 'Any time'}
								</p>
								<a href={`/surveys/${survey.slug}`} class="mt-3 inline-flex rounded bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-slate-900">
									Open
								</a>
							</article>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	{/if}
</section>
