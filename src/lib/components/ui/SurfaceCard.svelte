<script lang="ts">
	let {
		title = '',
		subtitle = '',
		compact = false
	}: { title?: string; subtitle?: string; compact?: boolean } = $props();
</script>

<section
	class={`rounded-xl border ${compact ? 'p-3' : 'p-4'}`}
	style="border-color: var(--app-border); background: color-mix(in srgb, var(--app-surface) 70%, transparent);"
>
	{#if title || subtitle}
		<header class="mb-3">
			{#if title}
				<h2 class="text-sm font-semibold" style="color: var(--app-text);">{title}</h2>
			{/if}
			{#if subtitle}
				<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{subtitle}</p>
			{/if}
		</header>
	{/if}
	<slot />
</section>
