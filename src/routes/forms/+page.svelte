<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
	const hasActiveForms = $derived((data.forms ?? []).length > 0);
</script>

<section class="space-y-5">
	<div>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Forms</h1>
		<p class="text-sm" style="color: var(--app-text-muted);">Upload required documents for school/team compliance and track review status.</p>
	</div>

	{#if !hasActiveForms}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">No forms are currently assigned to you.</p>
		</GlassCard>
	{:else}
		<div class="grid gap-3 md:grid-cols-2">
			{#each data.forms ?? [] as item (item.id)}
				<GlassCard hover>
					<p class="font-medium" style="color: var(--app-text);">{item.name}</p>
					{#if item.description}
						<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{item.description}</p>
					{/if}
					{#if item.latestSubmission}
						<p class="mt-2 text-xs" style="color: var(--app-text-muted);">
							Latest: {item.latestSubmission.status} · {new Date(item.latestSubmission.created_at).toLocaleString()}
						</p>
					{/if}
					<Button variant="secondary" size="sm" href={`/forms/${item.slug}`} class="mt-3">
						Open form
					</Button>
				</GlassCard>
			{/each}
		</div>
	{/if}
</section>
