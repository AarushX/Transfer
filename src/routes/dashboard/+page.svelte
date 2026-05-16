<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StatusRail from '$lib/components/dashboard/StatusRail.svelte';
	import AnnouncementsCard from '$lib/components/dashboard/AnnouncementsCard.svelte';
	import UpNextStrip from '$lib/components/dashboard/UpNextStrip.svelte';
	import ParentBlock from '$lib/components/dashboard/ParentBlock.svelte';

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

	// --- Status maps ---
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

	// --- Team/group lookups ---
	const teamById = $derived(
		new Map(
			((data.teams as Array<{ id: string; name?: string; category_slug?: string }>) ?? []).map((row) => [
				String(row.id),
				row
			])
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
			.filter((n) => takeableStatuses.includes(effectiveStatusFor(n.id)) && !hasPartialProgress(n.id))
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
				(n) =>
					takeableStatuses.includes(effectiveStatusFor(n.id)) &&
					hasPartialProgress(n.id)
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

	// --- Up next strip (in-progress first, then takeable, cap at 6) ---
	const upNextCourses = $derived.by(() => {
		const inProgress = inProgressPrimary ?? [];
		const takeable = takeablePrimary ?? [];
		const seen = new Set<string>();
		const out: Array<{ id: string; title: string; slug: string; subteamLabel: string }> = [];
		for (const n of [...inProgress, ...takeable]) {
			if (seen.has(n.id)) continue;
			seen.add(n.id);
			out.push({
				id: String(n.id),
				title: String(n.title),
				slug: String(n.slug),
				subteamLabel: linkedTeamLabelForNode(n.id)
			});
			if (out.length >= 6) break;
		}
		return out;
	});

	// Announcements — add a synthetic id for keyed-each in AnnouncementsCard
	const announcements = $derived(
		((data.announcements ?? []) as Array<{
			team_group_id: string;
			subteam_category_slug: string;
			body: string;
			scope: 'team' | 'subteam';
			scope_name: string;
			updated_at: string;
		}>).map((a, i) => ({
			...a,
			id: `${a.team_group_id ?? ''}-${a.scope_name}-${i}`
		}))
	);

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
	{:else}
		<!-- Greeting strip -->
		<div class="fade-up flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					Hi <span class="gradient-text">{(data.profile?.full_name ?? '').split(' ')[0] || 'there'}</span>
				</h1>
				<p class="text-xs" style="color: var(--app-text-muted);">
					{new Date().toLocaleDateString(undefined, { weekday: 'long' })}{data.orgName ? ` · ${data.orgName}` : ''}
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if data.checkedInSince}
					<span
						class="rounded-full px-3 py-1 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--app-success) 18%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white); border: 1px solid color-mix(in srgb, var(--app-success) 35%, transparent);"
					>● Checked in · {formatElapsed(data.checkedInSince)}</span>
				{/if}
				{#if data.profile?.is_mentor && (data.mentorQueueCount ?? 0) > 0}
					<a
						href="/mentor"
						class="rounded-full px-3 py-1 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--app-warning) 18%, transparent); color: color-mix(in srgb, var(--app-warning) 60%, white); border: 1px solid color-mix(in srgb, var(--app-warning) 35%, transparent);"
					>{data.mentorQueueCount} checkoffs to review</a>
				{/if}
			</div>
		</div>

		<!-- Two-column layout -->
		<div class="grid gap-4 md:grid-cols-[2fr_1fr]">
			<!-- Left column -->
			<div class="space-y-4">
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

				<AnnouncementsCard items={announcements} />
				<UpNextStrip courses={upNextCourses} />
			</div>

			<!-- Right rail -->
			<StatusRail
				passportQrDataUrl={data.passportQrDataUrl ?? ''}
				hoursSeason={data.hoursSeason ?? 0}
				hoursTarget={data.hoursTarget ?? 0}
				lettering={data.letteringProgress ?? { pct: 0, overflow: false }}
			/>
		</div>
	{/if}
</section>

<style>
	.hero-glass::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: linear-gradient(135deg, color-mix(in srgb, white 6%, transparent) 0%, transparent 40%);
		pointer-events: none;
	}
</style>
