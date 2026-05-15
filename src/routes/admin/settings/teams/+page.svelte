<script lang="ts">
	import CategoryCrud from '$lib/components/admin/teams/CategoryCrud.svelte';
	import CourseMappingCard from '$lib/components/admin/teams/CourseMappingCard.svelte';
	import MainTeamCrud from '$lib/components/admin/teams/MainTeamCrud.svelte';
	import SubteamCrud from '$lib/components/admin/teams/SubteamCrud.svelte';
	import type { Category, CourseNode, Link, Subteam, TeamGroup } from '$lib/components/admin/teams/types';

	let { data, form } = $props();

	// ── Selection model ──────────────────────────────────────────────────────────
	type Selection =
		| { kind: 'team'; teamId: string }
		| { kind: 'subteam'; subteamId: string }
		| { kind: 'categories' }
		| null;

	let selection = $state<Selection>(null);

	// ── Data ─────────────────────────────────────────────────────────────────────
	const teamGroups = $derived((data.teamGroups as TeamGroup[]) ?? []);
	const subteams = $derived((data.subteams as Subteam[]) ?? []);
	const categories = $derived((data.categories as Category[]) ?? []);
	const nodes = $derived((data.nodes as CourseNode[]) ?? []);

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
	const linkedGroupIdsBySubteam = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of data.subteamLinks as Link[]) {
			const set = map.get(String(row.team_id)) ?? new Set<string>();
			set.add(String(row.team_group_id));
			map.set(String(row.team_id), set);
		}
		return map;
	});

	// ── Derived selection IDs ────────────────────────────────────────────────────
	const selectedTeamId = $derived.by(() => {
		if (selection?.kind === 'team') return selection.teamId;
		if (selection?.kind === 'subteam') {
			const linked = linkedGroupIdsBySubteam.get(selection.subteamId);
			const first = linked ? Array.from(linked)[0] : undefined;
			if (first) return first;
			// Fall back to the subteam's primary team_group_id when no explicit link row exists
			return String(
				subteams.find((s) => String(s.id) === selection.subteamId)?.team_group_id ?? ''
			);
		}
		return '';
	});
	const selectedSubteamId = $derived(selection?.kind === 'subteam' ? selection.subteamId : '');

	const selectedTeam = $derived(teamGroups.find((t) => String(t.id) === selectedTeamId) ?? null);
	const selectedSubteam = $derived(subteams.find((s) => String(s.id) === selectedSubteamId) ?? null);
	const selectedTeamName = $derived(selectedTeam?.name ?? 'Team');
	const selectedSubteamName = $derived(selectedSubteam?.name ?? 'Subteam');

	// ── Auto-select first team on mount ──────────────────────────────────────────
	$effect(() => {
		if (selection !== null) return;
		const firstId = String(teamGroups[0]?.id ?? '');
		if (firstId) selection = { kind: 'team', teamId: firstId };
	});

	// ── Form-feedback effect — sync selection after server action ────────────────
	$effect(() => {
		const section = String(form?.section ?? '');
		if (!section) return;
		const nextTeamId = String(form?.selectedTeamId ?? '');
		const nextSubteamId = String(form?.selectedSubteamId ?? '');
		if (
			section === 'category' ||
			section === 'category-update' ||
			section === 'category-delete'
		) {
			selection = { kind: 'categories' };
		} else if (nextSubteamId && subteams.some((s) => String(s.id) === nextSubteamId)) {
			selection = { kind: 'subteam', subteamId: nextSubteamId };
		} else if (nextTeamId && teamGroups.some((t) => String(t.id) === nextTeamId)) {
			selection = { kind: 'team', teamId: nextTeamId };
		}
	});

	// ── Course search / selection ─────────────────────────────────────────────────
	let teamCourseSearch = $state('');
	let subteamCourseSearch = $state('');
	let selectedTeamNodeIds = $state<Set<string>>(new Set());
	let selectedSubteamNodeIds = $state<Set<string>>(new Set());
	let savingTeamCourses = $state(false);
	let savingSubteamCourses = $state(false);

	const teamFilteredNodes = $derived.by(() => {
		const needle = teamCourseSearch.trim().toLowerCase();
		if (!needle) return nodes;
		return nodes.filter((n) => `${n.title} ${n.slug}`.toLowerCase().includes(needle));
	});
	const subteamFilteredNodes = $derived.by(() => {
		const needle = subteamCourseSearch.trim().toLowerCase();
		if (!needle) return nodes;
		return nodes.filter((n) => `${n.title} ${n.slug}`.toLowerCase().includes(needle));
	});

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
			for (const id of selectedTeamNodeIds) payload.append('node_ids', id);
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
			for (const id of selectedSubteamNodeIds) payload.append('node_ids', id);
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
	const selectAllVisibleTeamCourses = () => {
		const next = new Set(selectedTeamNodeIds);
		for (const n of teamFilteredNodes) next.add(n.id);
		selectedTeamNodeIds = next;
		void persistTeamCourses();
	};
	const clearVisibleTeamCourses = () => {
		const visible = new Set(teamFilteredNodes.map((n) => n.id));
		const next = new Set<string>();
		for (const id of selectedTeamNodeIds) if (!visible.has(id)) next.add(id);
		selectedTeamNodeIds = next;
		void persistTeamCourses();
	};
	const selectAllVisibleSubteamCourses = () => {
		const next = new Set(selectedSubteamNodeIds);
		for (const n of subteamFilteredNodes) next.add(n.id);
		selectedSubteamNodeIds = next;
		void persistSubteamCourses();
	};
	const clearVisibleSubteamCourses = () => {
		const visible = new Set(subteamFilteredNodes.map((n) => n.id));
		const next = new Set<string>();
		for (const id of selectedSubteamNodeIds) if (!visible.has(id)) next.add(id);
		selectedSubteamNodeIds = next;
		void persistSubteamCourses();
	};

	const setTeamCourseSearch = (v: string) => (teamCourseSearch = v);
	const setSubteamCourseSearch = (v: string) => (subteamCourseSearch = v);

	// ── Sidebar helpers ───────────────────────────────────────────────────────────
	const isTeamActive = (id: string) => selection?.kind === 'team' && selection.teamId === String(id);
	const isSubteamActive = (id: string) => selection?.kind === 'subteam' && selection.subteamId === String(id);
	const activePill = 'background: linear-gradient(90deg, color-mix(in srgb, var(--app-accent) 30%, transparent), color-mix(in srgb, var(--app-accent) 15%, transparent)); color: var(--app-text);';
	const inactivePill = 'color: var(--app-text-muted);';

	// Subteams linked to a given team group, sorted alphabetically.
	// A subteam appears under each team_group it links to, so "Linked main teams"
	// edits in SubteamCrud show up here without reloading.
	const subteamsForTeam = (teamId: string) =>
		subteams
			.filter((s) => {
				const linked = linkedGroupIdsBySubteam.get(String(s.id));
				if (linked?.has(teamId)) return true;
				// Fall back to the primary team_group_id so subteams without explicit
				// link rows still appear under their parent team.
				return !linked?.size && String(s.team_group_id) === teamId;
			})
			.sort((a, b) => a.name.localeCompare(b.name));

	const linkedGroupsForSubteam = (subteamId: string): TeamGroup[] => {
		const ids = linkedGroupIdsBySubteam.get(String(subteamId));
		if (!ids || ids.size <= 1) return [];
		return teamGroups
			.filter((g) => ids.has(String(g.id)))
			.sort((a, b) => a.name.localeCompare(b.name));
	};
</script>

<section class="space-y-5 pb-6">
	<!-- Header -->
	<div class="fade-up flex items-end justify-between gap-3">
		<div>
			<a href="/admin/settings" class="glass-back-link text-xs" style="color: var(--app-text-muted);">← Workspace</a>
			<p class="eyebrow-label" style="margin-bottom: 2px;">Team Management</p>
			<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Teams</span></h1>
		</div>
		<div class="grid grid-cols-3 gap-2 text-xs">
			<div class="rounded-xl border px-3 py-2 text-center backdrop-blur-xl" style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);">
				<p class="eyebrow-label">Main teams</p>
				<p class="mono mt-1 text-lg font-bold" style="color: var(--app-text);">{teamGroups.length}</p>
			</div>
			<div class="rounded-xl border px-3 py-2 text-center backdrop-blur-xl" style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);">
				<p class="eyebrow-label">Subteams</p>
				<p class="mono mt-1 text-lg font-bold" style="color: var(--app-text);">{subteams.length}</p>
			</div>
			<div class="rounded-xl border px-3 py-2 text-center backdrop-blur-xl" style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);">
				<p class="eyebrow-label">Categories</p>
				<p class="mono mt-1 text-lg font-bold" style="color: var(--app-text);">{categories.length}</p>
			</div>
		</div>
	</div>

	<!-- Banners -->
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<!-- Master-detail layout -->
	<div class="grid gap-4 md:grid-cols-[280px_1fr]">

		<!-- Sidebar -->
		<aside class="rounded-2xl border p-3 backdrop-blur-xl md:self-start md:sticky md:top-2" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">

			<!-- Main Teams section -->
			<div class="mb-4">
				<p class="eyebrow-label px-2.5 mb-2">Main Teams</p>
				<ul class="space-y-0.5">
					{#each teamGroups as team (team.id)}
						<li>
							<button
								type="button"
								onclick={() => (selection = { kind: 'team', teamId: String(team.id) })}
								class="sidebar-btn w-full text-left rounded-lg px-2.5 py-1.5 text-sm font-medium"
								style={isTeamActive(String(team.id)) ? activePill : inactivePill}
							>
								{team.name}
							</button>
							<!-- Linked subteams (indented) -->
							{#if isTeamActive(String(team.id))}
								<ul class="ml-3 mt-0.5 space-y-0.5 border-l pl-2" style="border-color: var(--app-glass-border);">
									{#each subteamsForTeam(String(team.id)) as sub (sub.id)}
										{@const linkedGroups = linkedGroupsForSubteam(String(sub.id))}
										<li>
											<button
												type="button"
												onclick={() => (selection = { kind: 'subteam', subteamId: String(sub.id) })}
												class="sidebar-btn w-full text-left rounded-lg px-2 py-1 text-xs flex items-center gap-1.5"
												style={isSubteamActive(String(sub.id)) ? activePill : inactivePill}
											>
												<span class="truncate flex-1">{sub.name}</span>
												{#if linkedGroups.length > 0}
													<span
														class="link-pill relative grid h-4 w-4 place-items-center rounded-full"
														style="background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-accent);"
														aria-label="Linked to {linkedGroups.map((g) => g.name).join(', ')}"
													>
														<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-2.5 w-2.5">
															<path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07L11.5 5.5"/>
															<path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07L12.5 18.5"/>
														</svg>
														<span class="link-tooltip pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] opacity-0"
															style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text); box-shadow: var(--app-glass-shadow); backdrop-filter: blur(12px); transition: opacity 0.15s ease;">
															Linked: {linkedGroups.map((g) => g.name).join(', ')}
														</span>
													</span>
												{/if}
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{:else}
						<li class="px-2.5 py-1.5 text-xs" style="color: var(--app-text-muted);">No main teams yet.</li>
					{/each}
				</ul>
				<button
					type="button"
					onclick={() => (selection = { kind: 'team', teamId: '' })}
					class="sidebar-btn mt-1.5 w-full text-left rounded-lg px-2.5 py-1.5 text-xs"
					style={selection?.kind === 'team' && selection.teamId === '' ? activePill : inactivePill}
				>
					+ New main team
				</button>
			</div>

			<!-- New-subteam shortcut (the flat "All Subteams" list was removed;
			     subteams now live exclusively under their parent team headers above) -->
			<div class="mb-4">
				<button
					type="button"
					onclick={() => (selection = { kind: 'subteam', subteamId: '' })}
					class="sidebar-btn w-full text-left rounded-lg px-2.5 py-1.5 text-xs"
					style={selection?.kind === 'subteam' && selection.subteamId === '' ? activePill : inactivePill}
				>
					+ New subteam
				</button>
			</div>

			<!-- Categories -->
			<div>
				<button
					type="button"
					onclick={() => (selection = { kind: 'categories' })}
					class="sidebar-btn w-full text-left rounded-lg px-2.5 py-1.5 text-sm font-medium"
					style={selection?.kind === 'categories' ? activePill : inactivePill}
				>
					<span class="eyebrow-label" style="color: inherit;">Categories</span>
				</button>
			</div>
		</aside>

		<!-- Detail panel -->
		<div class="min-w-0 space-y-4">
			{#if selection?.kind === 'team'}
				<MainTeamCrud {selectedTeam} />
				{#if selectedTeam}
					<CourseMappingCard
						title="Courses for {selectedTeamName}"
						saving={savingTeamCourses}
						search={teamCourseSearch}
						nodes={teamFilteredNodes}
						selectedNodeIds={selectedTeamNodeIds}
						onSearchChange={setTeamCourseSearch}
						onToggle={toggleTeamCourse}
						onSelectAllVisible={selectAllVisibleTeamCourses}
						onClearVisible={clearVisibleTeamCourses}
					/>
				{/if}
			{:else if selection?.kind === 'subteam'}
				<SubteamCrud
					{teamGroups}
					{categories}
					{selectedSubteam}
					{linkedGroupIdsBySubteam}
					{selectedTeamId}
				/>
				{#if selectedSubteam}
					<CourseMappingCard
						title="Courses for {selectedSubteamName}"
						saving={savingSubteamCourses}
						search={subteamCourseSearch}
						nodes={subteamFilteredNodes}
						selectedNodeIds={selectedSubteamNodeIds}
						onSearchChange={setSubteamCourseSearch}
						onToggle={toggleSubteamCourse}
						onSelectAllVisible={selectAllVisibleSubteamCourses}
						onClearVisible={clearVisibleSubteamCourses}
					/>
				{/if}
			{:else if selection?.kind === 'categories'}
				<CategoryCrud {categories} />
			{:else}
				<div class="rounded-2xl border p-8 text-center" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<p style="color: var(--app-text-muted);">Select a team or subteam on the left to edit it.</p>
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.glass-back-link:hover { color: var(--app-text); }
	.sidebar-btn { transition: background 0.15s, color 0.15s; }
	.sidebar-btn:hover:not([style*="linear-gradient"]) { background: var(--app-glass-bg-hover); color: var(--app-text); }
	.link-pill:hover .link-tooltip { opacity: 1; }
</style>
