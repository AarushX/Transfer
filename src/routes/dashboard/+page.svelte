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
			video_pending: 'Video',
			quiz_pending: 'Quiz',
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
const progressPercentForCard = (nodeId: string, status: string) => {
	const total = totalModulesForNode(nodeId);
	const done = Math.min(blockDoneByNode[nodeId] ?? 0, total);
	if (total > 0) return Math.round((done / total) * 100);
	return status === 'completed' ? 100 : 0;
};

const heroNode = $derived(inProgressPrimary[0] ?? null);
const heroStatus = $derived(heroNode ? effectiveStatusFor(heroNode.id) : 'locked');
const heroBlocks = $derived.by(() => {
	if (!heroNode) return [];
	const total = totalModulesForNode(heroNode.id);
	const done = Math.min(blockDoneByNode[heroNode.id] ?? 0, total);
	return Array.from({ length: total }, (_, i) => ({
		state: i < done ? 'completed' : i === done ? 'current' : 'upcoming',
		label: `Step ${i + 1}`
	}));
});

const allCard = $derived(scopeCards.find(c => c.key === 'all'));
const totalCourses = $derived(allCard?.courseCount ?? 0);
const completedCount = $derived(allCard?.completedCount ?? 0);
const inProgressCount = $derived(inProgressPrimary.length);
</script>

<section class="space-y-7">
	{#if data.profile?.is_parent_guardian}
		<!-- Parent linking card -->
		<div class="fade-up rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Linking</p>
					<p class="text-sm" style="color: var(--app-text-muted);">
						Enter the student-generated link code from their profile to connect accounts.
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
					class="rounded-xl border px-3 py-2 text-sm uppercase backdrop-blur-sm"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					placeholder="AB12CD34"
				/>
				<Button variant="primary" size="sm" type="submit">Link student</Button>
			</form>
			<div class="mt-3 space-y-1">
				<p class="eyebrow-label">Linked students</p>
				{#each data.linkedStudents ?? [] as student}
					<p class="text-sm" style="color: var(--app-text-muted);">{student.full_name || student.email}</p>
				{:else}
					<p class="text-sm" style="color: var(--app-text-dim, var(--app-text-muted));">No linked students yet.</p>
				{/each}
			</div>
		</div>
	{/if}

	{#if needsOnboarding}
		<div class="fade-up aurora-border">
			<div class="rounded-[17px] border-0 p-5 backdrop-blur-xl" style="background: var(--app-surface);">
				<p class="text-sm font-semibold" style="color: var(--app-text);">Finish onboarding</p>
				<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
					Choose your team and subteam to unlock the right course path.
				</p>
				<Button variant="primary" href="/onboarding" size="sm" class="mt-3">
					Start onboarding
				</Button>
			</div>
		</div>
	{/if}

	{#if !needsOnboarding}
		<!-- Continue Hero -->
		{#if heroNode}
			<div class="fade-up aurora-border">
				<div class="hero-glass relative overflow-hidden rounded-[17px] p-6 md:p-7" style="background: var(--app-surface);">
					<svg class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 200" preserveAspectRatio="none" style="opacity: 0.16;" aria-hidden="true">
						<defs>
							<linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stop-color="#8b5cf6" />
								<stop offset="100%" stop-color="#06b6d4" />
							</linearGradient>
						</defs>
						<path d="M 60 0 V 60 H 200 V 120 H 360" stroke="url(#hero-line)" stroke-width="1.2" fill="none" />
						<path d="M 800 40 L 640 40 L 640 80 L 480 80" stroke="url(#hero-line)" stroke-width="1.2" fill="none" />
						<circle cx="200" cy="60" r="3" fill="#8b5cf6" />
						<circle cx="360" cy="120" r="3" fill="#06b6d4" />
					</svg>

					<div class="relative">
						<div class="mb-3 flex flex-wrap items-center gap-2">
							<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium chip-cyan">
								<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="h-3 w-3"><polygon points="6 4 20 12 6 20 6 4" /></svg>
								Pick up where you left off
							</span>
							<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium chip-violet">
								<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" class="h-3 w-3"><polygon points="13 2 4 14 11 14 9 22 20 9 13 9 15 2 13 2" /></svg>
								{statusLabel(heroStatus)}
							</span>
						</div>

						<h1 class="text-3xl font-extrabold tracking-tighter md:text-4xl" style="line-height: 1.02;">
							<span style="color: var(--app-text-dim);">Continue</span><br/>
							<span class="gradient-text">{heroNode.title}</span>
						</h1>

						{#if totalModulesForNode(heroNode.id) > 0}
							<p class="mt-3 max-w-xl text-sm" style="color: var(--app-text-muted); line-height: 1.55;">
								You've completed {Math.min(blockDoneByNode[heroNode.id] ?? 0, totalModulesForNode(heroNode.id))} of {totalModulesForNode(heroNode.id)} steps. Keep going!
							</p>
						{:else}
							<p class="mt-3 max-w-xl text-sm" style="color: var(--app-text-muted); line-height: 1.55;">
								Jump back in and continue making progress.
							</p>
						{/if}

						{#if heroBlocks.length > 0}
							<div class="mt-5 flex flex-wrap items-center gap-1.5">
								{#each heroBlocks as block, i}
									<div class="flex items-center gap-2 rounded-full border px-2 py-1"
										style={block.state === 'current'
											? 'border-color: color-mix(in srgb, #06b6d4 50%, transparent); background: color-mix(in srgb, #06b6d4 10%, transparent);'
											: 'border-color: var(--app-glass-border); background: transparent;'}>
										<span class="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold"
											style={block.state === 'completed'
												? 'background: #34d399; color: white;'
												: block.state === 'current'
												? 'background: var(--aurora); color: white; box-shadow: 0 0 16px -2px #06b6d4;'
												: 'background: color-mix(in srgb, white 6%, transparent); color: var(--app-text-dim);'}>
											{#if block.state === 'completed'}
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><polyline points="4 12 10 18 20 6"/></svg>
											{:else if block.state === 'current'}
												<span class="h-1.5 w-1.5 rounded-full bg-white"></span>
											{:else}
												{i + 1}
											{/if}
										</span>
										<span class="text-xs font-medium" style="color: {block.state === 'upcoming' ? 'var(--app-text-dim)' : 'var(--app-text)'};">{block.label}</span>
									</div>
									{#if i < heroBlocks.length - 1}
										<span class="h-px w-3" style="background: var(--app-glass-border);"></span>
									{/if}
								{/each}
							</div>
						{/if}

						<div class="mt-6 flex flex-wrap items-center gap-3">
							<Button variant="primary" size="lg" href={`/learn/${heroNode.slug}`}>
								Resume
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="ml-1 h-4 w-4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Stat tiles -->
		<div class="fade-up grid grid-cols-2 gap-4 md:grid-cols-4" style="animation-delay: 0.05s;">
			<div class="stat-tile rounded-2xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="mb-2.5 grid h-8 w-8 place-items-center rounded-[10px]" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: #6ee7b7;">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="2 12 7 17 16 7"/><polyline points="11 17 14 20 22 8"/></svg>
				</div>
				<div class="mono text-3xl font-bold" style="letter-spacing: -0.04em;">{completedCount}</div>
				<div class="text-xs" style="color: var(--app-text-muted);">Modules certified</div>
			</div>
			<div class="stat-tile rounded-2xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="mb-2.5 grid h-8 w-8 place-items-center rounded-[10px]" style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: #67e8f9;">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>
				</div>
				<div class="mono text-3xl font-bold" style="letter-spacing: -0.04em;">{inProgressCount}</div>
				<div class="text-xs" style="color: var(--app-text-muted);">In progress</div>
			</div>
			<div class="stat-tile rounded-2xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="mb-2.5 grid h-8 w-8 place-items-center rounded-[10px]" style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: #c4b5fd;">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z"/><path d="M4 18h15"/></svg>
				</div>
				<div class="mono text-3xl font-bold" style="letter-spacing: -0.04em;">{totalCourses}</div>
				<div class="text-xs" style="color: var(--app-text-muted);">Total courses</div>
			</div>
			<div class="stat-tile rounded-2xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="mb-2.5 grid h-8 w-8 place-items-center rounded-[10px]" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: #fcd34d;">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"/></svg>
				</div>
				<div class="mono text-3xl font-bold" style="letter-spacing: -0.04em;">{allCard?.progressPct ?? 0}%</div>
				<div class="text-xs" style="color: var(--app-text-muted);">Completion</div>
			</div>
		</div>

		<!-- Courseload track cards -->
		{#if scopeCards.some((card) => card.key !== 'all')}
			<div class="fade-up" style="animation-delay: 0.1s;">
				<div class="mb-3 flex items-end justify-between gap-4">
					<div>
						<p class="eyebrow-label" style="margin-bottom: 4px;">Courseloads</p>
						<h2 class="text-xl font-semibold tracking-tight">Your assigned tracks</h2>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each scopeCards.filter((card) => card.key !== 'all') as card (card.key)}
						<button
							type="button"
							onclick={() => {
								activeCourseScope = activeCourseScope === card.key ? 'all' : card.key;
								showCompletedCourses = false;
							}}
							class="courseload-card rounded-2xl border p-5 text-left backdrop-blur-xl transition"
							style={activeCourseScope === card.key
								? 'background: var(--app-glass-bg-hover); border-color: var(--app-glass-border-hover); box-shadow: var(--app-glass-shadow);'
								: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);'}
						>
							<div class="flex items-start justify-between gap-3 mb-3">
								<div class="min-w-0">
									<p class="truncate text-[15px] font-semibold" style="color: var(--app-text);">{card.label}</p>
									{#if card.subLabel}
										<p class="truncate text-xs" style="color: var(--app-text-muted);">{card.subLabel}</p>
									{/if}
								</div>
								<div class="text-right shrink-0">
									<div class="mono text-lg font-bold">{card.completedCount}<span style="color: var(--app-text-dim);">/{card.courseCount}</span></div>
									<div class="text-[10px] uppercase tracking-widest" style="color: var(--app-text-dim);">done</div>
								</div>
							</div>
							<ProgressBar value={card.progressPct} size="sm" color={card.color || ''} />
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Course list section -->
		<div class="fade-up space-y-5" style="animation-delay: 0.15s;">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
				<div class="flex min-w-0 flex-wrap items-center gap-2">
					<h2 class="text-xl font-semibold tracking-tight" style="color: var(--app-text);">Courses</h2>
					<button
						type="button"
						onclick={() => {
							activeCourseScope = 'all';
							showCompletedCourses = false;
						}}
						class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition"
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

			{#if filtered.length === 0}
				<p class="py-2 text-sm" style="color: var(--app-text-muted);">No courses match your filter.</p>
			{/if}

			<div class="flex flex-col gap-4 pb-8">
					{#if inProgressPrimary.length > 0}
						<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{#each inProgressPrimary as node (node.id)}
								{@const status = effectiveStatusFor(node.id)}
								<a href={`/learn/${node.slug}`} class="course-card group relative block overflow-hidden rounded-2xl border p-4 backdrop-blur-xl text-inherit transition duration-150"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text); box-shadow: var(--app-glass-shadow);">
									<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
									<div class="relative">
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 flex-1 truncate text-base font-semibold" style="color: var(--app-text);">{node.title}</p>
											<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-3 flex items-center justify-between text-xs">
											<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
											{#if totalModulesForNode(node.id) > 0}
												<span class="mono text-xs" style="color: var(--app-text-dim, var(--app-text-muted));">{Math.min(blockDoneByNode[node.id] ?? 0, totalModulesForNode(node.id))}/{totalModulesForNode(node.id)}</span>
											{/if}
										</div>
										<div class="mt-2">
											<ProgressBar value={progressPercentForCard(node.id, status)} size="sm" color={accentColorForNode(node.id) || ''} />
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}

					{#if normalPrimary.length > 0}
						<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{#each normalPrimary as node (node.id)}
								{@const status = effectiveStatusFor(node.id)}
								<a href={`/learn/${node.slug}`} class="course-card group relative block overflow-hidden rounded-2xl border p-4 backdrop-blur-xl text-inherit transition duration-150"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text); box-shadow: var(--app-glass-shadow);">
									<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
									<div class="relative">
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 flex-1 truncate text-base font-semibold" style="color: var(--app-text);">{node.title}</p>
											<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										{#if status !== 'available' && status !== 'locked'}
											<div class="mt-3">
												<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
											</div>
										{/if}
										<div class="mt-2">
											<ProgressBar value={progressPercentForCard(node.id, status)} size="sm" color={accentColorForNode(node.id) || ''} />
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}

					{#if lockedPrimary.length > 0}
						<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{#each lockedPrimary as node (node.id)}
								{@const status = effectiveStatusFor(node.id)}
								<a href={`/learn/${node.slug}`} class="course-card course-card-locked group relative block overflow-hidden rounded-2xl border p-4 backdrop-blur-xl text-inherit transition duration-150"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);">
									<div class="pointer-events-none absolute inset-0 rounded-2xl opacity-70" style="background: repeating-linear-gradient(-45deg, rgba(148,163,184,0.18) 0px, rgba(148,163,184,0.18) 10px, rgba(15,23,42,0.0) 10px, rgba(15,23,42,0.0) 20px);"></div>
									<div class="relative">
										<div class="flex items-start justify-between gap-3">
											<p class="min-w-0 flex-1 truncate text-base font-semibold" style="color: var(--app-text);">{node.title}</p>
											<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
												{linkedTeamLabelForNode(node.id)}
											</span>
										</div>
										<div class="mt-2">
											<ProgressBar value={0} size="sm" color={accentColorForNode(node.id) || ''} />
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}

					{#if completedPrimary.length > 0}
						<div class="rounded-2xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
							<button
								type="button"
								class="flex w-full items-center justify-between px-5 py-4 text-left"
								onclick={() => (showCompletedCourses = !showCompletedCourses)}
							>
								<span class="flex items-center gap-2">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" style="color: var(--app-success);"><polyline points="4 12 10 18 20 6"/></svg>
									<span class="text-sm font-semibold" style="color: var(--app-text);">
										Completed courses ({completedPrimary.length})
									</span>
								</span>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
									class="h-4 w-4 transition-transform duration-200"
									style="color: var(--app-text-muted); transform: rotate({showCompletedCourses ? '180' : '0'}deg);">
									<polyline points="6 9 12 15 18 9"/>
								</svg>
							</button>
							{#if showCompletedCourses}
								<div class="border-t px-5 pb-3" style="border-color: var(--app-glass-border);">
									<div class="grid gap-3 pt-3 md:grid-cols-2 xl:grid-cols-3">
										{#each completedPrimary as node (node.id)}
											<a
												href={`/learn/${node.slug}`}
												class="completed-row group flex items-center justify-between gap-3 rounded-xl border p-3 text-inherit transition duration-150"
												style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
											>
												<div class="flex items-center gap-2 min-w-0 flex-1">
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0" style="color: var(--app-success);"><polyline points="4 12 10 18 20 6"/></svg>
													<p class="min-w-0 flex-1 truncate text-sm font-medium">{node.title}</p>
												</div>
												<span class="shrink-0 rounded-full border px-2 py-1 text-xs" style={teamChipStyleForNode(node.id)}>
													{linkedTeamLabelForNode(node.id)}
												</span>
											</a>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
		</div>
	{/if}
</section>

<style>
	.stat-tile {
		transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
		cursor: default;
	}
	.stat-tile:hover {
		border-color: var(--app-glass-border-hover);
		background: var(--app-glass-bg-hover) !important;
	}
	.courseload-card {
		cursor: pointer;
	}
	.courseload-card:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.course-card {
		box-shadow: var(--app-glass-shadow);
	}
	.course-card:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.course-card-locked {
		opacity: 0.55;
	}
	.completed-row:hover {
		background: var(--app-glass-bg);
	}
	.hero-glass::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(135deg, color-mix(in srgb, white 6%, transparent) 0%, transparent 40%);
		pointer-events: none;
	}
</style>
