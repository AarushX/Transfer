<script lang="ts">
	import { SvelteFlow, Background, Controls, type Node, type Edge } from '@xyflow/svelte';
	let { nodes = [], statuses = [] } = $props();
	const flowNodes = $derived.by(() => {
		const statusMap = new Map(
			statuses.map((s: { node_id: string; computed_status: string }) => [
				s.node_id,
				s.computed_status
			])
		);
		return nodes.map((n: { id: string; title: string; tier: number; ordering: number }) => {
			const status = statusMap.get(n.id) ?? 'locked';
			const color =
				status === 'completed'
					? '#16a34a'
					: status === 'available'
						? '#facc15'
						: status === 'mentor_checkoff_pending'
							? '#0ea5e9'
							: '#64748b';
			return {
				id: n.id,
				position: { x: n.ordering * 250, y: (n.tier - 1) * 160 },
				data: { label: n.title },
				style: `background:${color};color:#0f172a;border-radius:8px;padding:6px 10px;`
			} as Node;
		});
	});

	const flowEdges: Edge[] = [];
</script>

<div class="h-[480px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
	<SvelteFlow nodes={flowNodes} edges={flowEdges} fitView>
		<Background />
		<Controls />
	</SvelteFlow>
</div>
