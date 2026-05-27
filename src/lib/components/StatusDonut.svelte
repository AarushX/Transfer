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
	<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
		{#if hoveredKey}
			<span class="text-lg font-bold tracking-tight" style="color: {colorFor(hoveredKey)};">
				{countFor(hoveredKey)}
			</span>
			<span
				class="text-[8px] font-bold tracking-[0.18em] uppercase"
				style="color: var(--app-text-muted);"
			>
				{labelFor(hoveredKey)}
			</span>
		{:else}
			<span class="text-3xl font-bold tracking-tight" style="color: var(--app-text);">{pct}%</span>
			<span
				class="text-[9px] font-bold tracking-[0.18em] uppercase"
				style="color: var(--app-text-muted);">Complete</span
			>
		{/if}
	</div>
</div>

<style>
	.donut-wrap :global(svg) {
		display: block;
	}
</style>
