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
	const countFor = (key: string): number =>
		(counts as Record<string, number>)[key] ?? 0;

	let hoveredKey = $state<string | null>(null);
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
					onmouseenter={() => (hoveredKey = seg.key)}
					onmouseleave={() => (hoveredKey = null)}
				>
					<title>{labelFor(seg.key)} · {countFor(seg.key)}</title>
				</circle>
			{/if}
		{/each}
	</svg>
	<!-- Center label: just the percentage, sized to a fraction of the donut so
	     it always fits regardless of how the donut is consumed (size=64 in
	     the subteam header, size=96 in dense grids, size=130 on hero cards). -->
	<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
		{#if hoveredKey}
			<span
				class="font-bold tracking-tight"
				style="color: {colorFor(hoveredKey)}; font-size: {Math.max(11, Math.round(size * 0.18))}px; line-height: 1;"
			>
				{countFor(hoveredKey)}
			</span>
			<span
				class="font-bold tracking-[0.16em] uppercase"
				style="color: var(--app-text-muted); font-size: {Math.max(8, Math.round(size * 0.075))}px;"
			>
				{labelFor(hoveredKey)}
			</span>
		{:else}
			<span
				class="font-bold tracking-tight"
				style="color: var(--app-text); font-size: {Math.max(11, Math.round(size * 0.2))}px; line-height: 1;"
				>{pct}%</span
			>
		{/if}
	</div>
</div>

<style>
	.donut-wrap :global(svg) {
		display: block;
	}
</style>
