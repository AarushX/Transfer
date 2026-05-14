<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		class: className = '',
		children
	}: {
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class={`overflow-hidden rounded-xl border backdrop-blur-xl ${className}`}
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
>
	<table class="glass-table w-full text-sm">
		{@render children()}
	</table>
</div>

<style>
	:global(.glass-table thead) {
		border-bottom: 1px solid var(--app-glass-border);
	}
	:global(.glass-table thead th) {
		padding: 0.625rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--app-text-muted);
		text-align: left;
		background: color-mix(in srgb, var(--app-surface-alt) 40%, transparent);
	}
	:global(.glass-table tbody td) {
		padding: 0.625rem 1rem;
		color: var(--app-text);
		border-bottom: 1px solid var(--app-glass-border);
	}
	:global(.glass-table tbody tr) {
		transition: background 0.15s ease;
	}
	:global(.glass-table tbody tr:hover) {
		background: var(--app-glass-bg-hover);
	}
	:global(.glass-table tbody tr:last-child td) {
		border-bottom: none;
	}
</style>
