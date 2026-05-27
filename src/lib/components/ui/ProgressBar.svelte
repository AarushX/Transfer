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
	const barHeight = $derived(size === 'sm' ? '6px' : '8px');
</script>

{#if label || showPercent}
	<div class="mb-1.5 flex items-baseline justify-between text-xs">
		{#if label}<span style="color: var(--app-text-muted);">{label}</span>{/if}
		{#if showPercent}<span class="mono font-medium" style="color: var(--app-text);"
				>{Math.round(pct)}%</span
			>{/if}
	</div>
{/if}
<div class="aurora-progress" style="height: {barHeight};">
	<div
		class="aurora-progress-fill"
		style="width: {pct}%;{color ? ` background: ${color};` : ''}"
	></div>
</div>
