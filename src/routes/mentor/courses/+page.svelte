<script lang="ts">
	let { data, form } = $props();
	const teamsById = $derived(
		new Map((data.teams as any[]).map((team) => [String(team.id), team]))
	);
	const teamGroupsById = $derived(
		new Map((data.teamGroups as any[]).map((group) => [String(group.id), group]))
	);
	let selectedTemplateId = $state((data.templates?.[0]?.id as string | undefined) ?? '');
	let newTitle = $state('');
	let newSlug = $state('');
	let showTemplatePanel = $state(false);
	const selectedTemplate = $derived((data.templates ?? []).find((t: any) => t.id === selectedTemplateId) ?? null);
	$effect(() => {
		if (!newTitle && selectedTemplate) newTitle = String(selectedTemplate.title ?? '');
	});
	const teamNamesForNode = (nodeId: string) => {
		const labelsSet = new Set<string>();
		const teamIds = (data.nodeTargets as Array<{ node_id: string; team_id: string }>)
			.filter((row) => String(row.node_id) === String(nodeId))
			.map((row) => String(row.team_id));
		for (const teamId of teamIds) {
			const team = teamsById.get(teamId);
			if (!team) continue;
			const group = teamGroupsById.get(String(team.team_group_id ?? ''));
			const label = group?.name ? `${group.name}: ${team.name}` : String(team.name);
			labelsSet.add(label);
		}
		const groupIds = (data.nodeGroupTargets as Array<{ node_id: string; team_group_id: string }>)
			.filter((row) => String(row.node_id) === String(nodeId))
			.map((row) => String(row.team_group_id));
		for (const groupId of groupIds) {
			const group = teamGroupsById.get(groupId);
			if (!group) continue;
			labelsSet.add(`${String(group.name)} (all subteams)`);
		}
		const labels = Array.from(labelsSet);
		return labels.length > 0 ? labels : ['No team targets'];
	};
</script>

<section class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<a href="/mentor" class="text-xs text-slate-400">← Mentor home</a>
			<h1 class="text-2xl font-semibold">Courses</h1>
			<p class="text-sm text-slate-400">
				{data.nodes.length} module{data.nodes.length === 1 ? '' : 's'} in the catalog.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href="/mentor/courses/new"
				class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300"
			>
				+ New course
			</a>
			{#if (data.templates ?? []).length > 0}
				<button
					type="button"
					class="rounded border border-sky-700 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/30"
					onclick={() => (showTemplatePanel = !showTemplatePanel)}
				>
					Use template
				</button>
			{/if}
		</div>
	</div>
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<form method="POST" action="?/createFromTemplate" class="grid gap-2 rounded-xl border border-sky-800/70 bg-sky-950/20 p-3 md:grid-cols-4">
			<select
				name="template_id"
				class="rounded bg-slate-800 px-2 py-2 text-xs"
				bind:value={selectedTemplateId}
			>
				{#each data.templates as template (template.id)}
					<option value={template.id}>{template.name}</option>
				{/each}
			</select>
			<input
				name="title"
				class="rounded bg-slate-800 px-2 py-2 text-xs"
				bind:value={newTitle}
				placeholder="Course title"
				required
			/>
			<input
				name="slug"
				class="rounded bg-slate-800 px-2 py-2 text-xs"
				bind:value={newSlug}
				placeholder="Slug (optional)"
			/>
			<div class="flex gap-2">
				<button class="rounded border border-sky-700 px-3 py-2 text-xs text-sky-200">Create</button>
				<button type="button" class="rounded border border-slate-700 px-3 py-2 text-xs" onclick={() => (showTemplatePanel = false)}>Cancel</button>
			</div>
		</form>
	{/if}
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}

	<form
		method="GET"
		class="flex flex-wrap items-end gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
	>
		<label class="flex flex-1 flex-col gap-1 text-xs text-slate-400">
			<span>Search title</span>
			<input
				name="q"
				value={data.filter.q}
				placeholder="e.g. pneumatics"
				class="rounded bg-slate-800 px-2 py-2 text-sm text-slate-100"
			/>
		</label>
		<label class="flex flex-col gap-1 text-xs text-slate-400">
			<span>Team</span>
			<select name="team" class="rounded bg-slate-800 px-2 py-2 text-sm text-slate-100">
				<option value="">All teams</option>
				{#each (data.teams as any[]) as team}
					<option value={team.id} selected={team.id === data.filter.team}>
						{teamGroupsById.get(String(team.team_group_id ?? ''))?.name
							? `${teamGroupsById.get(String(team.team_group_id ?? ''))?.name}: `
							: ''}{team.name}
					</option>
				{/each}
			</select>
		</label>
		<button class="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600" type="submit"
			>Apply</button
		>
		{#if data.filter.q || data.filter.team}
			<a href="/mentor/courses" class="rounded border border-slate-800 px-3 py-2 text-sm">Reset</a>
		{/if}
	</form>

	<div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
		<table class="w-full text-sm">
			<thead class="bg-slate-800 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-3 py-2">Title</th>
					<th class="px-3 py-2">Slug</th>
					<th class="px-3 py-2">Teams</th>
					<th class="px-3 py-2 text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.nodes as node (node.id)}
					<tr class="border-t border-slate-800 hover:bg-slate-800">
						<td class="px-3 py-2 font-medium">{node.title}</td>
						<td class="px-3 py-2 text-slate-400">{node.slug}</td>
						<td class="px-3 py-2">
							<div class="flex max-w-[28rem] flex-nowrap gap-1 overflow-x-auto pb-1 whitespace-nowrap">
								{#each teamNamesForNode(node.id) as label}
									<span class="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs">{label}</span>
								{/each}
							</div>
						</td>
						<td class="px-3 py-2 text-right">
							<a
								href={`/learn/${node.slug}?preview=1`}
								class="mr-2 rounded border border-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
								>Preview</a
							>
							<a
								href={`/mentor/courses/${node.slug}`}
								class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">Edit</a
							>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="4" class="px-3 py-6 text-center text-slate-400">No courses found.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
