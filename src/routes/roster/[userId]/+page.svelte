<script lang="ts">
	let { data } = $props();

	const categoryTone = (slug: string) => {
		if (slug === 'technical') return 'bg-sky-900/30 text-sky-100 border-sky-700/50';
		if (slug === 'business') return 'bg-amber-900/30 text-amber-100 border-amber-700/50';
		if (slug.startsWith('frc')) return 'bg-blue-900/30 text-blue-100 border-blue-700/50';
		if (slug.startsWith('ftc')) return 'bg-indigo-900/30 text-indigo-100 border-indigo-700/50';
		return 'bg-slate-800 text-slate-200 border-slate-700';
	};
</script>

<section class="space-y-6">
	<div>
		<a href="/roster" class="text-xs text-slate-400">← Back to roster</a>
		<h1 class="mt-1 text-2xl font-semibold">{data.member.full_name || data.member.email}</h1>
		<p class="text-sm text-slate-400">{data.member.email} · {data.member.role}</p>
	</div>

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

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="text-lg font-semibold">Completed courses</h2>
		<div class="mt-3 space-y-2">
			{#each data.completedCourses as course}
				<div class="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
					<p class="font-medium">{course.nodes?.title}</p>
					<p class="text-xs text-slate-500">{course.nodes?.slug}</p>
					<div class="mt-2 flex flex-wrap gap-1">
						{#each course.categories as category}
							<span class={`rounded border px-2 py-0.5 text-[11px] ${categoryTone(category.slug)}`}>
								{category.name}
							</span>
						{/each}
					</div>
				</div>
			{:else}
				<p class="text-sm text-slate-400">No completed courses yet.</p>
			{/each}
		</div>
	</div>

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="text-lg font-semibold">Attendance history</h2>
		<div class="mt-3 overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead class="text-left text-xs uppercase text-slate-400">
					<tr>
						<th class="px-2 py-1">Day</th>
						<th class="px-2 py-1">Check in</th>
						<th class="px-2 py-1">Check out</th>
					</tr>
				</thead>
				<tbody>
					{#each data.attendanceSessions as session}
						<tr class="border-t border-slate-800">
							<td class="px-2 py-1">{session.attendance_day}</td>
							<td class="px-2 py-1">{session.check_in_at ? new Date(session.check_in_at).toLocaleString() : '—'}</td>
							<td class="px-2 py-1">{session.check_out_at ? new Date(session.check_out_at).toLocaleString() : '—'}</td>
						</tr>
					{:else}
						<tr><td class="px-2 py-3 text-slate-400" colspan="3">No attendance records yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
