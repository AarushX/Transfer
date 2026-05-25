<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';
	let { data, form } = $props();
	const teamsById = $derived(new Map((data.teams as any[]).map((team) => [String(team.id), team])));
	const teamGroupsById = $derived(
		new Map((data.teamGroups as any[]).map((group) => [String(group.id), group]))
	);
	const nodesById = $derived(new Map((data.nodes as any[]).map((node) => [String(node.id), node])));
	let selectedTemplateId = $state((data.templates?.[0]?.id as string | undefined) ?? '');
	let newTitle = $state('');
	let newSlug = $state('');
	let showTemplatePanel = $state(false);
	const selectedTemplate = $derived(
		(data.templates ?? []).find((t: any) => t.id === selectedTemplateId) ?? null
	);
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
		if (labels.length === 0) {
			const node = nodesById.get(String(nodeId));
			const legacyTeamId = String(node?.subteam_id ?? '');
			if (legacyTeamId) {
				const legacyTeam = teamsById.get(legacyTeamId);
				if (legacyTeam) {
					const legacyGroup = teamGroupsById.get(String(legacyTeam.team_group_id ?? ''));
					labels.push(
						legacyGroup?.name ? `${legacyGroup.name}: ${legacyTeam.name}` : String(legacyTeam.name)
					);
				}
			}
		}
		return labels.length > 0 ? labels : ['No team targets'];
	};
</script>

<section class="space-y-5">
	<!-- Header -->
	<div class="fade-up flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div>
				<p class="eyebrow-label" style="margin-bottom: 4px;">Mentor Panel</p>
				<div class="flex items-center gap-2.5">
					<h1 class="text-2xl font-bold tracking-tight">
						<span class="gradient-text">Courses</span>
					</h1>
					<span
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
						style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent); border: 1px solid color-mix(in srgb, var(--app-accent) 30%, transparent);"
					>
						{data.nodes.length}
					</span>
				</div>
			</div>
		</div>
		<div class="flex shrink-0 items-center gap-2 pt-1">
			<a
				href="/courses/map"
				class="rounded-lg border px-3 py-1.5 text-xs font-semibold"
				style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
				>Open full graph</a
			>
			{#if (data.templates ?? []).length > 0}
				<Button variant="ghost" onclick={() => (showTemplatePanel = !showTemplatePanel)}>
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="opacity:.7;">
						<rect
							x="1"
							y="1"
							width="6"
							height="6"
							rx="1.5"
							stroke="currentColor"
							stroke-width="1.5"
						/>
						<rect
							x="9"
							y="1"
							width="6"
							height="6"
							rx="1.5"
							stroke="currentColor"
							stroke-width="1.5"
						/>
						<rect
							x="1"
							y="9"
							width="6"
							height="6"
							rx="1.5"
							stroke="currentColor"
							stroke-width="1.5"
						/>
						<rect
							x="9"
							y="9"
							width="6"
							height="6"
							rx="1.5"
							stroke="currentColor"
							stroke-width="1.5"
						/>
					</svg>
					Use template
				</Button>
			{/if}
			<Button variant="primary" href="/mentor/courses/new">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				New course
			</Button>
		</div>
	</div>

	<!-- Error banner -->
	{#if form?.error}
		<div
			class="flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 35%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 85%, white);"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="shrink:0; opacity:.9;">
				<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
				<path
					d="M8 5v3.5M8 10.5v.5"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
			</svg>
			{form.error}
		</div>
	{/if}

	<!-- Template panel (collapsible) -->
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<div
			class="overflow-hidden rounded-2xl border backdrop-blur-xl"
			style="background: color-mix(in srgb, var(--app-info) 6%, var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-info) 35%, var(--app-glass-border)); box-shadow: var(--app-glass-shadow);"
		>
			<div
				class="flex items-center justify-between border-b px-4 py-3"
				style="border-color: color-mix(in srgb, var(--app-info) 20%, var(--app-glass-border));"
			>
				<div class="flex items-center gap-2">
					<span
						class="inline-flex h-5 w-5 items-center justify-center rounded-md"
						style="background: color-mix(in srgb, var(--app-info) 20%, transparent); color: var(--app-info);"
					>
						<svg width="11" height="11" viewBox="0 0 16 16" fill="none">
							<rect
								x="1"
								y="1"
								width="6"
								height="6"
								rx="1.5"
								stroke="currentColor"
								stroke-width="1.5"
							/>
							<rect
								x="9"
								y="1"
								width="6"
								height="6"
								rx="1.5"
								stroke="currentColor"
								stroke-width="1.5"
							/>
							<rect
								x="1"
								y="9"
								width="6"
								height="6"
								rx="1.5"
								stroke="currentColor"
								stroke-width="1.5"
							/>
							<rect
								x="9"
								y="9"
								width="6"
								height="6"
								rx="1.5"
								stroke="currentColor"
								stroke-width="1.5"
							/>
						</svg>
					</span>
					<span class="text-sm font-semibold" style="color: var(--app-text);"
						>Create from template</span
					>
				</div>
				<button
					onclick={() => (showTemplatePanel = false)}
					class="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
					style="color: var(--app-text-muted);"
					aria-label="Close template panel"
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
						<path
							d="M2 2l12 12M14 2L2 14"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>
			<form method="POST" action="?/createFromTemplate" class="grid gap-3 p-4 md:grid-cols-4">
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium" style="color: var(--app-text-muted);">Template</label>
					<select
						name="template_id"
						class="rounded-lg border px-3 py-2 text-sm transition-colors"
						style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text); outline: none;"
						bind:value={selectedTemplateId}
					>
						{#each data.templates as template (template.id)}
							<option value={template.id}>{template.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium" style="color: var(--app-text-muted);"
						>Course title</label
					>
					<input
						name="title"
						class="rounded-lg border px-3 py-2 text-sm transition-colors"
						style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text); outline: none;"
						bind:value={newTitle}
						placeholder="e.g. Pneumatics Basics"
						required
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium" style="color: var(--app-text-muted);"
						>Slug <span style="color: var(--app-text-dim);">(optional)</span></label
					>
					<input
						name="slug"
						class="rounded-lg border px-3 py-2 font-mono text-sm transition-colors"
						style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text); outline: none;"
						bind:value={newSlug}
						placeholder="pneumatics-basics"
					/>
				</div>
				<div class="flex items-end gap-2">
					<Button variant="primary" size="sm" type="submit">Create course</Button>
					<Button variant="ghost" size="sm" onclick={() => (showTemplatePanel = false)}
						>Cancel</Button
					>
				</div>
			</form>
		</div>
	{/if}

	<!-- Filter row -->
	<form
		method="GET"
		class="fade-up flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;"
	>
		<div class="relative flex-1" style="min-width: 180px;">
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				class="pointer-events-none absolute top-1/2 -translate-y-1/2"
				style="left: 10px; color: var(--app-text-dim);"
			>
				<circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" />
				<path
					d="M10.5 10.5l3.5 3.5"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
				/>
			</svg>
			<input
				name="q"
				value={data.filter.q}
				placeholder="Search courses…"
				class="w-full rounded-xl border py-2 pr-3 text-sm transition-colors"
				style="padding-left: 32px; background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text); outline: none;"
			/>
		</div>
		<select
			name="team"
			class="rounded-xl border px-3 py-2 text-sm transition-colors"
			style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text); outline: none; min-width: 150px;"
		>
			<option value="">All teams</option>
			{#each data.teams as any[] as team}
				<option value={team.id} selected={team.id === data.filter.team}>
					{teamGroupsById.get(String(team.team_group_id ?? ''))?.name
						? `${teamGroupsById.get(String(team.team_group_id ?? ''))?.name}: `
						: ''}{team.name}
				</option>
			{/each}
		</select>
		<Button variant="secondary" size="sm" type="submit">Filter</Button>
		{#if data.filter.q || data.filter.team}
			<Button variant="ghost" size="sm" href="/mentor/courses">Clear</Button>
		{/if}
	</form>

	<!-- Course list — two-panel layout or empty state -->
	{#if data.nodes.length === 0}
		<div
			class="flex flex-col items-center justify-center gap-4 rounded-2xl border py-16 text-center"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<div
				class="flex h-14 w-14 items-center justify-center rounded-2xl"
				style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--app-accent) 25%, transparent);"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					style="color: var(--app-accent);"
				>
					<rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.5" />
					<rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.5" />
					<rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" stroke-width="1.5" />
					<rect
						x="14"
						y="14"
						width="7"
						height="7"
						rx="2"
						stroke="currentColor"
						stroke-width="1.5"
					/>
				</svg>
			</div>
			<div>
				<p class="text-sm font-semibold" style="color: var(--app-text);">
					{data.filter.q || data.filter.team ? 'No courses match your filters' : 'No courses yet'}
				</p>
				<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
					{data.filter.q || data.filter.team
						? 'Try adjusting your search or filter criteria.'
						: 'Create your first course to get started.'}
				</p>
			</div>
			{#if data.filter.q || data.filter.team}
				<Button variant="ghost" size="sm" href="/mentor/courses">Clear filters</Button>
			{:else}
				<Button variant="primary" href="/mentor/courses/new">
					<svg width="13" height="13" viewBox="0 0 16 16" fill="none">
						<path
							d="M8 2v12M2 8h12"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					New course
				</Button>
			{/if}
		</div>
	{:else}
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.nodes as node (node.id)}
				{@const agg = data.aggregates?.[String(node.id)]}
				{@const pct =
					agg && agg.assigned > 0 ? Math.round((agg.completed / agg.assigned) * 100) : 0}
				<li>
					<a
						href={`/mentor/courses/${node.slug}`}
						class="course-row group flex items-center gap-3 rounded-xl border p-3 transition-all"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<p class="truncate font-semibold" style="color: var(--app-text);">{node.title}</p>
								<ProficiencyBadge level={node.proficiency_level} code={node.code} size="xs" />
							</div>
							<p class="truncate text-[11px]" style="color: var(--app-text-muted);">{node.slug}</p>
							{#if agg}
								<div class="mt-1.5 flex items-center gap-2">
									<div
										class="h-1 w-20 rounded-full"
										style="background: color-mix(in srgb, var(--app-glass-border) 70%, transparent);"
									>
										<div
											class="h-full rounded-full"
											style="width: {pct}%; background: linear-gradient(90deg, var(--app-accent), var(--app-info));"
										></div>
									</div>
									<span class="mono text-[10px]" style="color: var(--app-text-muted);">
										{agg.completed} / {agg.assigned}
									</span>
								</div>
							{/if}
						</div>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-4 w-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-90"
							style="color: var(--app-text-muted);"
						>
							<path d="M5 12h14M13 5l7 7-7 7" />
						</svg>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.course-row:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
		transform: translateY(-1px);
	}
</style>
