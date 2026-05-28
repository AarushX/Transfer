<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import StatusDonut from '$lib/components/StatusDonut.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';
	import CourseCard, {
		type CatalogCourse,
		type TeamRow,
		type TeamGroupRow
	} from '$lib/components/coursework/CourseCard.svelte';
	let { data, form } = $props();

	type Resource = {
		id: string;
		team_id: string;
		title: string;
		url: string;
		description: string;
		image_url: string | null;
		position: number;
	};
	const resources = $derived((data.resources ?? []) as Resource[]);
	const teamAccent = $derived(String((data as any).teamGroup?.color_hex ?? '#475569'));

	let showAddResource = $state(false);
	let editingResourceId = $state<string | null>(null);

	const teamsById = $derived(
		new Map(((data.teams ?? []) as TeamRow[]).map((t) => [String(t.id), t]))
	);
	const teamGroupsById = $derived(
		new Map(((data.teamGroups ?? []) as TeamGroupRow[]).map((g) => [String(g.id), g]))
	);

	// Display name for the subteam: prefer the actual team the user picked
	// ("Outreach", "FRC Build", …) over the category slug ("Business" /
	// "Technical"), because that's what the sidebar shows and what the user
	// recognizes as "their subteam".
	const subteamDisplayName = $derived(
		(data.userTeamId ? teamsById.get(String(data.userTeamId))?.name : null) ??
			data.subteam?.name ??
			data.subteamCategory?.name ??
			'Subteam'
	);

	// Donut hover handoff: when a segment is hovered, the stat card swaps
	// "X / Y done" for "N {Label}". The percentage in the donut center stays.
	let hoveredSegment = $state<string | null>(null);
	const segmentLabel = (key: string) =>
		key === 'done'
			? 'Done'
			: key === 'current'
				? 'In progress'
				: key === 'awaiting'
					? 'Awaiting mentor'
					: key === 'blocked'
						? 'Blocked'
						: 'Locked';
	const segmentCount = (key: string): number => {
		const c = data.statusCounts ?? ({} as Record<string, number>);
		return (c as Record<string, number>)[key] ?? 0;
	};

	// Cast to the shared CatalogCourse shape; the loader projects courses
	// into that shape so this page can render the same CourseCard component
	// as `/coursework`.
	const courses = $derived((data.courses ?? []) as CatalogCourse[]);
	const total = $derived(courses.length);

	const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
	function sortCourses(list: CatalogCourse[]) {
		return [...list].sort((a, b) => {
			const la = a.proficiencyLevel ? LEVEL_ORDER[a.proficiencyLevel] : 99;
			const lb = b.proficiencyLevel ? LEVEL_ORDER[b.proficiencyLevel] : 99;
			if (la !== lb) return la - lb;
			return (a.code ?? a.title).localeCompare(b.code ?? b.title);
		});
	}
	const incompleteCourses = $derived(sortCourses(courses.filter((c) => c.status !== 'completed')));
	const completedCourses = $derived(sortCourses(courses.filter((c) => c.status === 'completed')));

	const progressPct = $derived(
		total === 0 ? 0 : Math.round(((data.statusCounts?.done ?? 0) / total) * 100)
	);
</script>

<section class="space-y-10">
	<!-- ═══════════ HEADER (coursework-style hero) ═══════════ -->
	<header class="fade-up">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div class="min-w-0">
				<p class="eyebrow-label">
					{data.teamGroup?.name ?? 'Team'}
				</p>
				<h1
					class="text-3xl font-extrabold tracking-tighter"
					style="letter-spacing: -0.02em;"
				>
					<span class="gradient-text">{subteamDisplayName}</span>
				</h1>
				{#if !data.userIsOnSubteam}
					<p class="mt-1 text-sm" style="color: var(--app-warning);">
						You're viewing this subteam but not assigned to it.
					</p>
				{/if}
			</div>
			<!-- Progress stat — donut keeps showing the overall %; the label on
			     the right swaps from "N / total done" to the hovered segment
			     (e.g. "1 In progress") while the cursor is on a segment.
			     min-w on the label container reserves space for the widest
			     possible label ("Awaiting mentor") so swapping states doesn't
			     resize the card and yank the donut out from under the cursor
			     (which used to cause a hover-on/hover-off flicker). -->
			<div
				class="flex items-center gap-3 rounded-2xl border px-4 py-3"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			>
				<StatusDonut
					counts={data.statusCounts}
					size={64}
					onSegmentHover={(key) => (hoveredSegment = key)}
				/>
				<div class="min-w-[10.5rem]">
					<p
						class="text-[10px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
						Progress
					</p>
					{#if hoveredSegment}
						<p class="text-sm" style="color: var(--app-text);">
							<span class="mono font-bold">{segmentCount(hoveredSegment)}</span>
							<span style="color: var(--app-text-dim);">{segmentLabel(hoveredSegment)}</span>
						</p>
					{:else}
						<p class="text-sm" style="color: var(--app-text);">
							<span class="mono font-bold">{data.statusCounts?.done ?? 0}</span>
							<span style="color: var(--app-text-dim);">/ {total} done</span>
						</p>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- ═══════════ COURSE CATALOG (shared CourseCard, compact density) ═══════════ -->
	<div class="fade-up space-y-4" style="animation-delay: 0.05s;">
		<div class="section-divider" style="--divider-accent: var(--app-accent);">
			<h2 class="section-divider-label">
				Coursework
				<span class="mono">{incompleteCourses.length}</span>
			</h2>
		</div>

		{#if total === 0}
			<GlassCard
				><p class="text-sm" style="color: var(--app-text-muted);">
					No courses tied to this subteam yet.
				</p></GlassCard
			>
		{:else if incompleteCourses.length === 0}
			<p class="text-sm italic" style="color: var(--app-text-dim);">
				Everything's done. Nice work.
			</p>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each incompleteCourses as course (course.nodeId)}
					<CourseCard {course} {teamsById} {teamGroupsById} compact />
				{/each}
			</div>
		{/if}
	</div>

	<!-- ═══════════ COMPLETED FOLD ═══════════
	     Completed courses live in their own collapsible bar instead of
	     cluttering the main grid. Mirrors the "Completed" section on the
	     main /coursework page. -->
	{#if completedCourses.length > 0}
		<details class="fade-up completed-fold" style="animation-delay: 0.1s;">
			<summary
				class="section-divider completed-fold-summary"
				style="--divider-accent: var(--app-success);"
			>
				<h2 class="section-divider-label">
					Completed
					<span class="mono">{completedCourses.length}</span>
				</h2>
				<svg
					class="completed-fold-chevron h-3 w-3 shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					style="color: var(--app-text-muted);"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</summary>
			<div class="grid gap-3 pt-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each completedCourses as course (course.nodeId)}
					<CourseCard {course} {teamsById} {teamGroupsById} compact />
				{/each}
			</div>
		</details>
	{/if}

	<!-- ═══════════ PINBOARD ═══════════ -->
	<div class="fade-up space-y-4" style="animation-delay: 0.15s;">
		<div class="section-divider" style="--divider-accent: var(--app-info);">
			<div class="min-w-0">
				<h2 class="section-divider-label">Resources</h2>
				<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
					{data.canManageResources
						? 'Pin CAD files, strategy docs, trackers.'
						: 'Curated by subteam leads.'}
				</p>
			</div>
			{#if data.canManageResources && data.userTeamId}
				<Button variant="primary" size="sm" onclick={() => (showAddResource = !showAddResource)}>
					{showAddResource ? 'Cancel' : '+ Add resource'}
				</Button>
			{/if}
		</div>

		{#if showAddResource && data.canManageResources && data.userTeamId}
			<form
				method="POST"
				action="?/createResource"
				class="resource-form rounded-2xl border p-5"
				style="background: var(--app-glass-bg); border-color: color-mix(in srgb, var(--app-accent) 30%, var(--app-glass-border));"
			>
				<input type="hidden" name="team_id" value={data.userTeamId} />
				<div class="mb-4 flex items-center gap-2">
					<span
						class="grid h-7 w-7 place-items-center rounded-full"
						style="background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-accent);"
						aria-hidden="true"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-3.5 w-3.5"
						>
							<path d="M9 17h6m-3-3v6M12 4v6m0 0a4 4 0 1 0-4-4h8a4 4 0 1 0-4 4Z" />
						</svg>
					</span>
					<div>
						<p class="text-sm font-bold" style="color: var(--app-text);">Pin a new resource</p>
						<p class="text-xs" style="color: var(--app-text-muted);">
							Share a link the whole subteam should bookmark.
						</p>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="flex flex-col gap-1.5 text-sm sm:col-span-1">
						<span class="eyebrow-label">Title</span>
						<input
							class="resource-input rounded-xl border px-3 py-2 text-sm"
							name="title"
							required
							placeholder="Robot V1 OnShape"
						/>
					</label>
					<label class="flex flex-col gap-1.5 text-sm sm:col-span-1">
						<span class="eyebrow-label">URL</span>
						<input
							class="resource-input mono rounded-xl border px-3 py-2 text-sm"
							name="url"
							type="text"
							required
							placeholder="test.com or https://example.com"
						/>
					</label>
					<label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
						<span class="eyebrow-label"
							>Description
							<span class="text-xs" style="color: var(--app-text-dim);">(optional)</span></span
						>
						<textarea
							class="resource-input rounded-xl border px-3 py-2 text-sm"
							name="description"
							rows="2"
							placeholder="What this is for."
						></textarea>
					</label>
					<label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
						<span class="eyebrow-label"
							>Image URL
							<span class="text-xs" style="color: var(--app-text-dim);">(optional)</span></span
						>
						<input
							class="resource-input mono rounded-xl border px-3 py-2 text-sm"
							name="image_url"
							type="text"
							placeholder="test.com/cover.png or https://…"
						/>
					</label>
				</div>
				<div class="mt-4 flex items-center justify-between gap-2">
					<p class="text-[11px]" style="color: var(--app-text-dim);">
						Tip: short titles read best on the card grid.
					</p>
					<div class="flex items-center gap-2">
						<Button variant="ghost" size="sm" onclick={() => (showAddResource = false)}>
							Cancel
						</Button>
						<Button variant="primary" type="submit" size="sm">Pin to board</Button>
					</div>
				</div>
			</form>
		{/if}

		{#if resources.length === 0 && !showAddResource}
			<div
				class="resource-empty rounded-2xl border-2 border-dashed p-8 text-center"
				style="border-color: color-mix(in srgb, var(--app-glass-border) 80%, transparent); background: color-mix(in srgb, var(--app-glass-bg) 50%, transparent);"
			>
				<div class="mx-auto flex flex-col items-center gap-3">
					<div
						class="grid h-12 w-12 place-items-center rounded-2xl"
						style="background: color-mix(in srgb, var(--app-accent) 14%, transparent); color: var(--app-accent);"
						aria-hidden="true"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-6 w-6"
						>
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
						</svg>
					</div>
					<div>
						<p class="text-sm font-semibold" style="color: var(--app-text);">
							No resources pinned yet
						</p>
						<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
							{data.canManageResources
								? 'Drop in the docs, CAD files, and trackers your subteam keeps reaching for.'
								: 'Subteam leads can pin links here. Check back soon.'}
						</p>
					</div>
					{#if data.canManageResources && data.userTeamId}
						<Button variant="primary" size="sm" onclick={() => (showAddResource = true)}>
							+ Pin your first resource
						</Button>
					{/if}
				</div>
			</div>
		{:else if resources.length > 0}
			<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each resources as r (r.id)}
					{#if editingResourceId === r.id}
						<form
							method="POST"
							action="?/updateResource"
							class="space-y-2 rounded-2xl border p-3 sm:col-span-2 lg:col-span-3"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
						>
							<input type="hidden" name="id" value={r.id} />
							<div class="grid gap-2 sm:grid-cols-2">
								<input
									class="rounded-xl border px-3 py-2 text-sm"
									style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
									name="title"
									value={r.title}
									required
								/>
								<input
									class="mono rounded-xl border px-3 py-2 text-sm"
									style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
									name="url"
									type="text"
									value={r.url}
									required
								/>
							</div>
							<textarea
								class="w-full rounded-xl border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="description"
								rows="2">{r.description}</textarea
							>
							<input
								class="mono w-full rounded-xl border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="image_url"
								type="text"
								value={r.image_url ?? ''}
								placeholder="Image URL (optional)"
							/>
							<div class="flex justify-end gap-2">
								<Button variant="ghost" size="sm" onclick={() => (editingResourceId = null)}
									>Cancel</Button
								>
								<Button variant="primary" type="submit" size="sm">Save</Button>
							</div>
						</form>
					{:else}
						<div
							class="group relative flex flex-col overflow-hidden rounded-2xl border transition duration-150 hover:-translate-y-0.5"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
						>
							<a href={r.url} target="_blank" rel="noopener noreferrer" class="block">
								<div
									class="aspect-[16/9] w-full"
									style={r.image_url
										? `background-image: url(${r.image_url}); background-size: cover; background-position: center;`
										: `background: linear-gradient(135deg, color-mix(in srgb, ${teamAccent} 40%, transparent), color-mix(in srgb, ${teamAccent} 12%, transparent));`}
								>
									{#if !r.image_url}
										<div class="flex h-full items-center justify-center px-4 text-center">
											<span
												class="text-sm font-bold tracking-tight"
												style="color: color-mix(in srgb, {teamAccent} 70%, white); text-shadow: 0 2px 12px color-mix(in srgb, {teamAccent} 35%, transparent);"
											>
												{r.title}
											</span>
										</div>
									{/if}
								</div>
								<div class="p-3">
									<p class="text-sm font-semibold" style="color: var(--app-text);">
										{r.title}
									</p>
									{#if r.description}
										<p class="mt-1 line-clamp-2 text-xs" style="color: var(--app-text-muted);">
											{r.description}
										</p>
									{/if}
									<p class="mono mt-1.5 truncate text-[10px]" style="color: var(--app-text-dim);">
										{r.url.replace(/^https?:\/\//, '')}
									</p>
								</div>
							</a>
							{#if data.canManageResources}
								<div
									class="flex items-center justify-end gap-1.5 border-t px-3 py-2"
									style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);"
								>
									<button
										type="button"
										class="resource-action"
										onclick={() => (editingResourceId = r.id)}
									>
										Edit
									</button>
									<form
										method="POST"
										action="?/deleteResource"
										onsubmit={(e) => {
											if (!confirm('Remove this resource?')) e.preventDefault();
										}}
									>
										<input type="hidden" name="id" value={r.id} />
										<button type="submit" class="resource-action resource-action--danger">
											Remove
										</button>
									</form>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}

	<!-- ═══════════ ROSTER ═══════════ -->
	{#if data.canViewRoster && data.roster && data.roster.length > 0}
		<div class="fade-up space-y-4" style="animation-delay: 0.2s;">
			<div class="section-divider" style="--divider-accent: var(--app-warning);">
				<div class="min-w-0">
					<h2 class="section-divider-label">Subteam roster</h2>
					<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
						{data.roster.length} member{data.roster.length !== 1 ? 's' : ''}
					</p>
				</div>
			</div>
			<div
				class="overflow-hidden rounded-2xl border"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<table class="w-full text-sm">
					<thead style="background: var(--app-table-header-bg);">
						<tr>
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Member</th
							>
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Level</th
							>
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Roles</th
							>
						</tr>
					</thead>
					<tbody>
						{#each data.roster as m (m.id)}
							<tr
								class="border-t"
								style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
							>
								<td class="px-4 py-2.5">
									<p class="text-sm font-medium" style="color: var(--app-text);">
										{m.full_name || m.email}
									</p>
									<p class="text-[11px]" style="color: var(--app-text-dim);">{m.email}</p>
								</td>
								<td class="px-4 py-2.5">
									<ProficiencyBadge level={m.proficiency_level} size="xs" />
								</td>
								<td class="px-4 py-2.5">
									<div class="flex flex-wrap gap-1">
										{#if m.role === 'admin' || m.base_role === 'admin'}<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);"
												>admin</span
											>{/if}
										{#if m.is_mentor}<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);"
												>mentor</span
											>{/if}
										{#if m.is_lead}<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);"
												>lead</span
											>{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>

<style>
	/* Section header — meant to read as an actual region heading, not a
	   tiny "● coursework" label. Bigger title, full-width solid rule
	   underneath (no gradient fade), and a count badge / right-side slot
	   for action buttons. Combined with space-y-10 on the parent section,
	   each region feels distinctly chambered instead of bleeding together. */
	.section-divider {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--app-glass-border);
		position: relative;
	}
	/* Accent stub on the left edge of the rule, color-mixed from the section's
	   --divider-accent (set inline). Adds just enough hue to anchor the
	   section without competing with the content below. */
	.section-divider::before {
		content: '';
		position: absolute;
		left: 0;
		right: 80%;
		bottom: -1px;
		height: 2px;
		border-radius: 2px;
		background: var(--divider-accent, var(--app-accent));
		opacity: 0.85;
	}
	.section-divider-label {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.01em;
		text-transform: none;
		color: var(--app-text);
	}
	.section-divider-label .mono {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		padding: 0 0.4rem;
		height: 1.25rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--app-text) 8%, transparent);
		color: var(--app-text-muted);
		font-size: 11px;
	}

	/* Completed-courses collapsible: the summary IS the section divider,
	   the chevron rotates when expanded. */
	.completed-fold > summary {
		cursor: pointer;
		list-style: none;
	}
	.completed-fold > summary::-webkit-details-marker {
		display: none;
	}
	.completed-fold-summary:hover .completed-fold-chevron {
		color: var(--app-text);
	}
	.completed-fold[open] .completed-fold-chevron {
		transform: rotate(180deg);
	}
	.completed-fold-chevron {
		transition: transform 0.15s ease, color 0.15s ease;
	}

	/* "Pin a new resource" form — keep inputs consistent with the rest of
	   the app and give them a focus ring. */
	.resource-input {
		background: var(--app-input-bg);
		color: var(--app-input-text);
		border-color: var(--app-glass-border);
		transition:
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	.resource-input:focus {
		outline: none;
		border-color: color-mix(in srgb, var(--app-accent) 55%, var(--app-glass-border));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 20%, transparent);
	}
	.resource-empty {
		transition: border-color 0.18s ease, background 0.18s ease;
	}
	.resource-empty:hover {
		border-color: color-mix(in srgb, var(--app-accent) 40%, var(--app-glass-border));
		background: color-mix(in srgb, var(--app-accent) 5%, var(--app-glass-bg));
	}

	/* Resource-card footer actions: proper pill buttons rather than bare
	   underlined text. */
	.resource-action {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		border: 1px solid var(--app-glass-border);
		background: transparent;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--app-text-muted);
		cursor: pointer;
		transition:
			background 0.12s ease,
			color 0.12s ease,
			border-color 0.12s ease;
	}
	.resource-action:hover {
		background: color-mix(in srgb, var(--app-text) 8%, transparent);
		color: var(--app-text);
		border-color: color-mix(in srgb, var(--app-text) 25%, var(--app-glass-border));
	}
	.resource-action--danger {
		color: var(--app-danger);
		border-color: color-mix(in srgb, var(--app-danger) 35%, var(--app-glass-border));
	}
	.resource-action--danger:hover {
		background: color-mix(in srgb, var(--app-danger) 12%, transparent);
		color: var(--app-danger);
		border-color: color-mix(in srgb, var(--app-danger) 55%, transparent);
	}
</style>

