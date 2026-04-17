<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';
	let { data } = $props();
	const statusMap = $derived(
		new Map(
			data.statuses.map((s: { node_id: string; computed_status: string }) => [
				s.node_id,
				s.computed_status
			])
		)
	);
</script>

<section class="space-y-6">
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h1 class="text-2xl font-semibold">Dashboard</h1>
		<p class="text-slate-300">
			Welcome {data.profile?.full_name || data.profile?.email || 'teammate'}.
		</p>
	</div>

	<SkillTree nodes={data.nodes} statuses={data.statuses} />

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="mb-3 text-lg font-semibold">Modules</h2>
		<div class="space-y-2">
			{#each data.nodes as node}
				<div class="flex items-center justify-between rounded border border-slate-700 p-2">
					<div>
						<p class="font-medium">{node.title}</p>
						<p class="text-xs text-slate-400">Tier {node.tier}</p>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm text-slate-300">{statusMap.get(node.id) ?? 'locked'}</span>
						<a class="rounded bg-slate-700 px-2 py-1 text-sm" href={`/learn/${node.slug}`}>Open</a>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
