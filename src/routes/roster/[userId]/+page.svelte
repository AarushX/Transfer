<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();

	const categoryTone = (slug: string) => {
		if (slug === 'technical') return 'chip-cyan';
		if (slug === 'business') return 'chip-amber';
		if (slug.startsWith('frc')) return 'chip-violet';
		if (slug.startsWith('ftc')) return 'chip-emerald';
		return 'chip-rose';
	};
	const statusLabel = (status: string) =>
		({
			available: 'Not started',
			video_pending: 'Watching',
			quiz_pending: 'Ready for quiz',
			mentor_checkoff_pending: 'Awaiting mentor checkoff',
			completed: 'Completed'
		})[status] ?? status;
	const currentTeamIdForCategory = (categorySlug: string) =>
		(data.userTeamRows as Array<{ team_id: string; category_slug?: string | null }>)
			.find((row) => String(row.category_slug ?? '') === categorySlug)
			?.team_id ?? '';
	const teamGroupNameById = new Map(
		((data.teamGroups as Array<{ id: string; name?: string | null }>) ?? []).map((row) => [
			String(row.id),
			String(row.name ?? '')
		])
	);
	const teamOptionLabel = (subteam: { name?: string | null; team_group_id?: string | null }) => {
		const groupName = teamGroupNameById.get(String(subteam.team_group_id ?? '')) ?? '';
		const teamName = String(subteam.name ?? '').trim();
		return groupName ? `${groupName}: ${teamName}` : teamName;
	};
</script>

<section class="space-y-6">
	<div class="fade-up">
		<a href="/roster" class="text-xs" style="color: var(--app-text-muted);">← Back to roster</a>
		<p class="eyebrow-label" style="margin-top: 4px; margin-bottom: 2px;">Member Profile</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">{data.member.full_name || data.member.email}</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.member.email} · {data.member.role}</p>
	</div>
	{#if form?.error}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<div class="fade-up grid gap-4 md:grid-cols-3" style="animation-delay: 0.05s;">
		<GlassCard>
			<p class="eyebrow-label">Rank</p>
			<p class="mt-1 text-lg font-semibold" style="color: var(--app-text);">{data.rankSummary?.rank?.name ?? 'Rookie'}</p>
			<p class="text-sm" style="color: var(--app-text-muted);">{data.rankSummary?.rank?.medal_label ?? 'Bronze Medal'}</p>
			<p class="mono mt-2 text-xs" style="color: var(--app-text-muted);">{data.rankSummary?.totalPoints ?? 0} total points</p>
			<p class="mono text-xs" style="color: var(--app-text-muted);">
				Courses {data.rankSummary?.coursePoints ?? 0} + Attendance {data.rankSummary?.attendancePoints ?? 0}
			</p>
		</GlassCard>
		<GlassCard>
			<p class="eyebrow-label">Completions</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{data.rankSummary?.courseCompletions ?? 0}</p>
			<p class="text-xs" style="color: var(--app-text-muted);">Completed courses</p>
		</GlassCard>
		<GlassCard>
			<p class="eyebrow-label">Attendance</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{data.rankSummary?.attendanceDays ?? 0}</p>
			<p class="text-xs" style="color: var(--app-text-muted);">Distinct attendance days</p>
		</GlassCard>
	</div>

	<GlassCard>
		<div id="course-results">
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Course and Test Results</h2>
			<div class="mt-3 space-y-2">
				{#each data.courseResults as course}
					<div class="rounded-lg border p-3" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-medium" style="color: var(--app-text);">{course.nodes?.title}</p>
								<p class="text-xs" style="color: var(--app-text-muted);">{course.nodes?.slug}</p>
							</div>
							<span class="rounded px-2 py-0.5 text-xs" style="background: var(--app-surface-alt); color: var(--app-text);">{statusLabel(course.status)}</span>
						</div>
						<p class="mt-2 text-xs" style="color: var(--app-text-muted);">
							Quiz score: {course.quiz_score ?? '—'} · Quiz passed: {course.quiz_passed_at ? new Date(course.quiz_passed_at).toLocaleString() : '—'} · Approved: {course.approved_at ? new Date(course.approved_at).toLocaleString() : '—'}
						</p>
						<div class="mt-2 flex flex-wrap gap-1">
							{#each course.categories as category}
								<span class={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${categoryTone(category.slug)}`}>
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

	{#if data.canManageUsers}
		<GlassCard>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Admin: Team assignments</h2>
			<form method="POST" action="?/setUserTeams" class="mt-3 space-y-2">
				<label class="flex flex-col gap-1 text-xs">
					<span style="color: var(--app-text);">Main team</span>
					<select class="rounded px-2 py-1.5" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" name="primary_team_group_id" required>
						<option value="">Select main team</option>
						{#each data.teamGroups as teamGroup}
							<option value={teamGroup.id} selected={String(teamGroup.id) === String(data.currentPrimaryTeamGroupId)}>
								{teamGroup.name}
							</option>
						{/each}
					</select>
				</label>
				{#each data.requiredCategories as category}
					{@const categorySlug = String(category.slug)}
					<label class="flex flex-col gap-1 text-xs">
						<span style="color: var(--app-text);">{categorySlug} subteam</span>
						<select class="rounded px-2 py-1.5" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" name={`team_id_${categorySlug}`} required>
							<option value="">Select {categorySlug} subteam</option>
							{#each data.subteams as subteam}
								{#if String(subteam.category_slug ?? '') === categorySlug}
									<option value={subteam.id} selected={currentTeamIdForCategory(categorySlug) === String(subteam.id)}>
										{teamOptionLabel(subteam)}
									</option>
								{/if}
							{/each}
						</select>
					</label>
				{/each}
				<Button variant="secondary" size="sm" type="submit">Save team assignments</Button>
			</form>
		</GlassCard>
	{/if}

</section>
