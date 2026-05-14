<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title = '',
		subtitle = '',
		compact = false,
		hover = false,
		gradient = false,
		class: className = '',
		children
	}: {
		title?: string;
		subtitle?: string;
		compact?: boolean;
		hover?: boolean;
		gradient?: boolean;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<section
	class={`glass-card relative overflow-hidden rounded-2xl border backdrop-blur-xl ${compact ? 'p-3' : 'p-5'} ${hover ? 'glass-card-hover' : ''} ${className}`}
>
	<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
	{#if title || subtitle}
		<header class="relative mb-3">
			{#if title}
				<h2 class="text-sm font-semibold tracking-tight" style="color: var(--app-text);">{title}</h2>
			{/if}
			{#if subtitle}
				<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{subtitle}</p>
			{/if}
		</header>
	{/if}
	<div class="relative">
		{@render children()}
	</div>
</section>

<style>
	.glass-card {
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
		box-shadow: var(--app-glass-shadow);
		backdrop-filter: blur(20px) saturate(140%);
		-webkit-backdrop-filter: blur(20px) saturate(140%);
		transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
	}
	.glass-card-hover:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
</style>
