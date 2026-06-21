<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import CourseCard, {
		type CatalogCourse,
		type TeamRow,
		type TeamGroupRow
	} from '$lib/components/coursework/CourseCard.svelte';

	let { data } = $props();

	const teamsById = $derived(
		new Map(((data.teams ?? []) as TeamRow[]).map((t) => [String(t.id), t]))
	);
	const teamGroupsById = $derived(
		new Map(((data.teamGroups ?? []) as TeamGroupRow[]).map((g) => [String(g.id), g]))
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
	const availableAll = $derived(catalog.filter((c) => !c.isRequired && c.status !== 'completed'));
	const completedAll = $derived(catalog.filter((c) => c.status === 'completed'));

	const required = $derived(requiredAll.filter((c) => matchesQuery(c) && matchesLevel(c)));
	const available = $derived(availableAll.filter((c) => matchesQuery(c) && matchesLevel(c)));
	const completed = $derived(completedAll.filter((c) => matchesQuery(c) && matchesLevel(c)));

	const totals = $derived({
		all: catalog.length,
		required: requiredAll.length,
		available: availableAll.length,
		completed: completedAll.length,
		progressPct: catalog.length === 0 ? 0 : Math.round((completedAll.length / catalog.length) * 100)
	});

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
					<p
						class="text-[10px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
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
			<!-- Search bar. Uses type="text" so the WebKit native clear (X) doesn't
			     fight with our Clear button; focus state is on the label via
			     :focus-within so the user gets visible feedback. -->
			<label class="cw-search flex items-center gap-2 rounded-2xl border px-4 py-2">
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
					type="text"
					bind:value={query}
					placeholder="Search courses, codes, descriptions…"
					autocomplete="off"
					spellcheck="false"
					class="flex-1 bg-transparent text-sm outline-none placeholder:opacity-70"
					style="color: var(--app-text);"
				/>
				{#if query.length > 0}
					<button
						type="button"
						class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
						style="background: color-mix(in srgb, var(--app-text) 8%, transparent); color: var(--app-text-muted);"
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
		{#snippet section(title: string, list: CatalogCourse[], emptyMsg: string, accent: string)}
			<div class="space-y-3">
				<div class="section-divider" style="--divider-accent: {accent};">
					<h2 class="section-divider-label">
						{title}
						<span class="mono text-[11px] font-semibold" style="color: var(--app-text-dim);"
							>{list.length}</span
						>
					</h2>
				</div>
				{#if list.length === 0}
					<p class="text-sm italic" style="color: var(--app-text-dim);">{emptyMsg}</p>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each sortCourses(list) as course (course.nodeId)}
							<CourseCard {course} {teamsById} {teamGroupsById} />
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
	/* Full-width section header with a tinted hairline; the section's
	   accent color tints the leading edge of the line. */
	.section-divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.section-divider-label {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--app-text);
		white-space: nowrap;
	}
	.section-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--divider-accent, var(--app-glass-border)) 60%, transparent),
			transparent
		);
	}

	.cw-search {
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
		box-shadow: var(--app-glass-shadow);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.cw-search:focus-within {
		border-color: color-mix(in srgb, var(--app-accent) 55%, var(--app-glass-border));
		box-shadow:
			0 0 0 3px color-mix(in srgb, var(--app-accent) 20%, transparent),
			var(--app-glass-shadow);
	}
	.cw-search input {
		background: transparent;
		border: none;
		border-radius: 0;
		padding: 0;
		box-shadow: none;
	}
	.cw-search input:hover,
	.cw-search input:focus {
		border: none;
		box-shadow: none;
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
		transition:
			background 0.12s ease,
			color 0.12s ease,
			border-color 0.12s ease,
			transform 0.12s ease;
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
