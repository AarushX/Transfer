<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data } = $props();
</script>

<section class="space-y-4">
	<header class="fade-up">
		{#if data.teamGroup}
			<p class="eyebrow-label">{data.teamGroup.name}{data.teamGroup.designator ? ` · ${data.teamGroup.designator}` : ''}</p>
		{/if}
		<h1 class="mt-1 text-2xl font-bold tracking-tight" style="color: var(--app-text);">{data.page.title}</h1>
		<a href={`/team?team=${data.teamGroupId}`} class="mt-1 inline-block text-xs underline" style="color: var(--app-accent);">← Back to Team Page</a>
	</header>

	{#if (data.blocks ?? []).length === 0}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">This page is empty. The team lead hasn't added any content yet.</p>
		</GlassCard>
	{:else}
		<div class="space-y-3">
			{#each data.blocks as block (block.id)}
				{#if block.kind === 'heading'}
					<h2 class="text-lg font-bold" style="color: var(--app-text);">{block.payload?.text ?? ''}</h2>
				{:else if block.kind === 'text'}
					<p class="text-sm whitespace-pre-wrap" style="color: var(--app-text);">{block.payload?.text ?? ''}</p>
				{:else if block.kind === 'link'}
					<a href={block.payload?.url ?? '#'} target="_blank" rel="noopener" class="block rounded-xl border p-3 transition-colors hover:bg-white/5" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
						<p class="text-sm font-semibold" style="color: var(--app-accent);">{block.payload?.label ?? block.payload?.url ?? 'Link'} ↗</p>
						{#if block.payload?.description}<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">{block.payload.description}</p>{/if}
					</a>
				{:else if block.kind === 'image'}
					<img src={block.payload?.url ?? ''} alt={block.payload?.alt ?? ''} class="max-w-full rounded-xl border" style="border-color: var(--app-glass-border);" />
				{:else if block.kind === 'embed'}
					<div class="overflow-hidden rounded-xl border" style="border-color: var(--app-glass-border); aspect-ratio: 16/9;">
						<iframe src={block.payload?.url ?? ''} title={block.payload?.title ?? 'Embed'} class="h-full w-full" frameborder="0" allow="autoplay; fullscreen"></iframe>
					</div>
				{:else if block.kind === 'divider'}
					<hr style="border-color: var(--app-glass-border);" />
				{/if}
			{/each}
		</div>
	{/if}
</section>
