<script lang="ts">
	import type { CourseNode } from './types';

	type Props = {
		title: string;
		saving: boolean;
		search: string;
		nodes: CourseNode[];
		selectedNodeIds: Set<string>;
		onSearchChange: (value: string) => void;
		onToggle: (nodeId: string, checked: boolean) => void;
		onSelectAllVisible: () => void;
		onClearVisible: () => void;
	};

	let {
		title,
		saving,
		search,
		nodes,
		selectedNodeIds,
		onSearchChange,
		onToggle,
		onSelectAllVisible,
		onClearVisible
	}: Props = $props();

	const visibleSelectedCount = $derived(nodes.filter((n) => selectedNodeIds.has(n.id)).length);
	const allVisibleSelected = $derived(
		nodes.length > 0 && visibleSelectedCount === nodes.length
	);
</script>

<div
	class="rounded-2xl border p-5 backdrop-blur-xl"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
>
	<!-- Header -->
	<div class="mb-4 flex items-end justify-between gap-3">
		<div class="min-w-0">
			<p class="eyebrow-label" style="margin-bottom: 2px;">Coursework</p>
			<h3 class="truncate text-base font-semibold" style="color: var(--app-text);">{title}</h3>
		</div>
		<div class="flex items-center gap-2 text-xs">
			{#if saving}
				<span
					class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
					style="border-color: color-mix(in srgb, var(--app-info) 35%, transparent); background: color-mix(in srgb, var(--app-info) 14%, transparent); color: var(--app-info);"
				>
					<span class="h-1.5 w-1.5 animate-pulse rounded-full" style="background: var(--app-info);"></span>
					Saving
				</span>
			{:else}
				<span
					class="rounded-full border px-2.5 py-1 font-medium"
					style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent); color: var(--app-text-muted);"
				>
					{selectedNodeIds.size} selected
				</span>
			{/if}
		</div>
	</div>

	<!-- Search -->
	<label class="search-shell relative block">
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
			style="color: var(--app-text-dim);"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m21 21-4.3-4.3" />
		</svg>
		<input
			class="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm transition focus:outline-none"
			style="background: color-mix(in srgb, var(--app-glass-bg) 70%, transparent); border-color: var(--app-glass-border); color: var(--app-input-text);"
			placeholder="Search courses..."
			value={search}
			oninput={(event) => onSearchChange((event.currentTarget as HTMLInputElement).value)}
		/>
		{#if search}
			<button
				type="button"
				class="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md"
				style="background: transparent; border: none; color: var(--app-text-dim); cursor: pointer;"
				aria-label="Clear search"
				onclick={() => onSearchChange('')}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
			</button>
		{/if}
	</label>

	<!-- Toolbar -->
	<div class="mt-3 flex flex-wrap items-center justify-between gap-2">
		<p class="text-[11px] font-medium tracking-wide" style="color: var(--app-text-dim);">
			{nodes.length} visible · {visibleSelectedCount} selected here
		</p>
		<div class="flex gap-1.5">
			<button
				type="button"
				class="bulk-btn rounded-lg border px-2.5 py-1 text-[11px] font-medium"
				style="border-color: var(--app-glass-border); background: transparent; color: var(--app-text-muted);"
				onclick={onSelectAllVisible}
				disabled={allVisibleSelected || nodes.length === 0}
			>
				Select visible
			</button>
			<button
				type="button"
				class="bulk-btn rounded-lg border px-2.5 py-1 text-[11px] font-medium"
				style="border-color: var(--app-glass-border); background: transparent; color: var(--app-text-muted);"
				onclick={onClearVisible}
				disabled={visibleSelectedCount === 0}
			>
				Clear visible
			</button>
		</div>
	</div>

	<!-- Course chips -->
	<div
		class="mt-3 grid max-h-80 gap-1.5 overflow-auto rounded-xl border p-2 sm:grid-cols-2"
		style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 40%, transparent);"
	>
		{#each nodes as node (node.id)}
			{@const selected = selectedNodeIds.has(node.id)}
			<button
				type="button"
				onclick={() => onToggle(node.id, !selected)}
				class="course-chip group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition"
				style={selected
					? 'border-color: color-mix(in srgb, var(--app-accent) 55%, transparent); background: color-mix(in srgb, var(--app-accent) 16%, transparent); color: var(--app-text);'
					: 'border-color: var(--app-glass-border); background: transparent; color: var(--app-text-muted);'}
				aria-pressed={selected}
			>
				<span
					class="grid h-4 w-4 shrink-0 place-items-center rounded-md border transition"
					style={selected
						? 'background: var(--app-accent); border-color: var(--app-accent); color: white;'
						: 'background: transparent; border-color: var(--app-glass-border); color: transparent;'}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-2.5 w-2.5"><path d="M20 6L9 17l-5-5"/></svg>
				</span>
				<span class="truncate">{node.title}</span>
			</button>
		{:else}
			<p class="col-span-full px-2 py-4 text-center text-xs" style="color: var(--app-text-dim);">
				No matching courses.
			</p>
		{/each}
	</div>
</div>

<style>
	.search-shell input:focus {
		border-color: color-mix(in srgb, var(--app-accent) 55%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 20%, transparent);
	}
	.bulk-btn:not(:disabled):hover {
		background: var(--app-glass-bg-hover);
		color: var(--app-text);
	}
	.bulk-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.course-chip:hover {
		border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-glass-border));
		color: var(--app-text);
	}
</style>
