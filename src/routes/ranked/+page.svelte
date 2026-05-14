<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let { data } = $props();
</script>

<section class="mx-auto max-w-5xl space-y-6">
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Student rankings</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight" style="color: var(--app-text);">Ranked leaderboard</h1>
		<p class="mt-2 text-sm" style="color: var(--app-text-muted);">Public leaderboard for student RR progression.</p>
	</header>

	<div class="grid gap-4 md:grid-cols-3">
		<div class="rounded-xl border p-4 backdrop-blur-xl md:col-span-2" style="background: var(--app-glass-bg); border-color: color-mix(in srgb, var(--app-accent) 40%, transparent); box-shadow: var(--app-glass-shadow);">
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Your rank</p>
			<div class="mt-2 flex items-center justify-between gap-4">
				<div>
					<p class="text-2xl font-bold" style="color: var(--app-accent);">{data.myEntry.valorant.label}</p>
					<p class="text-sm" style="color: var(--app-text-muted);">{data.myEntry.totalPoints} RR</p>
					<p class="text-xs" style="color: var(--app-text-muted);">
						#{data.myEntry.placement} of {data.totalMembers}
					</p>
				</div>
				<div class="text-right text-xs" style="color: var(--app-text-muted);">
					<p>Segments: {data.myEntry.segmentCompletions}</p>
					<p>Attendance hours: {data.myEntry.attendanceHours}</p>
					{#if data.myEntry.valorant.nextLabel}
						<p class="mt-1" style="color: var(--app-text);">
							{data.myEntry.valorant.pointsToNext} RR to {data.myEntry.valorant.nextLabel}
						</p>
					{/if}
				</div>
			</div>
		</div>
		<GlassCard>
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Scoring model</p>
			<ul class="mt-2 space-y-1 text-sm" style="color: var(--app-text-muted);">
				<li>+3 RR per completed course segment</li>
				<li>+2 RR per attendance hour</li>
			</ul>
		</GlassCard>
	</div>

	<div class="overflow-hidden rounded-xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		<div class="border-b px-4 py-3" style="border-color: var(--app-glass-border);">
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Public leaderboard</p>
		</div>
		<ul class="leaderboard-list divide-y">
			{#each data.leaderboard as row}
				<li class="flex items-center justify-between gap-3 px-4 py-3">
					<div class="flex items-center gap-3">
						<p class="w-8 text-sm font-semibold" style="color: var(--app-text-muted);">#{row.placement}</p>
						<Avatar name={row.fullName} url={row.avatarUrl} size="sm" />
						<div>
							<p class="text-sm font-medium" style="color: var(--app-text);">{row.fullName}</p>
							<p class="text-xs" style="color: var(--app-text-muted);">{row.valorant.label}</p>
						</div>
					</div>
					<div class="text-right">
						<p class="text-sm font-semibold" style="color: var(--app-text);">{row.totalPoints} RR</p>
						<p class="text-xs" style="color: var(--app-text-muted);">
							{row.segmentCompletions} segments · {row.attendanceHours} attendance hours
						</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	.leaderboard-list > :global(* + *) {
		border-color: var(--app-glass-border);
	}
</style>
