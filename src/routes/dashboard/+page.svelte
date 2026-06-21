<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StatusRail from '$lib/components/dashboard/StatusRail.svelte';
	import UpNextStrip from '$lib/components/dashboard/UpNextStrip.svelte';
	import ParentBlock from '$lib/components/dashboard/ParentBlock.svelte';

	type Node = {
		id: string;
		title: string;
		slug: string;
		subteam_id: string;
		video_url?: string | null;
	};
	type Status = { node_id: string; computed_status: string };
	type ProfileTeam = {
		team_id: string;
		team_group_id: string;
		category_slug?: string | null;
	};
	type ProfileTeamGroup = {
		team_group_id: string;
		team_groups?: { designator?: string | null } | null;
	};
	type NodeTeamTarget = { node_id: string; team_id: string };
	type NodeTeamGroupTarget = { node_id: string; team_group_id: string };
	type CheckoffReview = { node_id: string; status: 'needs_review' | 'blocked'; updated_at: string };
	type PrereqEdge = { node_id: string; prerequisite_node_id: string };
	type NodeBlockRow = { node_id: string; id: string };
	type BlockProgressRow = { node_id: string; block_id: string; completed_at: string | null };

	let { data, form } = $props();

	// --- Status maps ---
	const statusMap = $derived(
		new Map((data.statuses as Status[]).map((s) => [s.node_id, s.computed_status]))
	);
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

	// --- Team/group lookups ---
	const teamById = $derived(
		new Map(
			((data.teams as Array<{ id: string; name?: string; category_slug?: string }>) ?? []).map(
				(row) => [String(row.id), row]
			)
		)
	);
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

	// --- User team membership ---
	const userTeamIds = $derived(
		new Set(((data.profileTeams as ProfileTeam[]) ?? []).map((row) => String(row.team_id)))
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

	// --- Node targeting ---
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

	// --- Onboarding check ---
	const onboardingRequiredDesignators = $derived(
		new Set(
			((data.requiredOnboardingCategories as Array<{ slug: string }>) ?? []).map((row) =>
				String(row.slug)
			)
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

	// --- Block progress ---
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

	// --- Priority sort ---
	const prerequisites = $derived((data.prerequisites as PrereqEdge[]) ?? []);
	const prereqDependentsCount = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const edge of prerequisites) {
			map[edge.prerequisite_node_id] = (map[edge.prerequisite_node_id] ?? 0) + 1;
		}
		return map;
	});
	const byPriority = (a: Node, b: Node) => {
		const depDelta = (prereqDependentsCount[b.id] ?? 0) - (prereqDependentsCount[a.id] ?? 0);
		if (depDelta !== 0) return depDelta;
		return a.title.localeCompare(b.title);
	};

	// --- Primary nodes (user's team) ---
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
	const primaryNodes = $derived((data.nodes as Node[]).filter(inPrimaryTeam));

	// --- Course status buckets ---
	const takeableStatuses = ['available', 'video_pending', 'quiz_pending'];
	const takeablePrimary = $derived(
		primaryNodes
			.filter(
				(n) => takeableStatuses.includes(effectiveStatusFor(n.id)) && !hasPartialProgress(n.id)
			)
			.slice()
			.sort(byPriority)
	);
	// Only include statuses the user can actually act on. Waiting on a mentor
	// (mentor_checkoff_pending / checkoff_needs_review / checkoff_blocked) is
	// out of the student's control, so those shouldn't surface in
	// "Pick up where you left off".
	const inProgressPrimary = $derived(
		primaryNodes
			.filter(
				(n) => takeableStatuses.includes(effectiveStatusFor(n.id)) && hasPartialProgress(n.id)
			)
			.slice()
			.sort(byPriority)
	);

	// --- Hero node ---
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

	// --- Status / tone helpers (used in hero) ---
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

	// --- Team label / accent helpers (used in hero) ---
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

	// --- Skill map inputs ---
	const skillMapNodeIds = $derived(new Set(primaryNodes.map((n) => String(n.id))));
	const skillMapScope = $derived(skillMapNodeIds);
	const subteamByNode = $derived.by(() => {
		const out: Record<string, string> = {};
		for (const node of primaryNodes) {
			const targets = targetTeamIdsByNode.get(String(node.id));
			if (targets) {
				for (const teamId of userTeamIds) {
					if (targets.has(teamId)) {
						out[String(node.id)] = teamId;
						break;
					}
				}
			}
		}
		return out;
	});
	const teamColorMap = $derived.by(() => {
		const out: Record<string, string> = {};
		for (const [id, color] of teamColorById.entries()) {
			if (color) out[id] = color;
		}
		return out;
	});

	// --- Stat counts ---
	const certifiedCount = $derived(
		primaryNodes.filter((n) => effectiveStatusFor(n.id) === 'completed').length
	);
	const inProgressCount = $derived(
		primaryNodes.filter((n) =>
			['video_pending', 'quiz_pending', 'mentor_checkoff_pending', 'checkoff_needs_review', 'checkoff_blocked', 'in_progress'].includes(effectiveStatusFor(n.id))
		).length
	);

	// --- Up next strip (in-progress first, then takeable, cap at 9) ---
	const upNextCourses = $derived.by(() => {
		const inProgress = inProgressPrimary ?? [];
		const takeable = takeablePrimary ?? [];
		const seen = new Set<string>();
		const out: Array<{
			id: string;
			title: string;
			slug: string;
			subteamLabel: string;
			status: string;
			done: number;
			total: number;
			teamColor: string;
		}> = [];
		for (const n of [...inProgress, ...takeable]) {
			if (seen.has(n.id)) continue;
			seen.add(n.id);
			const total = totalModulesForNode(n.id);
			const done = Math.min(blockDoneByNode[n.id] ?? 0, total);
			out.push({
				id: String(n.id),
				title: String(n.title),
				slug: String(n.slug),
				subteamLabel: linkedTeamLabelForNode(n.id),
				status: effectiveStatusFor(n.id),
				done,
				total,
				teamColor: accentColorForNode(n.id)
			});
			if (out.length >= 9) break;
		}
		return out;
	});

	function formatElapsed(iso: string): string {
		const ms = Date.now() - new Date(iso).getTime();
		const h = Math.floor(ms / 3_600_000);
		const m = Math.floor((ms % 3_600_000) / 60_000);
		return `${h}h ${m.toString().padStart(2, '0')}m`;
	}
</script>

<section class="space-y-6">
	{#if data.isParent}
		<ParentBlock {data} {form} />
	{:else if needsOnboarding}
		<div class="fade-up aurora-border">
			<div
				class="rounded-[17px] border-0 p-5 backdrop-blur-xl"
				style="background: var(--app-surface);"
			>
				<p class="text-sm font-semibold" style="color: var(--app-text);">Finish onboarding</p>
				<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
					Choose your team and subteam to unlock the right course path.
				</p>
				<Button variant="primary" href="/onboarding" size="sm" class="mt-3">
					Start onboarding
				</Button>
			</div>
		</div>
	{:else}
		<!-- Greeting strip -->
		<div class="fade-up flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					Hi <span class="gradient-text"
						>{(data.profile?.full_name ?? '').split(' ')[0] || 'there'}</span
					>
				</h1>
				<p class="text-xs" style="color: var(--app-text-muted);">
					{new Date().toLocaleDateString(undefined, { weekday: 'long' })}{data.orgName
						? ` · ${data.orgName}`
						: ''}
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if data.checkedInSince}
					<span
						class="rounded-full px-3 py-1 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--app-success) 18%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white); border: 1px solid color-mix(in srgb, var(--app-success) 35%, transparent);"
						>● Checked in · {formatElapsed(data.checkedInSince)}</span
					>
				{/if}
				{#if data.profile?.is_mentor && (data.mentorQueueCount ?? 0) > 0}
					<a
						href="/mentor"
						class="rounded-full px-3 py-1 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--app-warning) 18%, transparent); color: color-mix(in srgb, var(--app-warning) 60%, white); border: 1px solid color-mix(in srgb, var(--app-warning) 35%, transparent);"
						>{data.mentorQueueCount} checkoffs to review</a
					>
				{/if}
			</div>
		</div>

		<!-- Stat cards row -->
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			{#each [
				{ label: 'Certified', value: certifiedCount, color: 'var(--app-success)', hint: 'skills complete' },
				{ label: 'In progress', value: inProgressCount, color: 'var(--app-warning)', hint: 'skills active' },
				{ label: 'Hours', value: (data.hoursSeason ?? 0).toFixed(1), color: 'var(--app-info)', hint: `of ${data.hoursTarget ?? 0} goal` },
				{ label: 'Lettering', value: `${Math.min(100, data.letteringProgress?.pct ?? 0)}%`, color: 'var(--app-accent)', hint: 'season progress' }
			] as stat}
				<div
					class="rounded-2xl border p-4"
					style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
				>
					<p class="eyebrow-label">{stat.label}</p>
					<p class="mono mt-1.5 text-2xl font-bold" style="color: {stat.color};">{stat.value}</p>
					<p class="mt-0.5 text-[11px]" style="color: var(--app-text-dim);">{stat.hint}</p>
				</div>
			{/each}
		</div>

		<!-- Main two-column area -->
		<div class="grid gap-4 md:grid-cols-[1fr_240px]">
			<UpNextStrip courses={upNextCourses} />
			<StatusRail
				passportQrDataUrl={data.passportQrDataUrl ?? ''}
				hoursSeason={data.hoursSeason ?? 0}
				hoursTarget={data.hoursTarget ?? 0}
				lettering={data.letteringProgress ?? { pct: 0, overflow: false }}
			/>
		</div>

		<!-- Skill map link prompt -->
		{#if primaryNodes.length > 0}
			<a
				href="/graph"
				class="flex items-center justify-between rounded-2xl border px-5 py-4 transition-colors"
				style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
			>
				<div>
					<p class="text-[14px] font-bold" style="color: var(--app-text);">Skill map</p>
					<p class="text-[12px]" style="color: var(--app-text-dim);">See all {primaryNodes.length} skills and your full certification path</p>
				</div>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--app-accent); flex-shrink: 0;">
					<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
				</svg>
			</a>
		{/if}
	{/if}
</section>
