<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();
	const hasActiveForms = $derived((data.forms ?? []).length > 0);

	const statusChip = (status: string) => {
		switch (status?.toLowerCase()) {
			case 'approved': return 'chip-emerald';
			case 'rejected': return 'chip-rose';
			case 'pending': return 'chip-amber';
			default: return 'chip-violet';
		}
	};
</script>

<section class="space-y-6">
	<header class="fade-up">
		<p class="eyebrow-label">Documents</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight gradient-text">Forms</h1>
		<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">Upload required documents for school/team compliance and track review status.</p>
	</header>

	{#if !hasActiveForms}
		<div class="fade-up" style="animation-delay: 60ms;">
			<GlassCard>
				<p class="text-sm" style="color: var(--app-text-muted);">No forms are currently assigned to you.</p>
			</GlassCard>
		</div>
	{:else}
		<div class="grid gap-3 md:grid-cols-2">
			{#each data.forms ?? [] as item, i (item.id)}
				<div class="fade-up" style="animation-delay: {60 + i * 40}ms;">
					<GlassCard hover>
						<p class="font-medium" style="color: var(--app-text);">{item.name}</p>
						{#if item.description}
							<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{item.description}</p>
						{/if}
						{#if item.latestSubmission}
							<div class="mt-2 flex items-center gap-2">
								<span class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide {statusChip(item.latestSubmission.status)}">
									{item.latestSubmission.status}
								</span>
								<span class="mono text-xs" style="color: var(--app-text-dim);">{new Date(item.latestSubmission.created_at).toLocaleString()}</span>
							</div>
						{/if}
						<Button variant="secondary" size="sm" href={`/forms/${item.slug}`} class="mt-3">
							Open form
						</Button>
					</GlassCard>
				</div>
			{/each}
		</div>
	{/if}
</section>
