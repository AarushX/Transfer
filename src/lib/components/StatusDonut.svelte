<script lang="ts">
	import { computeSegments, type StatusCounts } from './status-donut-math';
	let { counts, size = 130 }: { counts: StatusCounts; size?: number } = $props();
	const radius = 40;
	const circumference = 2 * Math.PI * radius;
	const segments = $derived(computeSegments(counts, circumference));
	const total = $derived(
		counts.done + counts.current + counts.awaiting + counts.blocked + counts.locked
	);
	const pct = $derived(total === 0 ? 0 : Math.round((counts.done / total) * 100));
	const colorFor = (key: string) =>
		key === 'done'
			? 'var(--app-success)'
			: key === 'current'
				? 'var(--app-info)'
				: key === 'awaiting'
					? 'var(--app-warning)'
					: key === 'blocked'
						? 'var(--app-danger)'
						: 'var(--app-text-dim, var(--app-text-muted))';
</script>

<div class="relative" style="width: {size}px; height: {size}px;">
	<svg viewBox="0 0 100 100" width={size} height={size}>
		<circle
			cx="50"
			cy="50"
			r={radius}
			stroke="var(--app-glass-border)"
			stroke-width="14"
			fill="none"
		/>
		{#each segments as seg (seg.key)}
			{#if seg.length > 0}
				<circle
					cx="50"
					cy="50"
					r={radius}
					stroke={colorFor(seg.key)}
					stroke-width="14"
					fill="none"
					stroke-dasharray={`${seg.length} ${circumference - seg.length}`}
					stroke-dashoffset={-seg.offset}
					transform="rotate(-90 50 50)"
				/>
			{/if}
		{/each}
	</svg>
	<div class="absolute inset-0 flex flex-col items-center justify-center">
		<span class="text-3xl font-bold tracking-tight" style="color: var(--app-text);">{pct}%</span>
		<span
			class="text-[9px] font-bold tracking-[0.18em] uppercase"
			style="color: var(--app-text-muted);">Complete</span
		>
	</div>
</div>
