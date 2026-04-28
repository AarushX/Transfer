<script lang="ts">
	import type { CourseloadSummary, TeamChip } from '$lib/courseload-types';

	let { data } = $props();
	const courseloads = $derived((data.courseloads ?? []) as CourseloadSummary[]);
	const teams = $derived((data.teams ?? []) as TeamChip[]);
</script>

<section class="mx-auto max-w-5xl space-y-8 px-4 py-8">
	<div class="space-y-2">
		<a href="/dashboard" class="text-xs font-medium text-slate-500 hover:text-slate-300">← Dashboard</a>
		<h1 class="text-3xl font-semibold tracking-tight text-white">Courseloads</h1>
		<p class="max-w-2xl text-sm text-slate-400">
			Tracks bundle courses for your program and role. Open a track to see every course and jump into modules.
		</p>
	</div>

	{#if teams.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each teams as t (t.groupSlug + t.teamSlug)}
				<span
					class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100"
				>
					<span class="text-slate-500">{t.groupName}</span>
					<span class="font-medium">{t.teamName}</span>
				</span>
			{/each}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		{#each courseloads as cl (cl.id)}
			<a
				href={`/courseloads/${cl.slug}`}
				class="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-lg transition hover:border-sky-500/40 hover:shadow-sky-900/20"
			>
				<div
					class="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.08),transparent_55%)]"
				></div>
				<div class="relative flex flex-col gap-3">
					<div class="flex items-start justify-between gap-2">
						<h2 class="text-lg font-semibold text-white">{cl.title}</h2>
						<span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
							{cl.progressPct}%
						</span>
					</div>
					<p class="line-clamp-2 text-sm text-slate-400">{cl.description}</p>
					<div class="h-1.5 overflow-hidden rounded-full bg-slate-800">
						<div
							class="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
							style={`width: ${cl.progressPct}%`}
						></div>
					</div>
					<p class="text-xs text-slate-500">
						{cl.completedCount} / {cl.totalCount} courses · {cl.courses.length} items
					</p>
				</div>
			</a>
		{:else}
			<div class="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400 sm:col-span-2">
				No courseloads assigned yet. Complete the <a class="text-sky-400 underline" href="/surveys/team-path-selection">Team placement</a> survey.
			</div>
		{/each}
	</div>
</section>
