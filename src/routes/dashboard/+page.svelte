<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';

	type Node = { id: string; title: string; slug: string; tier: number; ordering: number; subteam_id: string };
	type Status = { node_id: string; computed_status: string };
	type Subteam = { id: string; name: string; slug: string };

	let { data } = $props();

	const statusMap = $derived(
		new Map((data.statuses as Status[]).map((s) => [s.node_id, s.computed_status]))
	);
	const subteamMap = $derived(
		new Map((data.subteams as Subteam[]).map((s) => [s.id, s]))
	);

	let filter = $state('');
	let onlyUnfinished = $state(false);

	const filtered = $derived.by(() => {
		const needle = filter.trim().toLowerCase();
		return (data.nodes as Node[]).filter((n) => {
			const status = statusMap.get(n.id) ?? 'locked';
			if (onlyUnfinished && status === 'completed') return false;
			if (!needle) return true;
			return (
				n.title.toLowerCase().includes(needle) ||
				n.slug.toLowerCase().includes(needle)
			);
		});
	});

	const grouped = $derived.by(() => {
		const map = new Map<string, Node[]>();
		for (const n of filtered) {
			const list = map.get(n.subteam_id) ?? [];
			list.push(n);
			map.set(n.subteam_id, list);
		}
		return Array.from(map.entries())
			.map(([subteamId, nodes]) => ({
				subteam: subteamMap.get(subteamId),
				nodes
			}))
			.sort((a, b) => (a.subteam?.name ?? '').localeCompare(b.subteam?.name ?? ''));
	});

	const summary = $derived.by(() => {
		const counts = { total: 0, completed: 0, inProgress: 0, locked: 0 };
		for (const n of data.nodes as Node[]) {
			counts.total += 1;
			const status = statusMap.get(n.id) ?? 'locked';
			if (status === 'completed') counts.completed += 1;
			else if (status === 'locked') counts.locked += 1;
			else counts.inProgress += 1;
		}
		return counts;
	});

	const statusPillClass = (status: string) => {
		switch (status) {
			case 'completed':
				return 'bg-emerald-900/40 text-emerald-200';
			case 'mentor_checkoff_pending':
				return 'bg-sky-900/40 text-sky-200';
			case 'quiz_pending':
				return 'bg-yellow-900/40 text-yellow-200';
			case 'video_pending':
				return 'bg-slate-700 text-slate-100';
			case 'available':
				return 'bg-slate-800 text-slate-100';
			default:
				return 'bg-slate-800 text-slate-400';
		}
	};

	const statusLabel = (status: string) =>
		({
			locked: 'Locked',
			available: 'Available',
			video_pending: 'Watching',
			quiz_pending: 'Quiz',
			mentor_checkoff_pending: 'Awaiting mentor',
			completed: 'Completed'
		})[status] ?? status;
</script>

<section class="space-y-6">
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">Dashboard</h1>
				<p class="text-slate-300">
					Welcome {data.profile?.full_name || data.profile?.email || 'teammate'}.
				</p>
			</div>
			<a
				href="/portals"
				class="inline-flex rounded border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
				>Open portal directory</a
			>
		</div>
		<div class="mt-4 grid grid-cols-2 gap-2 text-center md:grid-cols-4">
			<div class="rounded border border-slate-800 bg-slate-950/60 p-2">
				<p class="text-xs text-slate-400">Total</p>
				<p class="text-lg font-semibold">{summary.total}</p>
			</div>
			<div class="rounded border border-emerald-800/60 bg-emerald-900/20 p-2">
				<p class="text-xs text-emerald-300">Completed</p>
				<p class="text-lg font-semibold text-emerald-200">{summary.completed}</p>
			</div>
			<div class="rounded border border-yellow-800/60 bg-yellow-900/20 p-2">
				<p class="text-xs text-yellow-300">In progress</p>
				<p class="text-lg font-semibold text-yellow-200">{summary.inProgress}</p>
			</div>
			<div class="rounded border border-slate-800 bg-slate-950/60 p-2">
				<p class="text-xs text-slate-400">Locked</p>
				<p class="text-lg font-semibold">{summary.locked}</p>
			</div>
		</div>
	</div>

	<SkillTree nodes={data.nodes} statuses={data.statuses} />

	<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="mr-auto text-lg font-semibold">Modules</h2>
			<input
				bind:value={filter}
				placeholder="Search modules..."
				class="w-full rounded bg-slate-800 px-2 py-2 text-sm md:w-64"
			/>
			<label class="flex items-center gap-2 text-xs text-slate-300">
				<input type="checkbox" bind:checked={onlyUnfinished} class="accent-yellow-400" />
				Hide completed
			</label>
		</div>

		{#if grouped.length === 0}
			<p class="text-sm text-slate-400">No modules match your filter.</p>
		{/if}

		{#each grouped as group (group.subteam?.id ?? 'none')}
			<div class="space-y-2">
				<h3 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
					{group.subteam?.name ?? 'Unassigned'} · {group.nodes.length}
				</h3>
				<div class="grid gap-2">
					{#each group.nodes as node (node.id)}
						{@const status = statusMap.get(node.id) ?? 'locked'}
						<a
							href={`/learn/${node.slug}`}
							class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm transition hover:border-slate-700 hover:bg-slate-800/60"
						>
							<span>
								<span class="font-medium">{node.title}</span>
								<span class="ml-2 text-xs text-slate-500">T{node.tier}</span>
							</span>
							<span class={`rounded-full px-2 py-0.5 text-xs ${statusPillClass(status)}`}>
								{statusLabel(status)}
							</span>
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
