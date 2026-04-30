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

	let { title, saving, search, nodes, selectedNodeIds, onSearchChange, onToggle, onSelectAllVisible, onClearVisible }: Props = $props();
</script>

<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
	<div class="flex items-center justify-between">
		<h3 class="font-semibold">{title}</h3>
		<span class="text-xs text-slate-500">{saving ? 'Saving...' : `${selectedNodeIds.size} selected`}</span>
	</div>
	<input
		class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
		placeholder="Search courses..."
		value={search}
		oninput={(event) => onSearchChange((event.currentTarget as HTMLInputElement).value)}
	/>
	<div class="flex items-center justify-between text-xs">
		<p class="text-slate-500">{nodes.length} visible course{nodes.length === 1 ? '' : 's'}</p>
		<div class="flex gap-2">
			<button type="button" class="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-slate-500" onclick={onSelectAllVisible}>Select visible</button>
			<button type="button" class="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-slate-500" onclick={onClearVisible}>Clear visible</button>
		</div>
	</div>
	<div class="grid max-h-72 gap-1 overflow-auto rounded border border-slate-800 bg-slate-950/60 p-2">
		{#each nodes as node}
			<label class="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-slate-800/60">
				<span class="truncate">{node.title}</span>
				<input
					type="checkbox"
					checked={selectedNodeIds.has(node.id)}
					onchange={(event) => onToggle(node.id, (event.currentTarget as HTMLInputElement).checked)}
				/>
			</label>
		{:else}
			<p class="text-xs text-slate-500">No matching courses.</p>
		{/each}
	</div>
</div>
