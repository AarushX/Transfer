<script lang="ts">
	let {
		value = 0,
		max = 100,
		color = '',
		size = 'md',
		label = '',
		showPercent = false
	}: {
		value?: number;
		max?: number;
		color?: string;
		size?: 'sm' | 'md';
		label?: string;
		showPercent?: boolean;
	} = $props();

	const pct = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
	const barHeight = $derived(size === 'sm' ? 'h-1.5' : 'h-2.5');
	const fillStyle = $derived(
		color
			? `width: ${pct}%; background: ${color};`
			: `width: ${pct}%; background: var(--app-gradient-accent);`
	);
</script>

{#if label || showPercent}
	<div class="mb-1.5 flex items-baseline justify-between text-xs">
		{#if label}<span style="color: var(--app-text-muted);">{label}</span>{/if}
		{#if showPercent}<span class="font-medium" style="color: var(--app-text);">{Math.round(pct)}%</span>{/if}
	</div>
{/if}
<div
	class={`w-full overflow-hidden rounded-full ${barHeight}`}
	style="background: color-mix(in srgb, var(--app-surface-alt) 60%, transparent);"
>
	<div
		class={`${barHeight} rounded-full transition-all duration-300`}
		style={fillStyle}
	></div>
</div>
