<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import GlassTable from '$lib/components/ui/GlassTable.svelte';
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
			<a href="/mentor" class="text-xs" style="color: var(--app-text-muted);">← Mentor home</a>
			<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Courses</h1>
			<p class="text-sm" style="color: var(--app-text-muted);">
				{data.nodes.length} module{data.nodes.length === 1 ? '' : 's'} in the catalog.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="primary" href="/mentor/courses/new">+ New course</Button>
			{#if (data.templates ?? []).length > 0}
				<Button variant="secondary" onclick={() => (showTemplatePanel = !showTemplatePanel)}>Use template</Button>
			{/if}
		</div>
	</div>
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<form method="POST" action="?/createFromTemplate" class="grid gap-2 rounded-xl border p-3 md:grid-cols-4" style="border-color: var(--app-info); background: color-mix(in srgb, var(--app-info) 8%, transparent);">
			<select
				name="template_id"
				class="rounded-lg border px-2 py-2 text-xs backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				bind:value={selectedTemplateId}
			>
				{#each data.templates as template (template.id)}
					<option value={template.id}>{template.name}</option>
				{/each}
			</select>
			<input
				name="title"
				class="rounded-lg border px-2 py-2 text-xs backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				bind:value={newTitle}
				placeholder="Course title"
				required
			/>
			<input
				name="slug"
				class="rounded-lg border px-2 py-2 text-xs backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				bind:value={newSlug}
				placeholder="Slug (optional)"
			/>
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" type="submit">Create</Button>
				<Button variant="ghost" size="sm" onclick={() => (showTemplatePanel = false)}>Cancel</Button>
			</div>
		</form>
	{/if}
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{/if}

	<form
		method="GET"
		class="flex flex-wrap items-end gap-2 rounded-xl border p-3 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<label class="flex flex-1 flex-col gap-1 text-xs" style="color: var(--app-text-muted);">
			<span>Search title</span>
			<input
				name="q"
				value={data.filter.q}
				placeholder="e.g. pneumatics"
				class="rounded-lg border px-2 py-2 text-sm backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
			/>
		</label>
		<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text-muted);">
			<span>Team</span>
			<select name="team" class="rounded-lg border px-2 py-2 text-sm backdrop-blur-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
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
		<Button variant="secondary" size="sm" type="submit">Apply</Button>
		{#if data.filter.q || data.filter.team}
			<Button variant="ghost" size="sm" href="/mentor/courses">Reset</Button>
		{/if}
	</form>

	<GlassTable>
		<thead>
			<tr>
				<th>Title</th>
				<th>Slug</th>
				<th>Teams</th>
				<th class="text-right">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.nodes as node (node.id)}
				<tr>
					<td class="font-medium">{node.title}</td>
					<td style="color: var(--app-text-muted);">{node.slug}</td>
					<td>
						<div class="flex max-w-[28rem] flex-nowrap gap-1 overflow-x-auto pb-1 whitespace-nowrap">
							{#each teamNamesForNode(node.id) as label}
								<span class="shrink-0 rounded-lg px-2 py-0.5 text-xs" style="background: var(--app-surface-alt); color: var(--app-text);">{label}</span>
							{/each}
						</div>
					</td>
					<td class="text-right">
						<Button variant="ghost" size="sm" href={`/learn/${node.slug}?preview=1`} class="mr-2">Preview</Button>
						<Button variant="secondary" size="sm" href={`/mentor/courses/${node.slug}`}>Edit</Button>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="4" class="px-3 py-6 text-center" style="color: var(--app-text-muted);">No courses found.</td>
				</tr>
			{/each}
		</tbody>
	</GlassTable>
</section>
