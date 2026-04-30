<script lang="ts">
	let { data, form } = $props();
	let selectedTeamId = $state(String((data.teamGroups as any[])[0]?.id ?? ''));
	let selectedSubteamId = $state('');

	const groupIdsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of data.groupTargets as Array<{ node_id: string; team_group_id: string }>) {
			const set = map.get(String(row.node_id)) ?? new Set<string>();
			set.add(String(row.team_group_id));
			map.set(String(row.node_id), set);
		}
		return map;
	});
	const subteamIdsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of data.subteamTargets as Array<{ node_id: string; team_id: string }>) {
			const set = map.get(String(row.node_id)) ?? new Set<string>();
			set.add(String(row.team_id));
			map.set(String(row.node_id), set);
		}
		return map;
	});
	const subteamsForSelectedTeam = $derived(
		(data.subteams as any[]).filter((row) => String(row.team_group_id) === selectedTeamId)
	);
	$effect(() => {
		if (!selectedTeamId) {
			selectedSubteamId = '';
			return;
		}
		const available = subteamsForSelectedTeam;
		if (available.length === 0) {
			selectedSubteamId = '';
			return;
		}
		if (!available.some((row) => String(row.id) === selectedSubteamId)) {
			selectedSubteamId = String(available[0].id);
		}
	});

	let teamCourseSearch = $state('');
	let subteamCourseSearch = $state('');
	const teamFilteredNodes = $derived.by(() => {
		const needle = teamCourseSearch.trim().toLowerCase();
		if (!needle) return data.nodes as any[];
		return (data.nodes as any[]).filter((node) =>
			`${node.title} ${node.slug}`.toLowerCase().includes(needle)
		);
	});
	const subteamFilteredNodes = $derived.by(() => {
		const needle = subteamCourseSearch.trim().toLowerCase();
		if (!needle) return data.nodes as any[];
		return (data.nodes as any[]).filter((node) =>
			`${node.title} ${node.slug}`.toLowerCase().includes(needle)
		);
	});
	let selectedTeamNodeIds = $state<Set<string>>(new Set());
	let selectedSubteamNodeIds = $state<Set<string>>(new Set());
	let savingTeamCourses = $state(false);
	let savingSubteamCourses = $state(false);

	$effect(() => {
		const initial = new Set<string>();
		for (const [nodeId, set] of groupIdsByNode.entries()) {
			if (selectedTeamId && set.has(selectedTeamId)) initial.add(nodeId);
		}
		selectedTeamNodeIds = initial;
	});
	$effect(() => {
		const initial = new Set<string>();
		for (const [nodeId, set] of subteamIdsByNode.entries()) {
			if (selectedSubteamId && set.has(selectedSubteamId)) initial.add(nodeId);
		}
		selectedSubteamNodeIds = initial;
	});

	const persistTeamCourses = async () => {
		if (!selectedTeamId) return;
		savingTeamCourses = true;
		try {
			const payload = new FormData();
			payload.set('team_group_id', selectedTeamId);
			for (const nodeId of selectedTeamNodeIds) payload.append('node_ids', nodeId);
			await fetch('?/saveTeamCourses', { method: 'POST', body: payload });
		} finally {
			savingTeamCourses = false;
		}
	};

	const persistSubteamCourses = async () => {
		if (!selectedSubteamId) return;
		savingSubteamCourses = true;
		try {
			const payload = new FormData();
			payload.set('subteam_id', selectedSubteamId);
			for (const nodeId of selectedSubteamNodeIds) payload.append('node_ids', nodeId);
			await fetch('?/saveSubteamCourses', { method: 'POST', body: payload });
		} finally {
			savingSubteamCourses = false;
		}
	};

	const toggleTeamCourse = (nodeId: string, checked: boolean) => {
		const next = new Set(selectedTeamNodeIds);
		if (checked) next.add(nodeId);
		else next.delete(nodeId);
		selectedTeamNodeIds = next;
		void persistTeamCourses();
	};

	const toggleSubteamCourse = (nodeId: string, checked: boolean) => {
		const next = new Set(selectedSubteamNodeIds);
		if (checked) next.add(nodeId);
		else next.delete(nodeId);
		selectedSubteamNodeIds = next;
		void persistSubteamCourses();
	};
</script>

<section class="space-y-5">
	<div>
		<a href="/admin/settings" class="text-xs text-slate-400">← Workspace</a>
		<h1 class="text-2xl font-semibold">Teams</h1>
		<p class="text-sm text-slate-400">Create teams, subteams, and map courses at each level.</p>
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<form method="POST" action="?/createTeam" class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Create Team</h2>
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_name" placeholder="Team name" required />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_slug" placeholder="Slug (optional)" />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" type="number" name="team_sort_order" placeholder="Sort order" />
			<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Create Team</button>
		</form>

		<form method="POST" action="?/createSubteam" class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Create Subteam</h2>
			<select class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_group_id" required>
				<option value="">Select parent team</option>
				{#each data.teamGroups as team}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_name" placeholder="Subteam name" required />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_slug" placeholder="Slug (optional)" />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" type="number" name="subteam_sort_order" placeholder="Sort order" />
			<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Create Subteam</button>
		</form>
	</div>

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="grid gap-2 md:grid-cols-3">
			<select class="rounded bg-slate-800 px-2 py-2 text-sm" bind:value={selectedTeamId}>
				<option value="">Select team</option>
				{#each data.teamGroups as team}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
			<select class="rounded bg-slate-800 px-2 py-2 text-sm" bind:value={selectedSubteamId}>
				<option value="">Select subteam</option>
				{#each subteamsForSelectedTeam as subteam}
					<option value={subteam.id}>{subteam.name}</option>
				{/each}
			</select>
			<div class="rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
				Autosaves as you toggle checkboxes
			</div>
		</div>
	</div>

	{#if selectedTeamId}
		<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Team-level courses</h2>
			<input
				class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
				placeholder="Search courses..."
				bind:value={teamCourseSearch}
			/>
			<div class="grid max-h-72 gap-1 overflow-auto rounded border border-slate-800 bg-slate-950/60 p-2">
				{#each teamFilteredNodes as node}
					<label class="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-slate-800/60">
						<span class="truncate">{node.title}</span>
						<input
							type="checkbox"
							checked={selectedTeamNodeIds.has(node.id)}
							onchange={(e) =>
								toggleTeamCourse(node.id, (e.currentTarget as HTMLInputElement).checked)}
						/>
					</label>
				{:else}
					<p class="text-xs text-slate-500">No matching courses.</p>
				{/each}
			</div>
			<p class="text-xs text-slate-500">
				{savingTeamCourses ? 'Saving...' : 'Autosaves as you toggle.'}
			</p>
		</div>
	{/if}

	{#if selectedSubteamId}
		<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Subteam-level courses</h2>
			<input
				class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
				placeholder="Search courses..."
				bind:value={subteamCourseSearch}
			/>
			<div class="grid max-h-72 gap-1 overflow-auto rounded border border-slate-800 bg-slate-950/60 p-2">
				{#each subteamFilteredNodes as node}
					<label class="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-slate-800/60">
						<span class="truncate">{node.title}</span>
						<input
							type="checkbox"
							checked={selectedSubteamNodeIds.has(node.id)}
							onchange={(e) =>
								toggleSubteamCourse(node.id, (e.currentTarget as HTMLInputElement).checked)}
						/>
					</label>
				{:else}
					<p class="text-xs text-slate-500">No matching courses.</p>
				{/each}
			</div>
			<p class="text-xs text-slate-500">
				{savingSubteamCourses ? 'Saving...' : 'Autosaves as you toggle.'}
			</p>
		</div>
	{/if}
</section>
