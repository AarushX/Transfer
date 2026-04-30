<script lang="ts">
	let { data, form } = $props();
	let selectedTeamGroupId = $state('');
	let selectedSubteamId = $state('');
	let selectedTeamNodeIds = $state<Set<string>>(new Set());
	let selectedSubteamNodeIds = $state<Set<string>>(new Set());

	const teamGroups = $derived((data.teamGroups as any[]) ?? []);
	const subteams = $derived((data.subteams as any[]) ?? []);
	const nodes = $derived((data.nodes as any[]) ?? []);

	const groupTargetsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of data.groupTargets as any[]) {
			const nodeId = String(row.node_id);
			const set = map.get(nodeId) ?? new Set<string>();
			set.add(String(row.team_group_id));
			map.set(nodeId, set);
		}
		return map;
	});

	const subteamTargetsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of data.subteamTargets as any[]) {
			const nodeId = String(row.node_id);
			const set = map.get(nodeId) ?? new Set<string>();
			set.add(String(row.team_id));
			map.set(nodeId, set);
		}
		return map;
	});

	$effect(() => {
		if (!selectedTeamGroupId) selectedTeamGroupId = String(teamGroups[0]?.id ?? '');
	});

	$effect(() => {
		const inGroup = subteams.filter((row) => String(row.team_group_id) === selectedTeamGroupId);
		if (!inGroup.some((row) => String(row.id) === selectedSubteamId)) {
			selectedSubteamId = String(inGroup[0]?.id ?? '');
		}
	});

	$effect(() => {
		const next = new Set<string>();
		for (const [nodeId, ids] of groupTargetsByNode.entries()) {
			if (selectedTeamGroupId && ids.has(selectedTeamGroupId)) next.add(nodeId);
		}
		selectedTeamNodeIds = next;
	});

	$effect(() => {
		const next = new Set<string>();
		for (const [nodeId, ids] of subteamTargetsByNode.entries()) {
			if (selectedSubteamId && ids.has(selectedSubteamId)) next.add(nodeId);
		}
		selectedSubteamNodeIds = next;
	});

	const persistTeamCourses = async () => {
		if (!selectedTeamGroupId) return;
		const payload = new FormData();
		payload.set('team_group_id', selectedTeamGroupId);
		for (const nodeId of selectedTeamNodeIds) payload.append('node_ids', nodeId);
		await fetch('?/saveTeamCourses', { method: 'POST', body: payload });
	};

	const persistSubteamCourses = async () => {
		if (!selectedSubteamId) return;
		const payload = new FormData();
		payload.set('subteam_id', selectedSubteamId);
		for (const nodeId of selectedSubteamNodeIds) payload.append('node_ids', nodeId);
		await fetch('?/saveSubteamCourses', { method: 'POST', body: payload });
	};

	const toggleTeamNode = (nodeId: string, checked: boolean) => {
		const next = new Set(selectedTeamNodeIds);
		if (checked) next.add(nodeId);
		else next.delete(nodeId);
		selectedTeamNodeIds = next;
		void persistTeamCourses();
	};

	const toggleSubteamNode = (nodeId: string, checked: boolean) => {
		const next = new Set(selectedSubteamNodeIds);
		if (checked) next.add(nodeId);
		else next.delete(nodeId);
		selectedSubteamNodeIds = next;
		void persistSubteamCourses();
	};
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">Admin Content & Templates</h1>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/20 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/20 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Checkbox Course Editor</h2>
			<div class="grid gap-3 md:grid-cols-2">
				<label class="space-y-1">
					<span class="text-xs text-slate-400">Main Team</span>
					<select class="w-full rounded bg-slate-800 px-2 py-2" bind:value={selectedTeamGroupId}>
						{#each teamGroups as team}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1">
					<span class="text-xs text-slate-400">Subteam</span>
					<select class="w-full rounded bg-slate-800 px-2 py-2" bind:value={selectedSubteamId}>
						{#each subteams.filter((row) => String(row.team_group_id) === selectedTeamGroupId) as team}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</label>
			</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div>
					<p class="mb-2 text-sm font-medium text-slate-200">Main Team Course Access</p>
					<div class="max-h-80 space-y-1 overflow-y-auto rounded border border-slate-800 p-2">
						{#each nodes as node}
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={selectedTeamNodeIds.has(node.id)}
									onchange={(e) => toggleTeamNode(node.id, (e.currentTarget as HTMLInputElement).checked)}
								/>
								<span>{node.title}</span>
							</label>
						{/each}
					</div>
				</div>
				<div>
					<p class="mb-2 text-sm font-medium text-slate-200">Subteam Course Access</p>
					<div class="max-h-80 space-y-1 overflow-y-auto rounded border border-slate-800 p-2">
						{#each nodes as node}
							<label class="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={selectedSubteamNodeIds.has(node.id)}
									onchange={(e) => toggleSubteamNode(node.id, (e.currentTarget as HTMLInputElement).checked)}
								/>
								<span>{node.title}</span>
							</label>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<div class="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Template Manager</h2>
			<div class="space-y-3">
				<div>
					<p class="mb-1 text-sm font-medium">Course Templates</p>
					<ul class="space-y-1 text-sm">
						{#each data.courseTemplates as row}
							<li class="flex items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1.5">
								<span>{row.name} <span class="text-slate-500">({row.title})</span></span>
								<form method="POST" action="?/deleteCourseTemplate">
									<input type="hidden" name="template_id" value={row.id} />
									<button class="rounded border border-red-700 px-2 py-1 text-xs text-red-200">Delete</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<p class="mb-1 text-sm font-medium">Survey Templates</p>
					<ul class="space-y-1 text-sm">
						{#each data.surveyTemplates as row}
							<li class="flex items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1.5">
								<span>{row.name} <span class="text-slate-500">({row.title})</span></span>
								<form method="POST" action="?/deleteSurveyTemplate">
									<input type="hidden" name="template_id" value={row.id} />
									<button class="rounded border border-red-700 px-2 py-1 text-xs text-red-200">Delete</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<p class="mb-1 text-sm font-medium">Carpool Templates</p>
					<ul class="space-y-1 text-sm">
						{#each data.carpoolTemplates as row}
							<li class="flex items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1.5">
								<span>{row.name} <span class="text-slate-500">({row.title})</span></span>
								<form method="POST" action="?/deleteCarpoolTemplate">
									<input type="hidden" name="template_id" value={row.id} />
									<button class="rounded border border-red-700 px-2 py-1 text-xs text-red-200">Delete</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="mb-2 font-semibold">Delete Courses</h2>
		<ul class="space-y-1 text-sm text-slate-300">
			{#each nodes as node}
				<li class="flex items-center justify-between gap-3 rounded border border-slate-800 px-2 py-1.5">
					<span>{node.title} <span class="text-slate-500">({node.slug})</span></span>
					<form method="POST" action="?/deleteNode">
						<input type="hidden" name="node_id" value={node.id} />
						<button class="rounded border border-red-700 px-2 py-1 text-xs text-red-200">Delete</button>
					</form>
				</li>
			{/each}
		</ul>
	</div>
</section>
