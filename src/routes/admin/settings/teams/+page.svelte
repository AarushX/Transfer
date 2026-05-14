<script lang="ts">
	import CategoryCrud from '$lib/components/admin/teams/CategoryCrud.svelte';
	import CourseMappingCard from '$lib/components/admin/teams/CourseMappingCard.svelte';
	import MainTeamCrud from '$lib/components/admin/teams/MainTeamCrud.svelte';
	import SubteamCrud from '$lib/components/admin/teams/SubteamCrud.svelte';
	import TeamSelectionBar from '$lib/components/admin/teams/TeamSelectionBar.svelte';
	import type { Category, CourseNode, Link, Subteam, TeamGroup } from '$lib/components/admin/teams/types';

	let { data, form } = $props();

	let selectedTeamId = $state('');
	let selectedSubteamId = $state('');
	let teamCourseSearch = $state('');
	let subteamCourseSearch = $state('');
	let selectedTeamNodeIds = $state<Set<string>>(new Set());
	let selectedSubteamNodeIds = $state<Set<string>>(new Set());
	let savingTeamCourses = $state(false);
	let savingSubteamCourses = $state(false);
	let activeSection = $state<'overview' | 'main' | 'subteams' | 'courses' | 'categories'>('overview');

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

	const selectedTeam = $derived(teamGroups.find((t) => String(t.id) === selectedTeamId) ?? null);
	const selectedSubteam = $derived(subteams.find((s) => String(s.id) === selectedSubteamId) ?? null);
	const selectedTeamName = $derived(selectedTeam?.name ?? 'No main team selected');
	const selectedSubteamName = $derived(selectedSubteam?.name ?? 'No subteam selected');
	const subteamsForSelectedTeam = $derived(
		subteams
			.filter((row) => (selectedTeamId ? (linkedGroupIdsBySubteam.get(String(row.id))?.has(selectedTeamId) ?? false) : false))
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
	);
	const quickAccessOptions = $derived.by(() => {
		const options: Array<{ key: string; teamId: string; subteamId: string; label: string }> = [];
		for (const subteam of subteams) {
			const subteamId = String(subteam.id);
			const linkedGroupIds = linkedGroupIdsBySubteam.get(subteamId) ?? new Set<string>();
			for (const groupId of linkedGroupIds) {
				const group = teamGroups.find((row) => String(row.id) === String(groupId));
				if (!group) continue;
				options.push({
					key: `${group.id}:${subteam.id}`,
					teamId: String(group.id),
					subteamId,
					label: `${group.name}: ${subteam.name}`
				});
			}
		}
		return options.sort((a, b) => a.label.localeCompare(b.label));
	});
	const applyQuickAccess = (value: string) => {
		if (!value) return;
		const selected = quickAccessOptions.find((row) => row.key === value);
		if (!selected) return;
		selectedTeamId = selected.teamId;
		selectedSubteamId = selected.subteamId;
	};

	$effect(() => {
		if (selectedTeamId) return;
		const firstTeamId = String(teamGroups[0]?.id ?? '');
		if (firstTeamId) selectedTeamId = firstTeamId;
	});
	$effect(() => {
		if (!selectedTeamId) {
			selectedSubteamId = '';
			return;
		}
		if (!subteamsForSelectedTeam.some((row) => String(row.id) === selectedSubteamId)) {
			selectedSubteamId = String(subteamsForSelectedTeam[0]?.id ?? '');
		}
	});

	const teamFilteredNodes = $derived.by(() => {
		const needle = teamCourseSearch.trim().toLowerCase();
		if (!needle) return nodes;
		return nodes.filter((node) => `${node.title} ${node.slug}`.toLowerCase().includes(needle));
	});
	const subteamFilteredNodes = $derived.by(() => {
		const needle = subteamCourseSearch.trim().toLowerCase();
		if (!needle) return nodes;
		return nodes.filter((node) => `${node.title} ${node.slug}`.toLowerCase().includes(needle));
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
	const selectAllVisibleTeamCourses = () => {
		const next = new Set(selectedTeamNodeIds);
		for (const node of teamFilteredNodes) next.add(node.id);
		selectedTeamNodeIds = next;
		void persistTeamCourses();
	};
	const clearVisibleTeamCourses = () => {
		const visibleIds = new Set(teamFilteredNodes.map((node) => node.id));
		const next = new Set<string>();
		for (const id of selectedTeamNodeIds) {
			if (!visibleIds.has(id)) next.add(id);
		}
		selectedTeamNodeIds = next;
		void persistTeamCourses();
	};
	const selectAllVisibleSubteamCourses = () => {
		const next = new Set(selectedSubteamNodeIds);
		for (const node of subteamFilteredNodes) next.add(node.id);
		selectedSubteamNodeIds = next;
		void persistSubteamCourses();
	};
	const clearVisibleSubteamCourses = () => {
		const visibleIds = new Set(subteamFilteredNodes.map((node) => node.id));
		const next = new Set<string>();
		for (const id of selectedSubteamNodeIds) {
			if (!visibleIds.has(id)) next.add(id);
		}
		selectedSubteamNodeIds = next;
		void persistSubteamCourses();
	};

	const sectionTabs: Array<{ id: typeof activeSection; label: string; helper: string }> = [
		{ id: 'overview', label: 'Overview', helper: '' },
		{ id: 'main', label: 'Main Teams', helper: 'Create and edit main teams' },
		{ id: 'subteams', label: 'Subteams', helper: 'Manage subteam settings and links' },
		{ id: 'courses', label: 'Select Courses', helper: 'Assign courses to teams' },
		{ id: 'categories', label: 'Categories', helper: 'Configure onboarding categories' }
	];
	const sectionByAction: Record<string, typeof activeSection> = {
		team: 'main',
		'team-update': 'main',
		'team-delete': 'main',
		subteam: 'subteams',
		'subteam-style': 'subteams',
		'subteam-delete': 'subteams',
		'team-courses': 'courses',
		'subteam-courses': 'courses',
		category: 'categories',
		'category-update': 'categories',
		'category-delete': 'categories'
	};
	$effect(() => {
		const section = String(form?.section ?? '');
		if (!section) return;
		const mapped = sectionByAction[section];
		if (mapped) activeSection = mapped;
	});
	$effect(() => {
		const nextTeamId = String(form?.selectedTeamId ?? '');
		if (nextTeamId && teamGroups.some((team) => String(team.id) === nextTeamId)) {
			selectedTeamId = nextTeamId;
		}
		const nextSubteamId = String(form?.selectedSubteamId ?? '');
		if (nextSubteamId && subteams.some((subteam) => String(subteam.id) === nextSubteamId)) {
			selectedSubteamId = nextSubteamId;
		}
	});
	const setSelectedTeamId = (id: string) => (selectedTeamId = id);
	const setSelectedSubteamId = (id: string) => (selectedSubteamId = id);
	const setTeamCourseSearch = (value: string) => (teamCourseSearch = value);
	const setSubteamCourseSearch = (value: string) => (subteamCourseSearch = value);
</script>

<section class="space-y-5 pb-6">
	<div class="fade-up flex items-end justify-between gap-3">
		<div>
			<a href="/admin/settings" class="glass-back-link text-xs" style="color: var(--app-text-muted);">← Workspace</a>
			<p class="eyebrow-label" style="margin-bottom: 2px;">Team Management</p>
			<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Teams</span></h1>
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Manage main teams, subteams, categories, and course targeting in a focused flow.</p>
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

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<div class="fade-up sticky top-2 z-10 space-y-3 rounded-2xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;">
		<TeamSelectionBar
			{teamGroups}
			{subteamsForSelectedTeam}
			{selectedTeamId}
			{selectedSubteamId}
			onTeamChange={setSelectedTeamId}
			onSubteamChange={setSelectedSubteamId}
		/>
		<div class="flex flex-wrap items-center gap-2">
			{#each sectionTabs as tab}
				<button
					type="button"
					class="glass-section-tab rounded-full border px-3 py-1.5 text-sm transition"
					class:active={activeSection === tab.id}
					style={activeSection === tab.id
						? `border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: color-mix(in srgb, var(--app-accent) 80%, white);`
						: `border-color: var(--app-glass-border); background: var(--app-surface); color: var(--app-text-muted);`}
					onclick={() => (activeSection = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
			<select
				class="ml-auto w-full rounded-lg border px-2 py-1.5 text-sm backdrop-blur-sm md:w-auto md:min-w-[260px]"
				style="border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);"
				value=""
				onchange={(event) => applyQuickAccess((event.currentTarget as HTMLSelectElement).value)}
			>
				<option value="">Quick access</option>
				{#each quickAccessOptions as option}
					<option value={option.key}>{option.label}</option>
				{/each}
			</select>
		</div>
		{#if sectionTabs.find((tab) => tab.id === activeSection)?.helper}
			<p class="text-xs" style="color: var(--app-text-muted);">{sectionTabs.find((tab) => tab.id === activeSection)?.helper}</p>
		{/if}
	</div>

	<div class="space-y-4">
		{#if activeSection === 'overview'}
			<div class="grid gap-4 lg:grid-cols-3">
				<button
					type="button"
					class="glass-overview-card group rounded-xl border p-4 text-left transition backdrop-blur-xl"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					onclick={() => (activeSection = 'main')}
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Main Team</p>
							<p class="mt-1 font-semibold" style="color: var(--app-text);">{selectedTeamName}</p>
						</div>
						<span class="transition group-hover:translate-x-0.5" style="color: var(--app-text-muted);">→</span>
					</div>
				</button>
				<button
					type="button"
					class="glass-overview-card group rounded-xl border p-4 text-left transition backdrop-blur-xl"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					onclick={() => (activeSection = 'subteams')}
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Subteam</p>
							<p class="mt-1 font-semibold" style="color: var(--app-text);">{selectedSubteamName}</p>
						</div>
						<span class="transition group-hover:translate-x-0.5" style="color: var(--app-text-muted);">→</span>
					</div>
				</button>
				<button
					type="button"
					class="glass-overview-card group rounded-xl border p-4 text-left transition backdrop-blur-xl"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					onclick={() => (activeSection = 'courses')}
				>
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Select Courses</p>
							<p class="mt-1 font-semibold" style="color: var(--app-text);">{selectedTeamNodeIds.size} / {selectedSubteamNodeIds.size} selected</p>
						</div>
						<span class="transition group-hover:translate-x-0.5" style="color: var(--app-text-muted);">→</span>
					</div>
				</button>
			</div>
			<CategoryCrud {categories} />
		{:else if activeSection === 'main'}
			<MainTeamCrud {selectedTeam} />
		{:else if activeSection === 'subteams'}
			<SubteamCrud
				{teamGroups}
				{categories}
				{selectedSubteam}
				{linkedGroupIdsBySubteam}
				{selectedTeamId}
			/>
		{:else if activeSection === 'courses'}
			<div class="grid gap-4 lg:grid-cols-2">
				<CourseMappingCard
					title="Main Team Courses"
					saving={savingTeamCourses}
					search={teamCourseSearch}
					nodes={teamFilteredNodes}
					selectedNodeIds={selectedTeamNodeIds}
					onSearchChange={setTeamCourseSearch}
					onToggle={toggleTeamCourse}
					onSelectAllVisible={selectAllVisibleTeamCourses}
					onClearVisible={clearVisibleTeamCourses}
				/>
				<CourseMappingCard
					title="Subteam Courses"
					saving={savingSubteamCourses}
					search={subteamCourseSearch}
					nodes={subteamFilteredNodes}
					selectedNodeIds={selectedSubteamNodeIds}
					onSearchChange={setSubteamCourseSearch}
					onToggle={toggleSubteamCourse}
					onSelectAllVisible={selectAllVisibleSubteamCourses}
					onClearVisible={clearVisibleSubteamCourses}
				/>
			</div>
		{:else}
			<CategoryCrud {categories} />
		{/if}
	</div>
</section>

<style>
	.glass-back-link:hover { color: var(--app-text); }
	.glass-section-tab:not(.active):hover { border-color: var(--app-glass-border-hover); background: var(--app-glass-bg-hover); }
	.glass-overview-card:hover { background: var(--app-glass-bg-hover); border-color: var(--app-glass-border-hover); transform: translateY(-2px); }
	.glass-overview-card:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--app-focus-ring); }
</style>
