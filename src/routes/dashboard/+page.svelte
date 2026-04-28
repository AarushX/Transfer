<script lang="ts">
	import type { CoursesDashboardModel } from '$lib/courseload-types';
	import SearchField from '$lib/components/ui/SearchField.svelte';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';

type Node = { id: string; title: string; slug: string; subteam_id: string; video_url?: string | null };
	type Status = { node_id: string; computed_status: string };
	type Subteam = { id: string; name: string; slug: string };
	type CheckoffReview = { node_id: string; status: 'needs_review' | 'blocked'; updated_at: string };
	type PrereqEdge = { node_id: string; prerequisite_node_id: string };
type NodeBlockRow = { node_id: string; id: string };
type BlockProgressRow = { node_id: string; block_id: string; completed_at: string | null };
type Survey = {
	id: string;
	title: string;
	slug: string;
	description?: string;
	is_active: boolean;
	show_when_inactive: boolean;
	visible_from: string | null;
	visible_until: string | null;
	max_submissions?: number;
};
type SurveyPrereqEdge = { survey_id: string; node_id: string };
type TrainingCategory = {
	id: string;
	name: string;
	slug: string;
	parent_id: string | null;
	kind: string;
	color_token: string;
	sort_order: number;
};
type NodeCategory = { node_id: string; category_id: string };

	let { data } = $props();

	const coursesDashboard = $derived((data.coursesDashboard ?? null) as CoursesDashboardModel | null);
	const submissionSummaryBySurvey = $derived(
		(data.submissionSummaryBySurvey ?? {}) as Record<string, { count: number; latestAt: string | null }>
	);

	const statusMap = $derived(new Map((data.statuses as Status[]).map((s) => [s.node_id, s.computed_status])));
	const checkoffReviewMap = $derived(
		new Map((data.checkoffReviews as CheckoffReview[]).map((r) => [r.node_id, r]))
	);
	const surveys = $derived((data.surveys as Survey[]) ?? []);
	const surveyPrerequisites = $derived((data.surveyPrerequisites as SurveyPrereqEdge[]) ?? []);

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
	let showOtherCourses = $state(false);
	let showCompletedCourses = $state(false);

	const filtered = $derived.by(() => {
		const needle = filter.trim().toLowerCase();
		return (data.nodes as Node[]).filter((n) => {
			if (!needle) return true;
			return n.title.toLowerCase().includes(needle) || n.slug.toLowerCase().includes(needle);
		});
	});

	const primaryTeamId = $derived((data.profile?.subteam_id as string | null | undefined) ?? null);
const primaryTeamName = $derived.by(() => {
	if (!primaryTeamId) return null;
	const t = (data.subteams as Subteam[]).find((s) => s.id === primaryTeamId);
	return t?.name ?? null;
});
	const prerequisites = $derived((data.prerequisites as PrereqEdge[]) ?? []);
	const prereqDependentsCount = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const edge of prerequisites) {
			map[edge.prerequisite_node_id] = (map[edge.prerequisite_node_id] ?? 0) + 1;
		}
		return map;
	});

	const inPrimaryTeam = (node: Node) =>
		!primaryTeamId || String(node.subteam_id ?? '') === String(primaryTeamId);
	const byPriority = (a: Node, b: Node) => {
		const depDelta = (prereqDependentsCount[b.id] ?? 0) - (prereqDependentsCount[a.id] ?? 0);
		if (depDelta !== 0) return depDelta;
		return a.title.localeCompare(b.title);
	};

	const primaryNodes = $derived(filtered.filter(inPrimaryTeam));
	const otherNodes = $derived(filtered.filter((n) => !inPrimaryTeam(n)));
	const takeableStatuses = ['available', 'video_pending', 'quiz_pending'];

	const takeablePrimary = $derived(
		primaryNodes
			.filter((n) => takeableStatuses.includes(effectiveStatusFor(n.id)))
			.slice()
			.sort(byPriority)
	);
	const inProgressPrimary = $derived(
		primaryNodes
			.filter((n) =>
				['mentor_checkoff_pending', 'checkoff_needs_review', 'checkoff_blocked'].includes(
					effectiveStatusFor(n.id)
				)
			)
			.slice()
			.sort(byPriority)
	);
	const lockedPrimary = $derived(
		primaryNodes
			.filter((n) => effectiveStatusFor(n.id) === 'locked')
			.slice()
			.sort(byPriority)
	);
	const completedPrimary = $derived(
		primaryNodes
			.filter((n) => effectiveStatusFor(n.id) === 'completed')
			.slice()
			.sort(byPriority)
	);

	const otherTakeable = $derived(
		otherNodes
			.filter((n) => takeableStatuses.includes(effectiveStatusFor(n.id)))
			.slice()
			.sort(byPriority)
	);
	const otherRemaining = $derived(
		otherNodes
			.filter((n) => !takeableStatuses.includes(effectiveStatusFor(n.id)))
			.slice()
			.sort(byPriority)
	);

	const summary = $derived.by(() => {
		const counts = { total: 0, completed: 0, inProgress: 0, locked: 0 };
		for (const n of data.nodes as Node[]) {
			counts.total += 1;
			const status = effectiveStatusFor(n.id);
			if (status === 'completed') counts.completed += 1;
			else if (status === 'locked') counts.locked += 1;
			else counts.inProgress += 1;
		}
		return counts;
	});

	const availableNow = $derived(
		(data.nodes as Node[]).filter((n) => takeableStatuses.includes(effectiveStatusFor(n.id)))
	);
	const redoCheckoff = $derived(
		(data.nodes as Node[]).filter((n) => effectiveStatusFor(n.id) === 'checkoff_needs_review')
	);
	const blockedCheckoff = $derived(
		(data.nodes as Node[]).filter((n) => effectiveStatusFor(n.id) === 'checkoff_blocked')
	);
	const awaitingMentor = $derived(
		(data.nodes as Node[]).filter((n) => effectiveStatusFor(n.id) === 'mentor_checkoff_pending')
	);
	const recommendedNext = $derived.by(() => {
		const pathNext = coursesDashboard?.nextCourse;
		if (pathNext?.slug) {
			const node = (data.nodes as Node[]).find((n) => n.slug === pathNext.slug);
			if (node) return node;
		}
		const preferredTeam = data.profile?.subteam_id;
		const candidates = availableNow.slice().sort((a, b) => {
			const ap = preferredTeam && a.subteam_id === preferredTeam ? 0 : 1;
			const bp = preferredTeam && b.subteam_id === preferredTeam ? 0 : 1;
			if (ap !== bp) return ap - bp;
			return byPriority(a, b);
		});
		return candidates[0] ?? null;
	});

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

const courseRowClass = (status: string) => {
	const base =
		'group flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all duration-150 hover:-translate-y-[1px]';
	if (status === 'available' || status === 'video_pending' || status === 'quiz_pending') {
		return `${base} border-emerald-600/60 bg-emerald-900/35 text-emerald-50 hover:border-emerald-500 hover:bg-emerald-800/40`;
	}
	if (
		status === 'mentor_checkoff_pending' ||
		status === 'checkoff_needs_review' ||
		status === 'checkoff_blocked'
	) {
		return `${base} border-sky-600/60 bg-sky-900/30 text-sky-50 hover:border-sky-500 hover:bg-sky-800/40`;
	}
	if (status === 'completed') {
		return `${base} border-slate-700 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-800`;
	}
	return `${base} border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800`;
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
const progressLabelFor = (nodeId: string) => {
	const total = totalModulesForNode(nodeId);
	if (!total) return null;
	const done = Math.min(blockDoneByNode[nodeId] ?? 0, total);
	return `${done} / ${total} modules`;
};
const visibleSurveys = $derived.by(() => {
	const now = Date.now();
	const statusByNode = new Map(
		(data.statuses as Status[]).map((row) => [String(row.node_id), String(row.computed_status)])
	);
	const prereqBySurvey = new Map<string, string[]>();
	for (const edge of surveyPrerequisites) {
		const list = prereqBySurvey.get(edge.survey_id) ?? [];
		list.push(edge.node_id);
		prereqBySurvey.set(edge.survey_id, list);
	}
	return surveys
		.map((survey) => {
			const from = survey.visible_from ? new Date(survey.visible_from).getTime() : null;
			const until = survey.visible_until ? new Date(survey.visible_until).getTime() : null;
			const inWindow = (from == null || now >= from) && (until == null || now <= until);
			const visible = (survey.is_active && inWindow) || survey.show_when_inactive;
			const prereqs = prereqBySurvey.get(survey.id) ?? [];
			const missing = prereqs.filter((nodeId) => statusByNode.get(nodeId) !== 'completed');
			const maxSubmissions = Number(survey.max_submissions ?? 1);
			const sum = submissionSummaryBySurvey[survey.id];
			const submissionCount = sum?.count ?? 0;
			const submissionCapReached = submissionCount >= maxSubmissions;
			return {
				...survey,
				visible,
				missingCount: missing.length,
				canOpen: visible && missing.length === 0 && !submissionCapReached,
				submittedAt: sum?.latestAt ?? null,
				submissionCount,
				submissionCapReached,
				maxSubmissions: maxSubmissions
			};
		})
		.filter((survey) => survey.visible || survey.show_when_inactive);
});

const trainingCategories = $derived((data.trainingCategories as TrainingCategory[]) ?? []);
const nodeCategories = $derived((data.nodeCategories as NodeCategory[]) ?? []);
const categoryById = $derived(new Map(trainingCategories.map((c) => [c.id, c])));
const categoryBySlug = $derived(new Map(trainingCategories.map((c) => [c.slug, c])));
const categoryChildren = $derived.by(() => {
	const map = new Map<string, TrainingCategory[]>();
	for (const category of trainingCategories) {
		const key = String(category.parent_id ?? '');
		const list = map.get(key) ?? [];
		list.push(category);
		map.set(key, list);
	}
	for (const list of map.values()) {
		list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
	}
	return map;
});
const categoryIdsByNode = $derived.by(() => {
	const map = new Map<string, Set<string>>();
	for (const row of nodeCategories) {
		const set = map.get(row.node_id) ?? new Set<string>();
		set.add(row.category_id);
		map.set(row.node_id, set);
	}
	return map;
});
const nodesByTopCategory = $derived.by(() => {
	const top = new Map<string, Node[]>();
	const topCategories = trainingCategories.filter((c) => c.parent_id == null);
	for (const category of topCategories) top.set(category.slug, []);
	for (const node of data.nodes as Node[]) {
		const catIds = categoryIdsByNode.get(node.id) ?? new Set<string>();
		for (const catId of catIds) {
			let current = categoryById.get(catId);
			while (current && current.parent_id) current = categoryById.get(current.parent_id);
			if (current && top.has(current.slug)) {
				top.get(current.slug)?.push(node);
			}
		}
	}
	return top;
});
const categoryTone = (slug: string) => {
	if (slug === 'technical') return 'border-sky-700/60 bg-sky-900/25 text-sky-100';
	if (slug === 'business') return 'border-amber-700/60 bg-amber-900/25 text-amber-100';
	if (slug === 'frc') return 'border-blue-700/60 bg-blue-900/25 text-blue-100';
	if (slug === 'ftc') return 'border-indigo-700/60 bg-indigo-900/25 text-indigo-100';
	return 'border-slate-700 bg-slate-900/40 text-slate-200';
};

</script>

<section class="space-y-6">
	{#if coursesDashboard}
		<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-xl shadow-black/40">
			<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(251,191,36,0.08),transparent_45%)]"></div>
			<div class="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
				<div class="max-w-xl space-y-3">
					<p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">Learning hub</p>
					<h2 class="text-2xl font-semibold tracking-tight text-white">Your teams & courseloads</h2>
					<p class="text-sm leading-relaxed text-slate-300">
						Teams are your program, technical, and club-wide business assignments. Courseloads bundle courses; each course
						contains modules (video, quiz, checkoff) inside Learn.
					</p>
					{#if coursesDashboard.teams.length === 0}
						<div class="rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
							<p class="font-medium">Complete team placement</p>
							<p class="mt-1 text-xs text-amber-200/90">
								Start the <a class="font-semibold underline" href="/surveys/team-path-selection">Team placement</a> survey to assign teams and unlock courseloads.
							</p>
						</div>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each coursesDashboard.teams as t (t.groupSlug + t.teamSlug)}
								<span
									class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 backdrop-blur-sm"
								>
									<span class="text-slate-400">{t.groupName}</span>
									<span class="font-medium text-white">{t.teamName}</span>
								</span>
							{/each}
						</div>
					{/if}
					<div class="flex flex-wrap gap-2 pt-1">
						<a
							href="/surveys/team-path-selection"
							class="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-900/30 transition hover:bg-sky-400"
						>
							Team placement survey
						</a>
						<a
							href="/courseloads"
							class="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10"
						>
							Browse courseloads
						</a>
					</div>
				</div>
				<div class="w-full min-w-[280px] max-w-md flex-1 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned tracks</p>
					{#each coursesDashboard.courseloads as cl (cl.id)}
						<a
							href={`/courseloads/${cl.slug}`}
							class="block rounded-lg border border-white/5 bg-white/[0.03] p-3 transition hover:border-sky-500/40 hover:bg-white/[0.06]"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-medium text-white">{cl.title}</p>
									<p class="mt-0.5 line-clamp-2 text-xs text-slate-400">{cl.description}</p>
								</div>
								<span class="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
									{cl.progressPct}%
								</span>
							</div>
							<div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
								<div
									class="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
									style={`width: ${cl.progressPct}%`}
								></div>
							</div>
							<p class="mt-2 text-[11px] text-slate-500">
								{cl.completedCount} / {cl.totalCount} courses complete
							</p>
						</a>
					{:else}
						<p class="text-sm text-slate-500">No courseloads yet — finish team placement.</p>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if !primaryTeamId}
		<div class="rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Roster subteam</p>
			<p class="mt-1 text-sm text-slate-300">
				Optional: pick a roster subteam in <a class="font-medium text-sky-300 underline" href="/teams">Teams</a>. Training tracks use your
				<strong class="text-white">Team placement</strong> survey assignments.
			</p>
		</div>
	{/if}

	<div class="grid gap-3 md:grid-cols-3">
		<div class="rounded-xl border border-yellow-700/40 bg-yellow-900/20 p-4 md:col-span-2">
			<p class="text-xs font-semibold uppercase tracking-wide text-yellow-300">Up Next</p>
			{#if redoCheckoff.length > 0}
				<h2 class="mt-1 text-lg font-semibold">Action required: redo checkoff</h2>
				<p class="text-sm text-yellow-100">
					You have {redoCheckoff.length} course{redoCheckoff.length === 1 ? '' : 's'} needing checkoff updates.
				</p>
				<a
					href={`/learn/${redoCheckoff[0].slug}`}
					class="mt-3 inline-flex rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900"
					>Fix first checkoff</a
				>
			{:else if blockedCheckoff.length > 0}
				<h2 class="mt-1 text-lg font-semibold">Blocked checkoff</h2>
				<p class="text-sm text-yellow-100">Resolve mentor safety/compliance feedback before continuing.</p>
				<a
					href={`/learn/${blockedCheckoff[0].slug}`}
					class="mt-3 inline-flex rounded border border-yellow-300 px-3 py-2 text-sm"
					>View blocked details</a
				>
			{:else if recommendedNext}
				<h2 class="mt-1 text-lg font-semibold">{recommendedNext.title}</h2>
				<p class="text-sm text-yellow-100">Highest-impact available course for progression.</p>
				<a
					href={`/learn/${recommendedNext.slug}`}
					class="mt-3 inline-flex rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900"
					>Start course</a
				>
			{:else if awaitingMentor.length > 0}
				<h2 class="mt-1 text-lg font-semibold">Waiting on mentor signoff</h2>
				<p class="text-sm text-yellow-100">
					You have {awaitingMentor.length} course{awaitingMentor.length === 1 ? '' : 's'} ready for review.
				</p>
			{:else}
				<h2 class="mt-1 text-lg font-semibold">No takeable courses right now</h2>
				<p class="text-sm text-yellow-100">Check locked courses below and complete prerequisites.</p>
			{/if}
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">At a glance</p>
			<ul class="mt-2 space-y-1 text-sm text-slate-300">
				<li>{availableNow.length} ready to work on</li>
				<li>{redoCheckoff.length} need checkoff redo</li>
				<li>{blockedCheckoff.length} blocked</li>
				<li>{awaitingMentor.length} awaiting mentor</li>
				<li>{summary.completed} completed total</li>
			</ul>
		</div>
	</div>

	<div class="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
		<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Training categories</p>
		<div class="mt-3 grid gap-3 md:grid-cols-2">
			{#each trainingCategories.filter((c) => c.parent_id == null) as topCat (topCat.id)}
				<div class={`rounded-lg border p-3 ${categoryTone(topCat.slug)}`}>
					<p class="text-sm font-semibold">{topCat.name}</p>
					<p class="mt-1 text-xs opacity-80">
						{nodesByTopCategory.get(topCat.slug)?.length ?? 0} mapped course{(nodesByTopCategory.get(topCat.slug)?.length ?? 0) === 1 ? '' : 's'}
					</p>
					<div class="mt-2 flex flex-wrap gap-1">
						{#each categoryChildren.get(topCat.id) ?? [] as child (child.id)}
							<span class={`rounded px-2 py-0.5 text-[11px] ${categoryTone(child.slug)}`}>{child.name}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		{#if categoryBySlug.get('technical') && categoryBySlug.get('ftc')}
			<p class="mt-3 text-xs text-slate-400">
				Use the Team path survey on the dashboard to unlock FTC vs FRC basics, then your technical and business modules,
				and finally Leadership.
			</p>
		{/if}
	</div>

	<div class="space-y-3">
		<div class="rounded border border-slate-800 bg-slate-900/30 p-3">
			<p class="mb-2 text-sm font-semibold text-slate-200">Surveys</p>
			<div class="grid gap-2">
				{#each visibleSurveys as survey (survey.id)}
					<a
						href={`/surveys/${survey.slug}`}
						class="flex items-center justify-between rounded border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm hover:border-slate-500"
					>
						<div class="min-w-0">
							<p class="truncate font-medium">{survey.title}</p>
							{#if survey.description}
								<p class="truncate text-xs text-slate-400">{survey.description}</p>
							{/if}
						</div>
						<div class="text-right text-xs">
							{#if survey.submittedAt}
								<p class="text-emerald-300">Submitted</p>
							{:else if survey.canOpen}
								<p class="text-yellow-300">Open</p>
							{:else}
								<p class="text-slate-400">
									Locked ({survey.missingCount} prereq{survey.missingCount === 1 ? '' : 's'})
								</p>
							{/if}
						</div>
					</a>
				{:else}
					<p class="text-sm text-slate-400">No surveys available right now.</p>
				{/each}
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<h2 class="mr-auto text-lg font-semibold">{primaryTeamName ? `${primaryTeamName} Training` : 'My Team Training'}</h2>
			<div class="w-full md:w-72">
				<SearchField bind:value={filter} placeholder="Search courses..." />
			</div>
		</div>

		{#if filtered.length === 0}
			<p class="text-sm text-slate-400">No courses match your filter.</p>
		{/if}

		{#if primaryTeamId}
			<div class="space-y-3">
				{#if takeablePrimary.length > 0}
					<div class="grid gap-2">
						{#each takeablePrimary.slice(0, 6) as node (node.id)}
							{@const status = effectiveStatusFor(node.id)}
							<a
								href={`/learn/${node.slug}`}
								class={courseRowClass(status)}
							>
								<span class="font-medium">{node.title}</span>
								<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
							</a>
						{/each}
					</div>
				{/if}

				<div class="rounded border border-slate-800 bg-slate-900/30 p-3">
					<p class="mb-2 text-sm font-semibold text-slate-200">In progress / mentor stage</p>
					<p class="mb-2 text-xs text-slate-400">
						Continue these to clear pending review and finish active work.
					</p>
					<div class="grid gap-2">
						{#each inProgressPrimary as node (node.id)}
							{@const status = effectiveStatusFor(node.id)}
							{@const progressLabel = progressLabelFor(node.id)}
							<a
								href={`/learn/${node.slug}`}
								class={courseRowClass(status)}
							>
								<div class="min-w-0">
									<p class="truncate font-medium">{node.title}</p>
									{#if progressLabel}
										<p class="text-[11px] text-slate-300">{progressLabel}</p>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
								</div>
							</a>
						{:else}
							<p class="text-sm text-slate-400">No in-progress team courses.</p>
						{/each}
					</div>
				</div>

				<div class="rounded border border-slate-800 bg-slate-900/30 p-3">
					<p class="mb-2 text-sm font-semibold text-slate-300">Locked</p>
					<div class="grid gap-2">
						{#each lockedPrimary as node (node.id)}
							{@const status = effectiveStatusFor(node.id)}
							<a
								href={`/learn/${node.slug}`}
								class={courseRowClass(status)}
							>
								<span class="font-medium">{node.title}</span>
								<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
							</a>
						{:else}
							<p class="text-sm text-slate-400">No locked team courses.</p>
						{/each}
					</div>
				</div>

				<div class="rounded border border-slate-800 bg-slate-900/30 p-3">
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
					{#if showCompletedCourses}
						<div class="mt-3 grid gap-2">
							{#each completedPrimary as node (node.id)}
								{@const status = effectiveStatusFor(node.id)}
								<a
									href={`/learn/${node.slug}`}
									class={courseRowClass(status)}
								>
									<span class="font-medium">{node.title}</span>
									<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
								</a>
							{:else}
								<p class="text-sm text-slate-400">No completed team courses yet.</p>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="rounded border border-slate-800 bg-slate-900/30 p-3">
				<button
					type="button"
					class="flex w-full items-center justify-between text-left"
					onclick={() => (showOtherCourses = !showOtherCourses)}
				>
					<span class="text-sm font-semibold text-slate-200">Other courses ({otherNodes.length})</span>
					<span class="text-xs text-slate-400">{showOtherCourses ? 'Hide' : 'Show'}</span>
				</button>
				{#if showOtherCourses}
					<div class="mt-3 space-y-3">
						<div>
							<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
								Available in other tracks
							</p>
							<div class="grid gap-2">
								{#each otherTakeable as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									<a
										href={`/learn/${node.slug}`}
										class={courseRowClass(status)}
									>
										<span class="font-medium">{node.title}</span>
										<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
									</a>
								{:else}
									<p class="text-sm text-slate-400">No takeable outside-team courses.</p>
								{/each}
							</div>
						</div>
						<div>
							<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
								Other remaining courses
							</p>
							<div class="grid gap-2">
								{#each otherRemaining as node (node.id)}
									{@const status = effectiveStatusFor(node.id)}
									<a
										href={`/learn/${node.slug}`}
										class={courseRowClass(status)}
									>
										<span class="font-medium">{node.title}</span>
										<StatusChip label={statusLabel(status)} tone={statusTone(status)} />
									</a>
								{:else}
									<p class="text-sm text-slate-400">No additional courses.</p>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
