<script lang="ts">
	let {
		title = '',
		subtitle = '',
		compact = false
	}: { title?: string; subtitle?: string; compact?: boolean } = $props();
</script>

<section class={`rounded-xl border border-slate-800 bg-slate-900/60 ${compact ? 'p-3' : 'p-4'}`}>
	{#if title || subtitle}
		<header class="mb-3">
			{#if title}
				<h2 class="text-sm font-semibold text-slate-100">{title}</h2>
			{/if}
			{#if subtitle}
				<p class="mt-1 text-xs text-slate-400">{subtitle}</p>
			{/if}
		</header>
	{/if}
	<slot />
</section>
