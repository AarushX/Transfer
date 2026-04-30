<script lang="ts">
	import SearchField from '$lib/components/ui/SearchField.svelte';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';

type Node = { id: string; title: string; slug: string; subteam_id: string; video_url?: string | null };
	type Status = { node_id: string; computed_status: string };
	type ProfileTeam = {
		team_id: string;
		team_group_id: string;
		category_slug?: string | null;
	};
	type ProfileTeamGroup = { team_group_id: string; team_groups?: { designator?: string | null } | null };
	type NodeTeamTarget = { node_id: string; team_id: string };
	type NodeTeamGroupTarget = { node_id: string; team_group_id: string };
	type CheckoffReview = { node_id: string; status: 'needs_review' | 'blocked'; updated_at: string };
	type PrereqEdge = { node_id: string; prerequisite_node_id: string };
type NodeBlockRow = { node_id: string; id: string };
type BlockProgressRow = { node_id: string; block_id: string; completed_at: string | null };

let { data, form } = $props();
	const teamById = $derived(
		new Map(
			((data.teams as Array<{ id: string; name?: string; category_slug?: string }>) ?? []).map((row) => [
				String(row.id),
				row
			])
		)
	);

	const statusMap = $derived(new Map((data.statuses as Status[]).map((s) => [s.node_id, s.computed_status])));
	const checkoffReviewMap = $derived(
		new Map((data.checkoffReviews as CheckoffReview[]).map((r) => [r.node_id, r]))
	);

	const effectiveStatusFor = (nodeId: string): string => {
		const base = statusMap.get(nodeId) ?? 'locked';
		if (base === 'mentor_checkoff_pending') {
			const review = checkoffReviewMap.get(nodeId);
			if (review?.status === 'needs_review') return 'checkoff_needs_review';
			if (review?.status === 'blocked') return 'checkoff_blocked';
		}
		return base;
	};

	let filter = $state('');
	let showCompletedCourses = $state(false);
	let activeCourseScope = $state('all');

	const filtered = $derived.by(() => {
		const needle = filter.trim().toLowerCase();
		return (data.nodes as Node[]).filter((n) => {
			if (!needle) return true;
			return n.title.toLowerCase().includes(needle) || n.slug.toLowerCase().includes(needle);
		});
	});

	const userTeamIds = $derived(
		new Set(((data.profileTeams as ProfileTeam[]) ?? []).map((row) => String(row.team_id)))
	);
	const selectedMainTeamLabel = $derived.by(() => {
		const primaryTeamGroupId = String((data as any).primaryTeamGroupId ?? '');
		if (!primaryTeamGroupId) return 'Unset';
		const group = ((data.teamGroups as Array<{ id: string; name?: string }>) ?? []).find(
			(row) => String(row.id) === primaryTeamGroupId
		);
		return String(group?.name ?? 'Unset');
	});
	const selectedSubteamLabels = $derived.by(() =>
		((data.profileTeams as ProfileTeam[]) ?? [])
			.map((row) => String(teamById.get(String(row.team_id))?.name ?? '').trim())
			.filter(Boolean)
	);
	const userTeamGroupIds = $derived(
		new Set(
			((data.profileTeamGroups as ProfileTeamGroup[]) ?? []).map((row) =>
				String(row.team_group_id)
			)
		)
	);
	const onboardingRequiredDesignators = $derived(
		new Set(
			((data.requiredOnboardingCategories as Array<{ slug: string }>) ?? []).map((row) => String(row.slug))
		)
	);
	const selectedDesignators = $derived(
		new Set(
			((data.profileTeams as ProfileTeam[]) ?? [])
				.map((row) => String(row.category_slug ?? ''))
				.filter(Boolean)
		)
	);
	const needsOnboarding = $derived.by(() => {
		if ((data.profile as { is_parent_guardian?: boolean } | null)?.is_parent_guardian) return false;
		if (userTeamIds.size === 0 || userTeamGroupIds.size === 0) return true;
		if (!String((data as any).primaryTeamGroupId ?? '')) return true;
		for (const required of onboardingRequiredDesignators) {
			if (!selectedDesignators.has(required)) return true;
		}
		return false;
	});
	const teamColorById = $derived(
		new Map(
			((data.teams as Array<{ id: string; color_hex?: string | null }>) ?? []).map((row) => [
				String(row.id),
				String(row.color_hex ?? '')
			])
		)
	);
	const teamGroupColorById = $derived(
		new Map(
			((data.teamGroups as Array<{ id: string; color_hex?: string | null }>) ?? []).map((row) => [
				String(row.id),
				String(row.color_hex ?? '')
			])
		)
	);
	const accentColorForNode = (nodeId: string) => {
		const teamTargets = targetTeamIdsByNode.get(String(nodeId));
		if (teamTargets) {
			for (const teamId of userTeamIds) {
				if (teamTargets.has(teamId)) {
					const color = teamColorById.get(teamId);
					if (color) return color;
				}
			}
		}
		const groupTargets = targetTeamGroupIdsByNode.get(String(nodeId));
		if (groupTargets) {
			for (const groupId of userTeamGroupIds) {
				if (groupTargets.has(groupId)) {
					const color = teamGroupColorById.get(groupId);
					if (color) return color;
				}
			}
		}
		return '';
	};
	const targetTeamIdsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of (data.nodeTeamTargets as NodeTeamTarget[]) ?? []) {
			const set = map.get(String(row.node_id)) ?? new Set<string>();
			set.add(String(row.team_id));
			map.set(String(row.node_id), set);
		}
		return map;
	});
	const targetTeamGroupIdsByNode = $derived.by(() => {
		const map = new Map<string, Set<string>>();
		for (const row of (data.nodeTeamGroupTargets as NodeTeamGroupTarget[]) ?? []) {
			const set = map.get(String(row.node_id)) ?? new Set<string>();
			set.add(String(row.team_group_id));
			map.set(String(row.node_id), set);
		}
		return map;
	});
	const prerequisites = $derived((data.prerequisites as PrereqEdge[]) ?? []);
	const prereqDependentsCount = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const edge of prerequisites) {
			map[edge.prerequisite_node_id] = (map[edge.prerequisite_node_id] ?? 0) + 1;
		}
		return map;
	});

	const inPrimaryTeam = (node: Node) => {
		const target = targetTeamIdsByNode.get(String(node.id));
		const targetGroups = targetTeamGroupIdsByNode.get(String(node.id));
		const hasTeamTargets = Boolean(target && target.size > 0);
		const hasGroupTargets = Boolean(targetGroups && targetGroups.size > 0);
		if (!hasTeamTargets && !hasGroupTargets) return true;
		if (userTeamIds.size === 0 && userTeamGroupIds.size === 0) return true;
		for (const teamId of userTeamIds) {
			if (target?.has(teamId)) return true;
		}
		for (const groupId of userTeamGroupIds) {
			if (targetGroups?.has(groupId)) return true;
		}
		return false;
	};
	const byPriority = (a: Node, b: Node) => {
		const depDelta = (prereqDependentsCount[b.id] ?? 0) - (prereqDependentsCount[a.id] ?? 0);
		if (depDelta !== 0) return depDelta;
		return a.title.localeCompare(b.title);
	};

	const primaryNodes = $derived(filtered.filter(inPrimaryTeam));
	const scopeCards = $derived.by(() => {
		const cards: Array<{
			key: string;
			label: string;
			courseCount: number;
			completedCount: number;
			progressPct: number;
			leftCount: number;
			teamId?: string;
			teamGroupId?: string;
			color?: string;
		}> = [];
		const allTotal = primaryNodes.length;
		const allCompleted = primaryNodes.filter((n) => effectiveStatusFor(n.id) === 'completed').length;
		cards.push({
			key: 'all',
			label: 'All courses',
			courseCount: allTotal,
			completedCount: allCompleted,
			progressPct: allTotal ? Math.round((allCompleted / allTotal) * 100) : 0,
			leftCount: Math.max(0, allTotal - allCompleted)
		});

		const seen = new Set<string>();
		for (const row of (data.profileTeams as ProfileTeam[]) ?? []) {
			const teamId = String(row.team_id);
			if (!teamId || seen.has(teamId)) continue;
			seen.add(teamId);
			const teamName = String(teamById.get(teamId)?.name ?? 'Team');
			const teamGroupId = String(row.team_group_id ?? '');
			const teamNodes = primaryNodes.filter((node) => {
				const teamTargets = targetTeamIdsByNode.get(String(node.id));
				const groupTargets = targetTeamGroupIdsByNode.get(String(node.id));
				if (teamTargets?.has(teamId)) return true;
				if (teamGroupId && groupTargets?.has(teamGroupId)) return true;
				return !teamTargets?.size && !groupTargets?.size;
			});
			const completed = teamNodes.filter((n) => effectiveStatusFor(n.id) === 'completed').length;
			const total = teamNodes.length;
			cards.push({
				key: `team:${teamId}`,
				label: teamName,
				courseCount: total,
				completedCount: completed,
				progressPct: total ? Math.round((completed / total) * 100) : 0,
				leftCount: Math.max(0, total - completed),
				teamId,
				teamGroupId: teamGroupId || undefined,
				color: accentColorForNode(teamNodes[0]?.id ?? '') || teamColorById.get(teamId) || ''
			});
		}
		return cards;
	});
	const scopedNodes = $derived.by(() => {
		if (activeCourseScope === 'all') return primaryNodes;
		const selected = scopeCards.find((card) => card.key === activeCourseScope);
		if (!selected?.teamId) return primaryNodes;
		return primaryNodes.filter((node) => {
			const teamTargets = targetTeamIdsByNode.get(String(node.id));
			const groupTargets = targetTeamGroupIdsByNode.get(String(node.id));
			if (teamTargets?.has(selected.teamId!)) return true;
			if (selected.teamGroupId && groupTargets?.has(selected.teamGroupId)) return true;
			return !teamTargets?.size && !groupTargets?.size;
		});
	});
	const takeableStatuses = ['available', 'video_pending', 'quiz_pending'];

	const takeablePrimary = $derived(
		scopedNodes
		.filter((n) => takeableStatuses.includes(effectiveStatusFor(n.id)) && !hasPartialProgress(n.id))
			.slice()
			.sort(byPriority)
	);
	const inProgressPrimary = $derived(
		scopedNodes
			.filter((n) =>
			['mentor_checkoff_pending', 'checkoff_needs_review', 'checkoff_blocked'].includes(
				effectiveStatusFor(n.id)
			) ||
			(takeableStatuses.includes(effectiveStatusFor(n.id)) && hasPartialProgress(n.id))
			)
			.slice()
			.sort(byPriority)
	);
	const lockedPrimary = $derived(
		scopedNodes
			.filter((n) => effectiveStatusFor(n.id) === 'locked')
			.slice()
			.sort(byPriority)
	);
const normalPrimary = $derived([...takeablePrimary, ...lockedPrimary]);
	const completedPrimary = $derived(
		scopedNodes
			.filter((n) => effectiveStatusFor(n.id) === 'completed')
			.slice()
			.sort(byPriority)
	);

	const statusLabel = (status: string) =>
		({
			locked: 'Locked',
			available: 'Ready',
			video_pending: 'In video',
			quiz_pending: 'In progress',
			mentor_checkoff_pending: 'Awaiting mentor',
			checkoff_needs_review: 'Redo checkoff',
			checkoff_blocked: 'Blocked',
			completed: 'Completed'
		})[status] ?? status;
	const statusTone = (status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' => {
		if (status === 'completed') return 'success';
		if (status === 'mentor_checkoff_pending') return 'info';
		if (status === 'checkoff_needs_review' || status === 'quiz_pending') return 'warning';
		if (status === 'checkoff_blocked') return 'danger';
		return 'neutral';
	};

const courseCardClass = (status: string) => {
	const base =
		'group block rounded-2xl border p-4 transition duration-150 hover:border-slate-500 hover:bg-slate-800/80';
	if (status === 'available' || status === 'video_pending' || status === 'quiz_pending') {
		return `${base} border-slate-700 bg-slate-900/70 text-slate-100`;
	}
	if (
		status === 'mentor_checkoff_pending' ||
		status === 'checkoff_needs_review' ||
		status === 'checkoff_blocked'
	) {
		return `${base} border-slate-700 bg-slate-900/70 text-slate-100`;
	}
	if (status === 'completed') {
		return `${base} border-slate-700 bg-slate-900/60 text-slate-200`;
	}
	return `${base} border-slate-700 bg-slate-900/65 text-slate-200`;
};
const teamNameById = $derived(
	new Map(
		((data.teams as Array<{ id: string; name?: string | null }>) ?? []).map((row) => [
			String(row.id),
			String(row.name ?? '')
		])
	)
);
const teamGroupNameById = $derived(
	new Map(
		((data.teamGroups as Array<{ id: string; name?: string | null }>) ?? []).map((row) => [
			String(row.id),
			String(row.name ?? '')
		])
	)
);
const linkedTeamLabelForNode = (nodeId: string) => {
	const teamTargets = targetTeamIdsByNode.get(String(nodeId));
	if (teamTargets) {
		for (const teamId of userTeamIds) {
			if (!teamTargets.has(teamId)) continue;
			const name = teamNameById.get(teamId);
			if (name) return name;
		}
	}
	const groupTargets = targetTeamGroupIdsByNode.get(String(nodeId));
	if (groupTargets) {
		for (const groupId of userTeamGroupIds) {
			if (!groupTargets.has(groupId)) continue;
			const name = teamGroupNameById.get(groupId);
			if (name) return name;
		}
	}
	return 'General';
};
const teamChipStyleForNode = (nodeId: string) => {
	const accent = accentColorForNode(nodeId);
	if (!accent) return '';
	return `background: color-mix(in srgb, ${accent} 22%, transparent); border-color: color-mix(in srgb, ${accent} 70%, #334155); color: color-mix(in srgb, ${accent} 35%, #f8fafc);`;
};
const progressPercentForCard = (nodeId: string, status: string) => {
	const total = totalModulesForNode(nodeId);
	const done = Math.min(blockDoneByNode[nodeId] ?? 0, total);
	if (total > 0) return Math.round((done / total) * 100);
	return status === 'completed' ? 100 : 0;
};
const blockTotalsByNode = $derived.by(() => {
	const out: Record<string, number> = {};
	for (const row of data.blockRows as NodeBlockRow[]) {
		out[row.node_id] = (out[row.node_id] ?? 0) + 1;
	}
	return out;
});
const totalModulesForNode = (nodeId: string) => blockTotalsByNode[nodeId] ?? 0;
const blockDoneByNode = $derived.by(() => {
	const out: Record<string, number> = {};
	for (const row of data.blockProgress as BlockProgressRow[]) {
		if (!row.completed_at) continue;
		out[row.node_id] = (out[row.node_id] ?? 0) + 1;
	}
	return out;
});
const hasPartialProgress = (nodeId: string) => {
	const total = totalModulesForNode(nodeId);
	if (!total) return false;
	const done = Math.min(blockDoneByNode[nodeId] ?? 0, total);
	return done > 0 && done < total;
};
</script>

<section class="-mx-6 space-y-0 md:-mx-10">
	<div class="space-y-0 divide-y divide-slate-800/80">
		{#if data.profile?.is_parent_guardian}
			<div class="bg-slate-950/30 px-6 py-5 md:px-10">
				<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Parent Linking</p>
							<p class="mt-1 text-sm text-slate-300">
								Enter the student-generated link code from their profile to connect accounts.
							</p>
							<p class="mt-1 text-xs text-slate-500">
								Application status: {String(data.parentApplicationStatus ?? 'not_started').replaceAll('_', ' ')}
							</p>
						</div>
					</div>
					{#if form?.error}
						<p class="mt-2 rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">
							{form.error}
						</p>
					{:else if form?.ok && form?.section === 'parent-link'}
						<p class="mt-2 rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">
							Student linked successfully.
						</p>
					{/if}
					<form method="POST" action="?/linkStudentByCode" class="mt-3 flex flex-wrap items-center gap-2">
						<input
							name="code"
							required
							class="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm uppercase"
							placeholder="AB12CD34"
							disabled={String(data.parentApplicationStatus ?? '') !== 'approved'}
						/>
						<button
							class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
							disabled={String(data.parentApplicationStatus ?? '') !== 'approved'}
						>
							Link student
						</button>
					</form>
					{#if String(data.parentApplicationStatus ?? '') !== 'approved'}
						<p class="mt-2 text-xs text-slate-500">
							Linking unlocks after admin approval.
						</p>
					{/if}
					<div class="mt-3 space-y-1">
						<p class="text-xs uppercase tracking-wide text-slate-500">Linked students</p>
						{#each data.linkedStudents ?? [] as student}
							<p class="text-sm text-slate-300">{student.full_name || student.email}</p>
						{:else}
							<p class="text-sm text-slate-500">No linked students yet.</p>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		{#if needsOnboarding}
			<div class="bg-amber-950/20 px-6 py-5 md:px-10">
				<p class="text-sm font-semibold text-amber-100">Finish onboarding</p>
				<p class="mt-1 text-xs text-amber-200/90">
					Choose your team and subteam to unlock the right course path.
				</p>
				<a
					href="/onboarding"
					class="mt-3 inline-flex rounded bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300"
				>
					Start onboarding
				</a>
			</div>
		{/if}

		{#if !needsOnboarding}
			<div class="bg-slate-950/40 px-6 py-5 md:px-10">
				<div class="flex flex-wrap items-center gap-3">
					<div class="mr-auto flex items-center gap-2">
						<h2 class="text-lg font-semibold">My Courses</h2>
						<button
							type="button"
							onclick={() => {
								activeCourseScope = 'all';
								showCompletedCourses = false;
							}}
							class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
								activeCourseScope === 'all'
									? 'border-sky-500/60 bg-sky-950/30 text-sky-100'
									: 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-600 hover:text-slate-100'
							}`}
						>
							All courses
						</button>
					</div>
					<div class="w-full md:w-80">
						<SearchField
							bind:value={filter}
							placeholder="Search courses..."
							fieldClass="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5"
						/>
					</div>
				</div>
			</div>
			<div class="bg-slate-950/10 px-6 py-5 md:px-10">
				<div class="flex gap-3 overflow-x-auto pb-1">
					{#each scopeCards.filter((card) => card.key !== 'all') as card (card.key)}
						<button
							type="button"
							onclick={() => {
								activeCourseScope = card.key;
								showCompletedCourses = false;
							}}
							class={`min-w-56 shrink-0 rounded-xl border p-4 text-left transition ${
								activeCourseScope === card.key
									? 'border-slate-500 bg-slate-900'
									: 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80'
							}`}
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate text-sm font-semibold">{card.label}</p>
								</div>
								<span
									class="rounded-full px-2 py-0.5 text-[11px]"
									style={card.color
										? `background: color-mix(in srgb, ${card.color} 22%, transparent); color: color-mix(in srgb, ${card.color} 35%, #f8fafc);`
										: 'background:#1e293b;color:#cbd5e1;'}
								>
									{card.leftCount} left
								</span>
							</div>
							<p class="mt-1 text-xs text-slate-400">
								{card.completedCount}/{card.courseCount} complete
							</p>
							<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
								<div
									class="h-full rounded-full transition-all duration-300"
									style={`width:${card.progressPct}%; background:${card.color || '#64748b'};`}
								></div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			{#if filtered.length === 0}
				<p class="px-6 py-6 text-sm text-slate-400 md:px-10">No courses match your filter.</p>
			{/if}

			<div class="flex flex-col">
				<div
					class={`flex flex-col gap-4 px-6 py-5 md:px-10 ${completedPrimary.length === 0 ? 'pb-8' : 'pb-20'}`}
				>
					<div class="space-y-4">
						{#if inProgressPrimary.length > 0}
							<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{#each inProgressPrimary as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									<a
										href={`/learn/${node.slug}`}
										class={courseCardClass(status)}
									>
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0 flex-1">
												<p class="truncate text-base font-semibold">{node.title}</p>
											</div>
											<span class="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-200" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs">
											{#if status !== 'available'}
												<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
											{/if}
										</div>
										<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
											<div
												class="h-full rounded-full transition-all duration-300"
												style={`width:${progressPercentForCard(node.id, status)}%; background:${accentColorForNode(node.id) || '#64748b'};`}
											></div>
										</div>
									</a>
								{/each}
							</div>
						{/if}

						{#if normalPrimary.length > 0}
							<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{#each normalPrimary as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									<a
										href={`/learn/${node.slug}`}
										class={courseCardClass(status)}
									>
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 flex-1 truncate text-base font-semibold">{node.title}</p>
											<span class="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-200" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs">
											{#if status !== 'available'}
												<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
											{/if}
										</div>
										<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
											<div
												class="h-full rounded-full transition-all duration-300"
												style={`width:${progressPercentForCard(node.id, status)}%; background:${accentColorForNode(node.id) || '#64748b'};`}
											></div>
										</div>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				{#if completedPrimary.length > 0}
					<div class="fixed right-0 bottom-0 left-0 z-30 md:left-64">
						<div class="mx-auto w-full max-w-screen-2xl border-t border-slate-800/80 bg-slate-950/95 px-6 py-4 backdrop-blur md:px-10">
						{#if showCompletedCourses}
							<div class="absolute inset-x-0 bottom-full mb-2 px-6 md:px-10">
								<div class="max-h-[45vh] overflow-y-auto rounded-t-xl border border-slate-800/80 border-b-0 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
									<div class="grid gap-2">
										{#each completedPrimary as node (node.id)}
											{@const status = effectiveStatusFor(node.id)}
											<a
												href={`/learn/${node.slug}`}
												class="group block rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-slate-200 transition duration-150 hover:border-slate-700 hover:bg-slate-900/70"
											>
												<div class="flex items-start justify-between gap-3">
													<p class="min-w-0 flex-1 truncate text-sm font-medium">{node.title}</p>
													<span class="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-200" style={teamChipStyleForNode(node.id)}>
														{linkedTeamLabelForNode(node.id)}
													</span>
												</div>
											</a>
										{/each}
									</div>
								</div>
							</div>
						{/if}
						<button
							type="button"
							class="flex w-full items-center justify-between text-left"
							onclick={() => (showCompletedCourses = !showCompletedCourses)}
						>
							<span class="text-sm font-semibold text-slate-200">
								Completed courses ({completedPrimary.length})
							</span>
							<span class="text-xs text-slate-400">{showCompletedCourses ? 'Hide' : 'Show'}</span>
						</button>
						</div>
					</div>
				{/if}

			</div>
		{/if}
	</div>
</section>
