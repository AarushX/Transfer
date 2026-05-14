<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	let selectedTeamGroupId = $state('');
	let selectedSubteamId = $state('');
	let selectedTeamNodeIds = $state<Set<string>>(new Set());
	let selectedSubteamNodeIds = $state<Set<string>>(new Set());

	const teamGroups = $derived((data.teamGroups as any[]) ?? []);
	const subteams = $derived((data.subteams as any[]) ?? []);
	const nodes = $derived((data.nodes as any[]) ?? []);

	const gi = "rounded-lg border px-2 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";

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
	<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Admin Content & Templates</h1>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<div class="space-y-3 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<h2 class="font-semibold" style="color: var(--app-text);">Checkbox Course Editor</h2>
			<div class="grid gap-3 md:grid-cols-2">
				<label class="space-y-1">
					<span class="text-xs" style="color: var(--app-text-muted);">Main Team</span>
					<select class={"w-full " + gi} style={gs} bind:value={selectedTeamGroupId}>
						{#each teamGroups as team}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1">
					<span class="text-xs" style="color: var(--app-text-muted);">Subteam</span>
					<select class={"w-full " + gi} style={gs} bind:value={selectedSubteamId}>
						{#each subteams.filter((row) => String(row.team_group_id) === selectedTeamGroupId) as team}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</label>
			</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div>
					<p class="mb-2 text-sm font-medium" style="color: var(--app-text);">Main Team Course Access</p>
					<div class="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						{#each nodes as node}
							<label class="flex items-center gap-2 text-sm" style="color: var(--app-text);">
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
					<p class="mb-2 text-sm font-medium" style="color: var(--app-text);">Subteam Course Access</p>
					<div class="max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						{#each nodes as node}
							<label class="flex items-center gap-2 text-sm" style="color: var(--app-text);">
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

		<div class="space-y-4 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<h2 class="font-semibold" style="color: var(--app-text);">Template Manager</h2>
			<div class="space-y-3">
				<div>
					<p class="mb-1 text-sm font-medium" style="color: var(--app-text);">Course Templates</p>
					<ul class="space-y-1 text-sm">
						{#each data.courseTemplates as row}
							<li class="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
								<span style="color: var(--app-text);">{row.name} <span style="color: var(--app-text-muted);">({row.title})</span></span>
								<form method="POST" action="?/deleteCourseTemplate">
									<input type="hidden" name="template_id" value={row.id} />
									<Button variant="danger" size="sm" type="submit">Delete</Button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<p class="mb-1 text-sm font-medium" style="color: var(--app-text);">Survey Templates</p>
					<ul class="space-y-1 text-sm">
						{#each data.surveyTemplates as row}
							<li class="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
								<span style="color: var(--app-text);">{row.name} <span style="color: var(--app-text-muted);">({row.title})</span></span>
								<form method="POST" action="?/deleteSurveyTemplate">
									<input type="hidden" name="template_id" value={row.id} />
									<Button variant="danger" size="sm" type="submit">Delete</Button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
				<div>
					<p class="mb-1 text-sm font-medium" style="color: var(--app-text);">Carpool Templates</p>
					<ul class="space-y-1 text-sm">
						{#each data.carpoolTemplates as row}
							<li class="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
								<span style="color: var(--app-text);">{row.name} <span style="color: var(--app-text-muted);">({row.title})</span></span>
								<form method="POST" action="?/deleteCarpoolTemplate">
									<input type="hidden" name="template_id" value={row.id} />
									<Button variant="danger" size="sm" type="submit">Delete</Button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>

	<div class="rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		<h2 class="mb-2 font-semibold" style="color: var(--app-text);">Delete Courses</h2>
		<ul class="space-y-1 text-sm">
			{#each nodes as node}
				<li class="flex items-center justify-between gap-3 rounded-lg border px-2 py-1.5" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
					<span style="color: var(--app-text);">{node.title} <span style="color: var(--app-text-muted);">({node.slug})</span></span>
					<form method="POST" action="?/deleteNode">
						<input type="hidden" name="node_id" value={node.id} />
						<Button variant="danger" size="sm" type="submit">Delete</Button>
					</form>
				</li>
			{/each}
		</ul>
	</div>
</section>
