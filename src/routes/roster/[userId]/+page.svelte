<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	const teamGroupsById = $derived(
		new Map(((data.teamGroups ?? []) as any[]).map((g) => [String(g.id), g]))
	);
	const subteamsById = $derived(
		new Map(((data.subteams ?? []) as any[]).map((s) => [String(s.id), s]))
	);
	const categoryNameBySlug = $derived(
		new Map(((data.allCategories ?? []) as any[]).map((c) => [String(c.slug), String(c.name)]))
	);

	let pickedTeamId = $state('');

	const categoryTone = (slug: string) => {
		if (slug === 'technical') return 'chip-cyan';
		if (slug === 'business') return 'chip-amber';
		if (slug.startsWith('frc')) return 'chip-violet';
		if (slug.startsWith('ftc')) return 'chip-emerald';
		return 'chip-rose';
	};

	type MembershipRow = { team_id: string; category_slug: string };
	const memberships = $derived((data.userTeamRows ?? []) as MembershipRow[]);
	const teamsByGroup = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const t of (data.subteams ?? []) as any[]) {
			const key = String(t.team_group_id ?? 'other');
			const list = map.get(key) ?? [];
			list.push(t);
			map.set(key, list);
		}
		return map;
	});
	const statusLabel = (status: string) =>
		({
			available: 'Not started',
			video_pending: 'Watching',
			quiz_pending: 'Ready for quiz',
			mentor_checkoff_pending: 'Awaiting mentor checkoff',
			completed: 'Completed'
		})[status] ?? status;
</script>

<section class="space-y-6">
	<div class="fade-up">
		<a href="/roster" class="text-xs" style="color: var(--app-text-muted);">← Back to roster</a>
		<p class="eyebrow-label" style="margin-top: 4px; margin-bottom: 2px;">Course history</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">{data.member.full_name || data.member.email}</span>
		</h1>
	</div>
	{#if form?.error}
		<p
			class="rounded border p-2 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded border p-2 text-sm"
			style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}

	<div class="fade-up grid gap-4 md:grid-cols-3" style="animation-delay: 0.05s;">
		<GlassCard>
			<p class="eyebrow-label">Rank</p>
			<p class="mt-1 text-lg font-semibold" style="color: var(--app-text);">
				{data.rankSummary?.rank?.name ?? 'Rookie'}
			</p>
			<p class="text-sm" style="color: var(--app-text-muted);">
				{data.rankSummary?.rank?.medal_label ?? 'Bronze Medal'}
			</p>
			<p class="mono mt-2 text-xs" style="color: var(--app-text-muted);">
				{data.rankSummary?.totalPoints ?? 0} total points
			</p>
			<p class="mono text-xs" style="color: var(--app-text-muted);">
				Courses {data.rankSummary?.coursePoints ?? 0} + Attendance {data.rankSummary
					?.attendancePoints ?? 0}
			</p>
		</GlassCard>
		<GlassCard>
			<p class="eyebrow-label">Completions</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">
				{data.rankSummary?.courseCompletions ?? 0}
			</p>
			<p class="text-xs" style="color: var(--app-text-muted);">Completed courses</p>
		</GlassCard>
		<GlassCard>
			<p class="eyebrow-label">Attendance</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">
				{data.rankSummary?.attendanceDays ?? 0}
			</p>
			<p class="text-xs" style="color: var(--app-text-muted);">Distinct attendance days</p>
		</GlassCard>
	</div>

	{#if data.canManageUsers}
		<GlassCard>
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-lg font-semibold" style="color: var(--app-text);">Subteam membership</h2>
				<p class="text-xs" style="color: var(--app-text-dim);">
					Onboarding picks one subteam per required category. Use this to add more.
				</p>
			</div>
			<div class="mt-3 space-y-2">
				{#each memberships as row (row.team_id + row.category_slug)}
					{@const team = subteamsById.get(String(row.team_id))}
					{@const group = team ? teamGroupsById.get(String(team.team_group_id)) : null}
					<div
						class="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					>
						<div class="min-w-0">
							<p class="text-sm font-semibold" style="color: var(--app-text);">
								{team?.name ?? 'Unknown subteam'}
							</p>
							<p class="text-[11px]" style="color: var(--app-text-muted);">
								{group?.name ?? ''} · {categoryNameBySlug.get(row.category_slug) ??
									row.category_slug}
							</p>
						</div>
						<form
							method="POST"
							action="?/removeSubteam"
							onsubmit={(e) => {
								if (!confirm('Remove this membership?')) e.preventDefault();
							}}
						>
							<input type="hidden" name="team_group_id" value={team?.team_group_id ?? ''} />
							<input type="hidden" name="category_slug" value={row.category_slug} />
							<button
								type="submit"
								class="rounded-lg border px-2.5 py-1 text-xs font-semibold"
								style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
							>
								Remove
							</button>
						</form>
					</div>
				{:else}
					<p class="text-sm" style="color: var(--app-text-muted);">No subteams assigned.</p>
				{/each}
			</div>

			<form
				method="POST"
				action="?/addExtraSubteam"
				class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
			>
				<label class="flex flex-1 flex-col gap-1.5 text-sm">
					<span class="eyebrow-label">Add another subteam</span>
					<select
						class="w-full rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="team_id"
						bind:value={pickedTeamId}
						required
					>
						<option value="">Select a subteam…</option>
						{#each data.teamGroups ?? [] as group}
							{@const groupTeams = teamsByGroup.get(String(group.id)) ?? []}
							{#if groupTeams.length > 0}
								<optgroup label={group.name}>
									{#each groupTeams as t}
										<option value={t.id}>
											{t.name} · {categoryNameBySlug.get(t.category_slug) ?? t.category_slug}
										</option>
									{/each}
								</optgroup>
							{/if}
						{/each}
					</select>
				</label>
				<button
					type="submit"
					class="rounded-xl px-4 py-2 text-sm font-semibold"
					style="background: var(--app-accent); color: var(--app-accent-text);"
				>
					Add subteam
				</button>
			</form>
		</GlassCard>
	{/if}

	<GlassCard>
		<div id="course-results">
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Course and Test Results</h2>
			<div class="mt-3 space-y-2">
				{#each data.courseResults as course}
					<div
						class="rounded-lg border p-3"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					>
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-medium" style="color: var(--app-text);">{course.nodes?.title}</p>
								<p class="text-xs" style="color: var(--app-text-muted);">{course.nodes?.slug}</p>
							</div>
							<span
								class="rounded px-2 py-0.5 text-xs"
								style="background: var(--app-surface-alt); color: var(--app-text);"
								>{statusLabel(course.status)}</span
							>
						</div>
						<p class="mt-2 text-xs" style="color: var(--app-text-muted);">
							Quiz score: {course.quiz_score ?? '—'} · Quiz passed: {course.quiz_passed_at
								? new Date(course.quiz_passed_at).toLocaleString()
								: '—'} · Approved: {course.approved_at
								? new Date(course.approved_at).toLocaleString()
								: '—'}
						</p>
						<div class="mt-2 flex flex-wrap gap-1">
							{#each course.categories as category}
								<span
									class={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${categoryTone(category.slug)}`}
								>
									{category.name}
								</span>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-sm" style="color: var(--app-text-muted);">No course records yet.</p>
				{/each}
			</div>
		</div>
	</GlassCard>
</section>
