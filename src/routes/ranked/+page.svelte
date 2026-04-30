<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';

	let { data } = $props();
</script>

<section class="mx-auto max-w-5xl space-y-6">
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Student rankings</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight">Ranked leaderboard</h1>
		<p class="mt-2 text-sm text-slate-400">Public leaderboard for student RR progression.</p>
	</header>

	<div class="grid gap-4 md:grid-cols-3">
		<div class="rounded-xl border border-violet-600/40 bg-slate-900 p-4 md:col-span-2">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Your rank</p>
			<div class="mt-2 flex items-center justify-between gap-4">
				<div>
					<p class="text-2xl font-bold text-violet-300">{data.myEntry.valorant.label}</p>
					<p class="text-sm text-slate-300">{data.myEntry.totalPoints} RR</p>
					<p class="text-xs text-slate-400">
						#{data.myEntry.placement} of {data.totalMembers}
					</p>
				</div>
				<div class="text-right text-xs text-slate-400">
					<p>Segments: {data.myEntry.segmentCompletions}</p>
					<p>Attendance hours: {data.myEntry.attendanceHours}</p>
					{#if data.myEntry.valorant.nextLabel}
						<p class="mt-1 text-slate-300">
							{data.myEntry.valorant.pointsToNext} RR to {data.myEntry.valorant.nextLabel}
						</p>
					{/if}
				</div>
			</div>
		</div>
		<div class="rounded-xl border border-slate-700 bg-slate-900 p-4">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Scoring model</p>
			<ul class="mt-2 space-y-1 text-sm text-slate-300">
				<li>+3 RR per completed course segment</li>
				<li>+2 RR per attendance hour</li>
			</ul>
		</div>
	</div>

	<div class="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm">
		<div class="border-b border-slate-700 px-4 py-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Public leaderboard</p>
		</div>
		<ul class="divide-y divide-slate-800">
			{#each data.leaderboard as row}
				<li class="flex items-center justify-between gap-3 px-4 py-3">
					<div class="flex items-center gap-3">
						<p class="w-8 text-sm font-semibold text-slate-400">#{row.placement}</p>
						<Avatar name={row.fullName} url={row.avatarUrl} size="sm" />
						<div>
							<p class="text-sm font-medium text-slate-100">{row.fullName}</p>
							<p class="text-xs text-slate-400">{row.valorant.label}</p>
						</div>
					</div>
					<div class="text-right">
						<p class="text-sm font-semibold text-slate-100">{row.totalPoints} RR</p>
						<p class="text-xs text-slate-400">
							{row.segmentCompletions} segments · {row.attendanceHours} attendance hours
						</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>
