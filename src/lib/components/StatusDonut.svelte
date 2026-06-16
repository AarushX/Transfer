<script lang="ts">
	import { computeSegments, type StatusCounts } from './status-donut-math';
	let {
		counts,
		size = 130,
		onSegmentHover
	}: {
		counts: StatusCounts;
		size?: number;
		// Fires when the user hovers a segment (key) or moves off all segments
		// (null). Lets the parent swap an adjacent label while the donut center
		// stays locked to the overall percentage.
		onSegmentHover?: (key: string | null) => void;
	} = $props();
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
	const labelFor = (key: string) =>
		key === 'done'
			? 'Done'
			: key === 'current'
				? 'In progress'
				: key === 'awaiting'
					? 'Awaiting mentor'
					: key === 'blocked'
						? 'Blocked'
						: 'Locked';
	const countFor = (key: string): number => (counts as Record<string, number>)[key] ?? 0;

	let hoveredKey = $state<string | null>(null);
	function setHover(key: string | null) {
		hoveredKey = key;
		onSegmentHover?.(key);
	}
</script>

<div class="donut-wrap relative" style="width: {size}px; height: {size}px;">
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
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<circle
					cx="50"
					cy="50"
					r={radius}
					stroke={colorFor(seg.key)}
					stroke-width={hoveredKey === seg.key ? 18 : 14}
					fill="none"
					stroke-dasharray={`${seg.length} ${circumference - seg.length}`}
					stroke-dashoffset={-seg.offset}
					transform="rotate(-90 50 50)"
					style="cursor: pointer; transition: stroke-width 0.12s ease;"
					onmouseenter={() => setHover(seg.key)}
					onmouseleave={() => setHover(null)}
				>
					<title>{labelFor(seg.key)} · {countFor(seg.key)}</title>
				</circle>
			{/if}
		{/each}
	</svg>
	<!-- Center label: always the overall percentage. The hovered-segment
	     label is surfaced to the parent through `onSegmentHover` instead, so
	     the % never disappears mid-interaction. -->
	<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
		<span
			class="font-bold tracking-tight"
			style="color: var(--app-text); font-size: {Math.max(
				11,
				Math.round(size * 0.2)
			)}px; line-height: 1;">{pct}%</span
		>
	</div>
</div>

<style>
	.donut-wrap :global(svg) {
		display: block;
	}
</style>
