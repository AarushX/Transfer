<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title = '',
		description = '',
		icon,
		action
	}: {
		title?: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-col items-center justify-center rounded-xl border px-6 py-12 text-center backdrop-blur-xl"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
>
	{#if icon}
		<div class="mb-3 opacity-40">
			{@render icon()}
		</div>
	{/if}
	{#if title}
		<p class="text-sm font-medium" style="color: var(--app-text);">{title}</p>
	{/if}
	{#if description}
		<p class="mt-1 max-w-sm text-xs" style="color: var(--app-text-muted);">{description}</p>
	{/if}
	{#if action}
		<div class="mt-4">
			{@render action()}
		</div>
	{/if}
</div>
