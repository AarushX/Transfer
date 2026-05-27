<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';

	type CatalogCourse = {
		nodeId: string;
		title: string;
		slug: string;
		code: string | null;
		proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | null;
		description: string;
		subteamIds: string[];
		teamGroupIds: string[];
		status: string;
		isRequired: boolean;
		href: string;
	};

	let { data } = $props();

	type Team = { id: string; name: string; color_hex: string; team_group_id: string };

	const teamsById = $derived(new Map(((data.teams ?? []) as Team[]).map((t) => [String(t.id), t])));
	const teamGroupsById = $derived(
		new Map(
			((data.teamGroups ?? []) as Array<{ id: string; name: string; color_hex: string }>).map(
				(g) => [String(g.id), g]
			)
		)
	);

	const catalog = $derived((data.catalog ?? []) as CatalogCourse[]);

	// --- Filters / search ---
	let query = $state('');
	let statusFilter = $state<'all' | 'required' | 'available' | 'completed'>('all');
	let levelFilter = $state<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

	function matchesQuery(c: CatalogCourse) {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return (
			c.title.toLowerCase().includes(q) ||
			(c.code ?? '').toLowerCase().includes(q) ||
			c.description.toLowerCase().includes(q)
		);
	}
	function matchesLevel(c: CatalogCourse) {
		return levelFilter === 'all' || c.proficiencyLevel === levelFilter;
	}

	const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
	function sortCourses(list: CatalogCourse[]): CatalogCourse[] {
		return [...list].sort((a, b) => {
			const la = a.proficiencyLevel ? LEVEL_ORDER[a.proficiencyLevel] : 99;
			const lb = b.proficiencyLevel ? LEVEL_ORDER[b.proficiencyLevel] : 99;
			if (la !== lb) return la - lb;
			return (a.code ?? a.title).localeCompare(b.code ?? b.title);
		});
	}

	const requiredAll = $derived(catalog.filter((c) => c.isRequired && c.status !== 'completed'));
	const availableAll = $derived(
		catalog.filter((c) => !c.isRequired && c.status !== 'completed')
	);
	const completedAll = $derived(catalog.filter((c) => c.status === 'completed'));

	const required = $derived(requiredAll.filter((c) => matchesQuery(c) && matchesLevel(c)));
	const available = $derived(availableAll.filter((c) => matchesQuery(c) && matchesLevel(c)));
	const completed = $derived(completedAll.filter((c) => matchesQuery(c) && matchesLevel(c)));

	const totals = $derived({
		all: catalog.length,
		required: requiredAll.length,
		available: availableAll.length,
		completed: completedAll.length,
		progressPct:
			catalog.length === 0 ? 0 : Math.round((completedAll.length / catalog.length) * 100)
	});

	function primaryAccent(course: CatalogCourse): string {
		for (const id of course.subteamIds) {
			const team = teamsById.get(id);
			if (team?.color_hex) return team.color_hex;
		}
		for (const id of course.teamGroupIds) {
			const group = teamGroupsById.get(id);
			if (group?.color_hex) return group.color_hex;
		}
		return course.proficiencyLevel === 'advanced'
			? '#a855f7'
			: course.proficiencyLevel === 'intermediate'
				? '#06b6d4'
				: course.proficiencyLevel === 'beginner'
					? '#22c55e'
					: '#475569';
	}

	function subteamChips(course: CatalogCourse) {
		const chips: Array<{ label: string; color: string }> = [];
		for (const id of course.subteamIds) {
			const team = teamsById.get(id);
			if (team) chips.push({ label: team.name, color: team.color_hex || '#475569' });
		}
		for (const id of course.teamGroupIds) {
			const group = teamGroupsById.get(id);
			if (group)
				chips.push({ label: `${group.name} · all subteams`, color: group.color_hex || '#475569' });
		}
		return chips;
	}

	function statusLabel(status: string) {
		switch (status) {
			case 'completed':
				return 'Completed';
			case 'video_pending':
				return 'Watch';
			case 'quiz_pending':
				return 'Quiz';
			case 'mentor_checkoff_pending':
				return 'Checkoff';
			case 'available':
				return 'Start';
			default:
				return 'Locked';
		}
	}

	function levelLabel(level: string | null) {
		if (!level) return '';
		return level[0].toUpperCase() + level.slice(1);
	}
</script>

<section class="space-y-6">
	<!-- ═══════════ HEADER + STATS HERO ═══════════ -->
	<header class="fade-up">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<p class="eyebrow-label">Catalog</p>
				<h1 class="text-3xl font-extrabold tracking-tighter" style="letter-spacing: -0.02em;">
					<span class="gradient-text">Coursework</span>
				</h1>
				<p class="mt-1 max-w-xl text-sm" style="color: var(--app-text-muted);">
					Every course on offer for your team. Required first, then the rest of the catalog.
				</p>
			</div>
			<!-- Progress ring stat -->
			<div
				class="flex items-center gap-3 rounded-2xl border px-4 py-3"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			>
				<div class="relative grid h-12 w-12 place-items-center">
					<svg viewBox="0 0 36 36" class="h-12 w-12 -rotate-90">
						<circle
							cx="18"
							cy="18"
							r="15.5"
							fill="none"
							stroke="var(--app-glass-border)"
							stroke-width="3"
						/>
						<circle
							cx="18"
							cy="18"
							r="15.5"
							fill="none"
							stroke="url(#cw-progress-grad)"
							stroke-width="3"
							stroke-linecap="round"
							stroke-dasharray={`${(totals.progressPct / 100) * 97.4} 97.4`}
						/>
						<defs>
							<linearGradient id="cw-progress-grad" x1="0" y1="0" x2="1" y2="1">
								<stop offset="0%" stop-color="var(--app-success)" />
								<stop offset="100%" stop-color="var(--app-info)" />
							</linearGradient>
						</defs>
					</svg>
					<span class="mono absolute text-[11px] font-bold" style="color: var(--app-text);">
						{totals.progressPct}%
					</span>
				</div>
				<div>
					<p class="text-[10px] font-bold tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
						Catalog progress
					</p>
					<p class="text-sm" style="color: var(--app-text);">
						<span class="mono font-bold">{totals.completed}</span>
						<span style="color: var(--app-text-dim);">/ {totals.all} done</span>
					</p>
				</div>
			</div>
		</div>
	</header>

	{#if catalog.length === 0}
		<EmptyState
			title="No courses available yet"
			description="Once your team is set in onboarding, the catalog will populate."
		/>
	{:else}
		<!-- ═══════════ SEARCH + FILTERS ═══════════ -->
		<div class="fade-up space-y-3" style="animation-delay: 0.04s;">
			<!-- Search bar -->
			<label
				class="flex items-center gap-2 rounded-2xl border px-4 py-2.5"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-4 w-4 shrink-0"
					style="color: var(--app-text-dim);"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3-3" />
				</svg>
				<input
					type="search"
					bind:value={query}
					placeholder="Search courses, codes, descriptions…"
					class="flex-1 bg-transparent text-sm outline-none"
					style="color: var(--app-text);"
				/>
				{#if query}
					<button
						type="button"
						class="text-xs"
						style="color: var(--app-text-dim);"
						onclick={() => (query = '')}
					>
						Clear
					</button>
				{/if}
			</label>

			<!-- Filter pills row -->
			<div class="flex flex-wrap items-center gap-3">
				<!-- Status pills -->
				<div class="flex flex-wrap gap-1.5">
					{#each [['all', 'All', totals.all], ['required', 'Required', totals.required], ['available', 'Available', totals.available], ['completed', 'Completed', totals.completed]] as [key, label, count]}
						<button
							type="button"
							class="cw-pill"
							class:active={statusFilter === key}
							onclick={() => (statusFilter = key as typeof statusFilter)}
						>
							{label}
							<span class="mono ml-1 text-[10px] opacity-70">{count}</span>
						</button>
					{/each}
				</div>

				<span class="hidden h-4 w-px sm:block" style="background: var(--app-glass-border);"></span>

				<!-- Level pills -->
				<div class="flex flex-wrap gap-1.5">
					{#each ['all', 'beginner', 'intermediate', 'advanced'] as level}
						<button
							type="button"
							class="cw-pill cw-pill--ghost"
							class:active={levelFilter === level}
							onclick={() => (levelFilter = level as typeof levelFilter)}
						>
							{level === 'all' ? 'All levels' : levelLabel(level)}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- ═══════════ COURSE CARDS ═══════════ -->
		{#snippet courseCard(course: CatalogCourse)}
			{@const chips = subteamChips(course)}
			{@const isLocked = course.status === 'locked'}
			{@const isCompleted = course.status === 'completed'}
			{@const accent = primaryAccent(course)}
			<a
				href={course.href}
				class="cw-card group relative flex flex-col overflow-hidden rounded-2xl border"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); opacity: {isLocked
					? 0.6
					: 1};"
				aria-disabled={isLocked}
			>
				<!-- Banner: app-store-style tile head with code + gradient -->
				<div
					class="relative flex h-24 items-center justify-between px-4"
					style="background: linear-gradient(135deg, color-mix(in srgb, {accent} 70%, transparent), color-mix(in srgb, {accent} 18%, transparent));"
				>
					<div class="relative z-10">
						<p
							class="mono text-3xl font-extrabold tracking-tight"
							style="color: white; text-shadow: 0 2px 14px color-mix(in srgb, {accent} 60%, transparent); line-height: 1;"
						>
							{course.code ?? '••'}
						</p>
						{#if course.proficiencyLevel}
							<p
								class="mt-1 text-[10px] font-bold tracking-[0.18em] uppercase"
								style="color: color-mix(in srgb, white 85%, transparent);"
							>
								{levelLabel(course.proficiencyLevel)}
							</p>
						{/if}
					</div>
					<!-- Status pill -->
					<span
						class="relative z-10 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md"
						style={isCompleted
							? 'border-color: rgba(255,255,255,0.45); background: rgba(34,197,94,0.85); color: white;'
							: isLocked
								? 'border-color: rgba(255,255,255,0.3); background: rgba(15,23,41,0.55); color: rgba(255,255,255,0.85);'
								: 'border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.18); color: white;'}
					>
						{statusLabel(course.status)}
					</span>
					<!-- Decorative dot pattern -->
					<svg
						class="pointer-events-none absolute inset-0 h-full w-full opacity-25"
						viewBox="0 0 200 100"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<defs>
							<pattern id="cw-dot-{course.nodeId}" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
								<circle cx="2" cy="2" r="1" fill="white" />
							</pattern>
						</defs>
						<rect width="200" height="100" fill="url(#cw-dot-{course.nodeId})" />
					</svg>
				</div>

				<!-- Body -->
				<div class="flex flex-1 flex-col p-4">
					<h3
						class="text-base font-bold tracking-tight"
						style="color: var(--app-text); line-height: 1.2;"
					>
						{course.title}
					</h3>
					{#if course.description}
						<p
							class="mt-1.5 line-clamp-2 text-[12px] leading-snug"
							style="color: var(--app-text-muted);"
						>
							{course.description}
						</p>
					{/if}

					{#if chips.length > 0}
						<div class="mt-3 flex flex-wrap gap-1.5">
							{#each chips as chip}
								<span
									class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
									style="border-color: color-mix(in srgb, {chip.color} 50%, transparent); background: color-mix(in srgb, {chip.color} 12%, transparent); color: color-mix(in srgb, {chip.color} 70%, white);"
								>
									<span class="h-1.5 w-1.5 rounded-full" style="background: {chip.color};"></span>
									{chip.label}
								</span>
							{/each}
						</div>
					{/if}

					<!-- Footer CTA strip -->
					<div
						class="mt-4 flex items-center justify-between border-t pt-3 text-xs"
						style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);"
					>
						{#if course.proficiencyLevel}
							<ProficiencyBadge level={course.proficiencyLevel} code={null} size="xs" />
						{:else}
							<span></span>
						{/if}
						<span
							class="inline-flex items-center gap-1 font-semibold"
							style="color: {isLocked ? 'var(--app-text-dim)' : 'var(--app-accent)'};"
						>
							{isCompleted ? 'Review' : isLocked ? 'Locked' : 'Open'}
							{#if !isLocked}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="h-3 w-3 transition-transform group-hover:translate-x-0.5"
								>
									<path d="M5 12h14M13 5l7 7-7 7" />
								</svg>
							{/if}
						</span>
					</div>
				</div>
			</a>
		{/snippet}

		{#snippet section(title: string, list: CatalogCourse[], emptyMsg: string, accent: string)}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<span
						class="h-2 w-2 rounded-full"
						style="background: {accent}; box-shadow: 0 0 8px {accent};"
					></span>
					<h2 class="text-sm font-bold tracking-wider uppercase" style="color: var(--app-text);">
						{title}
					</h2>
					<span class="mono text-[11px]" style="color: var(--app-text-dim);">{list.length}</span>
				</div>
				{#if list.length === 0}
					<p class="text-sm italic" style="color: var(--app-text-dim);">{emptyMsg}</p>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each sortCourses(list) as course (course.nodeId)}
							{@render courseCard(course)}
						{/each}
					</div>
				{/if}
			</div>
		{/snippet}

		{@const showAll = statusFilter === 'all'}
		<div class="space-y-8">
			{#if showAll || statusFilter === 'required'}
				{@render section(
					'Required for you',
					required,
					query.trim() ? 'No matches in required.' : 'Nothing required right now.',
					'var(--app-accent)'
				)}
			{/if}
			{#if showAll || statusFilter === 'available'}
				{@render section(
					'Available to browse',
					available,
					query.trim() ? 'No matches in available.' : 'No optional courses available.',
					'var(--app-info)'
				)}
			{/if}
			{#if showAll || statusFilter === 'completed'}
				{@render section(
					'Completed',
					completed,
					query.trim() ? 'No matches in completed.' : 'Nothing finished yet — go knock one out.',
					'var(--app-success)'
				)}
			{/if}
		</div>
	{/if}
</section>

<style>
	.cw-card {
		transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
	}
	.cw-card:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--app-accent) 45%, var(--app-glass-border));
		box-shadow: 0 14px 36px -22px rgba(0, 0, 0, 0.55);
	}

	.cw-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--app-glass-border);
		background: var(--app-glass-bg);
		color: var(--app-text-muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
		cursor: pointer;
	}
	.cw-pill:hover {
		color: var(--app-text);
		border-color: color-mix(in srgb, var(--app-accent) 30%, var(--app-glass-border));
	}
	.cw-pill.active {
		background: color-mix(in srgb, var(--app-accent) 18%, transparent);
		border-color: color-mix(in srgb, var(--app-accent) 45%, transparent);
		color: var(--app-text);
		box-shadow: 0 4px 14px -8px color-mix(in srgb, var(--app-accent) 60%, transparent);
	}
	.cw-pill--ghost {
		background: transparent;
	}
	.cw-pill--ghost.active {
		background: color-mix(in srgb, var(--app-info) 18%, transparent);
		border-color: color-mix(in srgb, var(--app-info) 45%, transparent);
	}
</style>
