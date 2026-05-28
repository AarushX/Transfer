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

	// Cast to the shared CatalogCourse shape; the loader projects courses
	// into that shape so this page can render the same CourseCard component
	// as `/coursework`.
	const courses = $derived((data.courses ?? []) as CatalogCourse[]);
	const total = $derived(courses.length);

	const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
	const sortedCourses = $derived(
		[...courses].sort((a, b) => {
			const la = a.proficiencyLevel ? LEVEL_ORDER[a.proficiencyLevel] : 99;
			const lb = b.proficiencyLevel ? LEVEL_ORDER[b.proficiencyLevel] : 99;
			if (la !== lb) return la - lb;
			return (a.code ?? a.title).localeCompare(b.code ?? b.title);
		})
	);

	const progressPct = $derived(
		total === 0 ? 0 : Math.round(((data.statusCounts?.done ?? 0) / total) * 100)
	);
</script>

<section class="space-y-6">
	<!-- ═══════════ HEADER (coursework-style hero) ═══════════ -->
	<header class="fade-up">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div class="min-w-0">
				<p class="eyebrow-label">
					{data.teamGroup?.name ?? 'Team'} · Subteam
				</p>
				<h1
					class="text-3xl font-extrabold tracking-tighter"
					style="letter-spacing: -0.02em;"
				>
					<span class="gradient-text"
						>{data.subteamCategory?.name ?? data.subteam?.name ?? 'Subteam'}</span
					>
				</h1>
				<p class="mt-1 max-w-xl text-sm" style="color: var(--app-text-muted);">
					Every course required for this subteam.{#if !data.userIsOnSubteam}
						<span style="color: var(--app-warning);">
							You're viewing this subteam but not assigned to it.</span
						>
					{/if}
				</p>
			</div>
			<!-- Subteam progress stat — the donut from before, but now living in
			     the header card like `/coursework`'s progress ring. Hover a
			     segment to see what it represents. -->
			<div
				class="flex items-center gap-3 rounded-2xl border px-4 py-3"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			>
				<StatusDonut counts={data.statusCounts} size={64} />
				<div>
					<p
						class="text-[10px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
						Subteam progress
					</p>
					<p class="text-sm" style="color: var(--app-text);">
						<span class="mono font-bold">{data.statusCounts?.done ?? 0}</span>
						<span style="color: var(--app-text-dim);">/ {total} done · {progressPct}%</span>
					</p>
				</div>
			</div>
		</div>
	</header>

	<!-- ═══════════ COURSE CATALOG (shared CourseCard, compact density) ═══════════ -->
	<div class="fade-up space-y-3" style="animation-delay: 0.05s;">
		<div class="section-divider">
			<h2 class="section-divider-label">
				Coursework
				<span class="mono text-[11px]" style="color: var(--app-text-dim);">{total}</span>
			</h2>
		</div>

		{#if total === 0}
			<GlassCard
				><p class="text-sm" style="color: var(--app-text-muted);">
					No courses tied to this subteam yet.
				</p></GlassCard
			>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each sortedCourses as course (course.nodeId)}
					<CourseCard {course} {teamsById} {teamGroupsById} compact />
				{/each}
			</div>
		{/if}
	</div>

	<!-- ═══════════ PINBOARD ═══════════ -->
	<div class="fade-up space-y-3" style="animation-delay: 0.15s;">
		<div class="section-divider">
			<h2 class="section-divider-label">
				Resources
				<span class="text-[11px] font-normal normal-case tracking-normal" style="color: var(--app-text-dim);">
					{data.canManageResources
						? 'Pin CAD files, strategy docs, trackers.'
						: 'Curated by subteam leads.'}
				</span>
			</h2>
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
				class="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<input type="hidden" name="team_id" value={data.userTeamId} />
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-1">
					<span class="eyebrow-label">Title</span>
					<input
						class="rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="title"
						required
						placeholder="Robot V1 OnShape"
					/>
				</label>
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-1">
					<span class="eyebrow-label">URL</span>
					<input
						class="mono rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="url"
						type="text"
						required
						placeholder="test.com or https://example.com"
					/>
				</label>
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
					<span class="eyebrow-label"
						>Description <span class="text-xs" style="color: var(--app-text-dim);">(optional)</span
						></span
					>
					<textarea
						class="rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="description"
						rows="2"
						placeholder="What this is for."
					></textarea>
				</label>
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
					<span class="eyebrow-label"
						>Image URL <span class="text-xs" style="color: var(--app-text-dim);">(optional)</span
						></span
					>
					<input
						class="mono rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="image_url"
						type="text"
						placeholder="test.com/cover.png or https://…"
					/>
				</label>
				<div class="flex justify-end sm:col-span-2">
					<Button variant="primary" type="submit" size="sm">Pin to board</Button>
				</div>
			</form>
		{/if}

		{#if resources.length === 0}
			<GlassCard>
				<p class="text-sm" style="color: var(--app-text-muted);">
					Nothing pinned here yet.{data.canManageResources
						? ' Use “Add resource” to drop a link in.'
						: ''}
				</p>
			</GlassCard>
		{:else}
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
		<div class="fade-up space-y-3" style="animation-delay: 0.2s;">
			<div class="section-divider">
				<h2 class="section-divider-label">
					Subteam roster
					<span class="text-[11px] font-normal normal-case tracking-normal" style="color: var(--app-text-dim);">
						{data.roster.length} member{data.roster.length !== 1 ? 's' : ''}
					</span>
				</h2>
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
	/* Full-width section header with a hairline that extends to the right
	   edge of the content area. Replaces the leading-dot "● COURSEWORK"
	   pattern with something that reads as a real section separator. */
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
			color-mix(in srgb, var(--app-glass-border) 90%, transparent),
			transparent
		);
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

