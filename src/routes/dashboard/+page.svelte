<script lang="ts">
	import SearchField from '$lib/components/ui/SearchField.svelte';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

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
			[
				...((data.profileTeamGroups as ProfileTeamGroup[]) ?? []).map((row) =>
					String(row.team_group_id)
				),
				String((data as any).primaryTeamGroupId ?? '')
			].filter(Boolean)
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
		if (!hasTeamTargets && !hasGroupTargets) return false;
		if (userTeamIds.size === 0 && userTeamGroupIds.size === 0) return false;
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
			subLabel?: string;
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

		const teamGroupsRows =
			(data.teamGroups as Array<{ id: string; name?: string | null; color_hex?: string | null }>) ?? [];
		const teamGroupMeta = new Map(
			teamGroupsRows.map((row) => [
				String(row.id),
				{ name: String(row.name ?? 'Team'), color: String(row.color_hex ?? '') }
			])
		);

		const seenTeamWideGroup = new Set<string>();
		const teamWideGroupIds = new Set<string>([
			...((data.profileTeams as ProfileTeam[]) ?? []).map((row) => String(row.team_group_id ?? '')),
			String((data as any).primaryTeamGroupId ?? '')
		]);
		for (const teamGroupId of teamWideGroupIds) {
			if (!teamGroupId || seenTeamWideGroup.has(teamGroupId)) continue;
			seenTeamWideGroup.add(teamGroupId);
			const meta = teamGroupMeta.get(teamGroupId);
			const groupName = meta?.name ?? 'Team';
			const groupColor = meta?.color ?? '';
			const teamWideNodes = primaryNodes.filter((node) => {
				const groupTargets = targetTeamGroupIdsByNode.get(String(node.id));
				return groupTargets?.has(teamGroupId) ?? false;
			});
			const twCompleted = teamWideNodes.filter((n) => effectiveStatusFor(n.id) === 'completed').length;
			const twTotal = teamWideNodes.length;
			cards.push({
				key: `teamwide:${teamGroupId}`,
				label: groupName,
				subLabel: 'Team-wide',
				courseCount: twTotal,
				completedCount: twCompleted,
				progressPct: twTotal ? Math.round((twCompleted / twTotal) * 100) : 0,
				leftCount: Math.max(0, twTotal - twCompleted),
				teamGroupId,
				color: groupColor || teamGroupColorById.get(teamGroupId) || ''
			});
		}

		const seen = new Set<string>();
		for (const row of (data.profileTeams as ProfileTeam[]) ?? []) {
			const teamId = String(row.team_id);
			if (!teamId || seen.has(teamId)) continue;
			seen.add(teamId);
			const teamName = String(teamById.get(teamId)?.name ?? 'Team');
			const teamGroupId = String(row.team_group_id ?? '');
			const teamNodes = primaryNodes.filter((node) => {
				const teamTargets = targetTeamIdsByNode.get(String(node.id));
				return teamTargets?.has(teamId) ?? false;
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
		if (activeCourseScope.startsWith('teamwide:')) {
			const teamGroupId = activeCourseScope.slice('teamwide:'.length);
			return primaryNodes.filter((node) => {
				const groupTargets = targetTeamGroupIdsByNode.get(String(node.id));
				return groupTargets?.has(teamGroupId) ?? false;
			});
		}
		const selected = scopeCards.find((card) => card.key === activeCourseScope);
		if (!selected?.teamId) return primaryNodes;
		return primaryNodes.filter((node) => {
			const teamTargets = targetTeamIdsByNode.get(String(node.id));
			return teamTargets?.has(selected.teamId!) ?? false;
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
const normalPrimary = $derived([...takeablePrimary]);
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
		'group relative block overflow-hidden rounded-2xl border p-4 transition duration-150 backdrop-blur-xl';
	if (status === 'available' || status === 'video_pending' || status === 'quiz_pending') {
		return `${base} course-card`;
	}
	if (
		status === 'mentor_checkoff_pending' ||
		status === 'checkoff_needs_review' ||
		status === 'checkoff_blocked'
	) {
		return `${base} course-card`;
	}
	if (status === 'completed') {
		return `${base} course-card course-card-completed`;
	}
	if (status === 'locked') {
		return `${base} course-card course-card-locked`;
	}
	return `${base} course-card`;
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
	if (!accent) return `background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);`;
	return `background: color-mix(in srgb, ${accent} 22%, transparent); border-color: color-mix(in srgb, ${accent} 70%, var(--app-glass-border)); color: color-mix(in srgb, ${accent} 35%, #f8fafc);`;
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

<section>
	<div class="dashboard-dividers space-y-0 divide-y">
		{#if data.profile?.is_parent_guardian}
			<div class="py-6 first:pt-0 md:py-8">
				<div class="rounded-xl border p-4 backdrop-blur-xl sm:p-5" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
				<GlassCard>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Parent Linking</p>
							<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
								Enter the student-generated link code from their profile to connect accounts.
							</p>
							<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
								Application status: {String(data.parentApplicationStatus ?? 'not_started').replaceAll('_', ' ')}
							</p>
						</div>
					</div>
					{#if form?.error}
						<p class="mt-2 rounded-xl border p-2 text-sm" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">
							{form.error}
						</p>
					{:else if form?.ok && form?.section === 'parent-link'}
						<p class="mt-2 rounded-xl border p-2 text-sm" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); border-color: color-mix(in srgb, var(--app-success) 40%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">
							Student linked successfully.
						</p>
					{/if}
					<form method="POST" action="?/linkStudentByCode" class="mt-3 flex flex-wrap items-center gap-2">
						<input
							name="code"
							required
							class="rounded-lg border px-3 py-2 text-sm uppercase backdrop-blur-sm"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							placeholder="AB12CD34"
						/>
						<Button
							variant="primary"
							size="sm"
							type="submit"
						>
							Link student
						</Button>
					</form>
					<div class="mt-3 space-y-1">
						<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Linked students</p>
						{#each data.linkedStudents ?? [] as student}
							<p class="text-sm" style="color: var(--app-text-muted);">{student.full_name || student.email}</p>
						{:else}
							<p class="text-sm" style="color: var(--app-text-muted);">No linked students yet.</p>
						{/each}
					</div>
				</GlassCard>
				</div>
			</div>
		{/if}

		{#if needsOnboarding}
			<div class="py-6 first:pt-0 md:py-8">
			<div class="rounded-xl border p-4 backdrop-blur-xl sm:p-5" style="background: color-mix(in srgb, var(--app-warning) 8%, transparent); border-color: color-mix(in srgb, var(--app-warning) 25%, transparent);">
				<p class="text-sm font-semibold" style="color: color-mix(in srgb, var(--app-warning) 30%, white);">Finish onboarding</p>
				<p class="mt-1 text-xs" style="color: color-mix(in srgb, var(--app-warning) 40%, white); opacity: 0.9;">
					Choose your team and subteam to unlock the right course path.
				</p>
				<Button variant="primary" href="/onboarding" size="sm" class="mt-3">
					Start onboarding
				</Button>
			</div>
			</div>
		{/if}

		{#if !needsOnboarding}
			<div class="space-y-6 py-6 first:pt-0 md:py-8">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
					<div class="flex min-w-0 flex-wrap items-center gap-2">
						<h2 class="text-lg font-semibold tracking-tight" style="color: var(--app-text);">My Courses</h2>
						<button
							type="button"
							onclick={() => {
								activeCourseScope = 'all';
								showCompletedCourses = false;
							}}
							class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
								activeCourseScope === 'all'
									? 'scope-chip-active'
									: 'scope-chip'
							}`}
							style={activeCourseScope === 'all'
								? 'border-color: color-mix(in srgb, var(--app-accent) 60%, transparent); background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-text);'
								: 'border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-text-muted);'}
						>
							All courses
						</button>
					</div>
					<div class="w-full min-w-0 sm:max-w-sm">
						<SearchField
							bind:value={filter}
							placeholder="Search courses..."
							fieldClass="rounded-xl px-3 py-2.5"
						/>
					</div>
				</div>
			{#if scopeCards.some((card) => card.key !== 'all')}
				<div>
					<div class="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
						{#each scopeCards.filter((card) => card.key !== 'all') as card (card.key)}
							<button
								type="button"
								onclick={() => {
									activeCourseScope = activeCourseScope === card.key ? 'all' : card.key;
									showCompletedCourses = false;
								}}
								class={`min-w-56 shrink-0 rounded-xl border p-4 text-left transition backdrop-blur-xl scope-card ${
									activeCourseScope === card.key
										? 'scope-card-active'
										: ''
								}`}
								style={activeCourseScope === card.key
									? 'background: var(--app-glass-bg-hover); border-color: var(--app-glass-border-hover);'
									: 'background: var(--app-glass-bg); border-color: var(--app-glass-border);'}
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0">
										<p class="truncate text-sm font-semibold" style="color: var(--app-text);">{card.label}</p>
										{#if card.subLabel}
											<p class="truncate text-xs" style="color: var(--app-text-muted);">{card.subLabel}</p>
										{/if}
									</div>
									<span
										class="rounded-full px-2 py-0.5 text-[11px]"
										style={card.color
											? `background: color-mix(in srgb, ${card.color} 22%, transparent); color: color-mix(in srgb, ${card.color} 35%, #f8fafc);`
											: `background: var(--app-glass-bg); color: var(--app-text-muted);`}
									>
										{card.leftCount} left
									</span>
								</div>
								<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
									{card.completedCount}/{card.courseCount} complete
								</p>
								<div class="mt-3">
									<ProgressBar value={card.progressPct} size="sm" color={card.color || ''} />
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if filtered.length === 0}
				<p class="py-2 text-sm" style="color: var(--app-text-muted);">No courses match your filter.</p>
			{/if}

			<div class="flex flex-col">
				<div
					class={`flex flex-col gap-4 ${completedPrimary.length === 0 ? 'pb-8' : 'pb-24 md:pb-28'}`}
				>
					<div class="space-y-4">
						{#if inProgressPrimary.length > 0}
							<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{#each inProgressPrimary as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									{@const locked = status === 'locked'}
									<a
										href={`/learn/${node.slug}`}
										class={`${courseCardClass(status)} text-inherit`}
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
									>
										{#if locked}
											<div
												class="pointer-events-none absolute inset-0 opacity-70"
												style="background: repeating-linear-gradient(-45deg, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 10px, rgba(15,23,42,0.0) 10px, rgba(15,23,42,0.0) 20px);"
											></div>
										{/if}
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0 flex-1">
												<p class="truncate text-base font-semibold" style="color: var(--app-text);">{node.title}</p>
											</div>
											<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs">
											{#if status !== 'available' && status !== 'locked'}
												<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
											{/if}
										</div>
										<div class="mt-2">
											<ProgressBar value={progressPercentForCard(node.id, status)} size="sm" color={accentColorForNode(node.id) || ''} />
										</div>
									</a>
								{/each}
							</div>
						{/if}

						{#if normalPrimary.length > 0}
							<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{#each normalPrimary as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									{@const locked = status === 'locked'}
									<a
										href={`/learn/${node.slug}`}
										class={`${courseCardClass(status)} text-inherit`}
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
									>
										{#if locked}
											<div
												class="pointer-events-none absolute inset-0 opacity-70"
												style="background: repeating-linear-gradient(-45deg, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 10px, rgba(15,23,42,0.0) 10px, rgba(15,23,42,0.0) 20px);"
											></div>
										{/if}
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 flex-1 truncate text-base font-semibold" style="color: var(--app-text);">{node.title}</p>
											<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs">
											{#if status !== 'available' && status !== 'locked'}
												<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
											{/if}
										</div>
										<div class="mt-2">
											<ProgressBar value={progressPercentForCard(node.id, status)} size="sm" color={accentColorForNode(node.id) || ''} />
										</div>
									</a>
								{/each}
							</div>
						{/if}

						{#if lockedPrimary.length > 0}
							<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{#each lockedPrimary as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									{@const locked = status === 'locked'}
									<a
										href={`/learn/${node.slug}`}
										class={`${courseCardClass(status)} text-inherit`}
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
									>
										{#if locked}
											<div
												class="pointer-events-none absolute inset-0 opacity-70"
												style="background: repeating-linear-gradient(-45deg, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 10px, rgba(15,23,42,0.0) 10px, rgba(15,23,42,0.0) 20px);"
											></div>
										{/if}
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 flex-1 truncate text-base font-semibold" style="color: var(--app-text);">{node.title}</p>
											<span
												class="shrink-0 rounded-full border px-2 py-1 text-xs"
												style={teamChipStyleForNode(node.id)}
											>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-2">
											<ProgressBar value={progressPercentForCard(node.id, status)} size="sm" color={accentColorForNode(node.id) || ''} />
										</div>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				{#if completedPrimary.length > 0}
					<div
						class="fixed right-0 bottom-0 left-0 z-30 border-t backdrop-blur-xl md:left-64"
						style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-surface) 95%, transparent);"
					>
						<div class="mx-auto w-full max-w-6xl px-6 md:px-10">
							{#if showCompletedCourses}
								<div class="dashboard-dividers max-h-[45vh] divide-y overflow-y-auto">
									{#each completedPrimary as node (node.id)}
										<a
											href={`/learn/${node.slug}`}
											class="group flex items-start justify-between gap-3 py-2.5 transition duration-150 text-inherit completed-row"
											style="color: var(--app-text);"
										>
											<p class="min-w-0 flex-1 truncate text-sm font-medium">{node.title}</p>
											<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</a>
									{/each}
								</div>
							{/if}
							<button
								type="button"
								class={`flex w-full items-center justify-between py-4 text-left ${showCompletedCourses ? 'border-t' : ''}`}
								style={showCompletedCourses ? `border-color: var(--app-glass-border);` : ''}
								onclick={() => (showCompletedCourses = !showCompletedCourses)}
							>
								<span class="text-sm font-semibold" style="color: var(--app-text);">
									Completed courses ({completedPrimary.length})
								</span>
								<span class="text-xs" style="color: var(--app-text-muted);">{showCompletedCourses ? 'Hide' : 'Show'}</span>
							</button>
						</div>
					</div>
				{/if}

			</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.dashboard-dividers > :global(* + *) {
		border-color: var(--app-glass-border);
	}
	.course-card {
		box-shadow: var(--app-glass-shadow);
	}
	.course-card:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.course-card-completed {
		opacity: 0.75;
	}
	.course-card-locked {
		opacity: 0.55;
	}
	.scope-card:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.scope-chip:hover {
		border-color: var(--app-glass-border-hover);
		color: var(--app-text);
	}
	.completed-row:hover {
		background: var(--app-glass-bg);
	}
</style>
