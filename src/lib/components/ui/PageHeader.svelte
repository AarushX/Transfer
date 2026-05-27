<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		description = '',
		children
	}: {
		title: string;
		description?: string;
		children?: Snippet;
	} = $props();
</script>

<header class="fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1
			class="text-2xl font-bold tracking-tight"
			style="color: var(--app-text); letter-spacing: -0.025em;"
		>
			{title}
		</h1>
		{#if description}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{description}</p>
		{/if}
	</div>
	{#if children}
		{@render children()}
	{/if}
</header>
