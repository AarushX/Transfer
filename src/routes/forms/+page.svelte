<script lang="ts">
	let { data } = $props();
	const hasActiveForms = $derived((data.forms ?? []).length > 0);
</script>

<section class="space-y-5">
	<div>
		<h1 class="text-2xl font-semibold">Forms</h1>
		<p class="text-sm text-slate-400">Upload required documents for school/team compliance and track review status.</p>
	</div>

	{#if !hasActiveForms}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-5">
			<p class="text-sm text-slate-300">No forms are currently assigned to you.</p>
		</div>
	{:else}
		<div class="grid gap-3 md:grid-cols-2">
			{#each data.forms ?? [] as item (item.id)}
				<article class="rounded-xl border border-slate-800 bg-slate-900 p-4">
					<p class="font-medium">{item.name}</p>
					{#if item.description}
						<p class="mt-1 text-sm text-slate-300">{item.description}</p>
					{/if}
					{#if item.latestSubmission}
						<p class="mt-2 text-xs text-slate-400">
							Latest: {item.latestSubmission.status} · {new Date(item.latestSubmission.created_at).toLocaleString()}
						</p>
					{/if}
					<a href={`/forms/${item.slug}`} class="mt-3 inline-flex rounded border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800">
						Open form
					</a>
				</article>
			{/each}
		</div>
	{/if}
</section>
