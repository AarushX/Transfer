<script lang="ts">
	let { data, form } = $props();

	const categoryTone = (slug: string) => {
		if (slug === 'technical') return 'bg-sky-900/30 text-sky-100 border-sky-700/50';
		if (slug === 'business') return 'bg-amber-900/30 text-amber-100 border-amber-700/50';
		if (slug.startsWith('frc')) return 'bg-blue-900/30 text-blue-100 border-blue-700/50';
		if (slug.startsWith('ftc')) return 'bg-indigo-900/30 text-indigo-100 border-indigo-700/50';
		return 'bg-slate-800 text-slate-200 border-slate-700';
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
</script>

<section class="space-y-6">
	<div>
		<a href="/roster" class="text-xs text-slate-400">← Back to roster</a>
		<h1 class="mt-1 text-2xl font-semibold">{data.member.full_name || data.member.email}</h1>
		<p class="text-sm text-slate-400">{data.member.email} · {data.member.role}</p>
	</div>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	<div class="grid gap-4 md:grid-cols-3">
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="text-xs uppercase tracking-wide text-slate-400">Rank</p>
			<p class="mt-1 text-lg font-semibold">{data.rankSummary?.rank?.name ?? 'Rookie'}</p>
			<p class="text-sm text-slate-300">{data.rankSummary?.rank?.medal_label ?? 'Bronze Medal'}</p>
			<p class="mt-2 text-xs text-slate-400">{data.rankSummary?.totalPoints ?? 0} total points</p>
			<p class="text-xs text-slate-500">
				Courses {data.rankSummary?.coursePoints ?? 0} + Attendance {data.rankSummary?.attendancePoints ?? 0}
			</p>
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="text-xs uppercase tracking-wide text-slate-400">Completions</p>
			<p class="mt-1 text-lg font-semibold">{data.rankSummary?.courseCompletions ?? 0}</p>
			<p class="text-xs text-slate-400">Completed courses</p>
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="text-xs uppercase tracking-wide text-slate-400">Attendance</p>
			<p class="mt-1 text-lg font-semibold">{data.rankSummary?.attendanceDays ?? 0}</p>
			<p class="text-xs text-slate-400">Distinct attendance days</p>
		</div>
	</div>

	<div id="course-results" class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="text-lg font-semibold">Course and Test Results</h2>
		<div class="mt-3 space-y-2">
			{#each data.courseResults as course}
				<div class="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-medium">{course.nodes?.title}</p>
							<p class="text-xs text-slate-500">{course.nodes?.slug}</p>
						</div>
						<span class="rounded bg-slate-800 px-2 py-0.5 text-xs">{statusLabel(course.status)}</span>
					</div>
					<p class="mt-2 text-xs text-slate-400">
						Quiz score: {course.quiz_score ?? '—'} · Quiz passed: {course.quiz_passed_at ? new Date(course.quiz_passed_at).toLocaleString() : '—'} · Approved: {course.approved_at ? new Date(course.approved_at).toLocaleString() : '—'}
					</p>
					<div class="mt-2 flex flex-wrap gap-1">
						{#each course.categories as category}
							<span class={`rounded border px-2 py-0.5 text-[11px] ${categoryTone(category.slug)}`}>
								{category.name}
							</span>
						{/each}
					</div>
				</div>
			{:else}
				<p class="text-sm text-slate-400">No course records yet.</p>
			{/each}
		</div>
	</div>

	{#if data.canManageUsers}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="text-lg font-semibold">Admin: Team assignments</h2>
			<form method="POST" action="?/setUserTeams" class="mt-3 space-y-2">
				<label class="flex flex-col gap-1 text-xs">
					<span>Main team</span>
					<select class="rounded bg-slate-800 px-2 py-1.5" name="primary_team_group_id" required>
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
						<span>{categorySlug} subteam</span>
						<select class="rounded bg-slate-800 px-2 py-1.5" name={`team_id_${categorySlug}`} required>
							<option value="">Select {categorySlug} subteam</option>
							{#each data.subteams as subteam}
								{#if String(subteam.category_slug ?? '') === categorySlug}
									<option value={subteam.id} selected={currentTeamIdForCategory(categorySlug) === String(subteam.id)}>
										{subteam.slug || subteam.name}
									</option>
								{/if}
							{/each}
						</select>
					</label>
				{/each}
				<button class="rounded border border-slate-700 px-2 py-1 text-xs">Save team assignments</button>
			</form>
		</div>
	{/if}

</section>
