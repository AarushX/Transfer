<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let { data } = $props();
</script>

<section class="mx-auto max-w-5xl space-y-6">
	<header class="fade-up">
		<p class="eyebrow-label">Student rankings</p>
		<h1 class="gradient-text mt-1 text-3xl font-semibold tracking-tight">Ranked leaderboard</h1>
		<p class="mt-2 text-sm" style="color: var(--app-text-muted);">Public leaderboard for student RR progression.</p>
	</header>

	<!-- Stat tiles row -->
	<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
		<div class="aurora-border fade-up" style="animation-delay: 0.05s">
			<div class="relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
				<div class="relative">
					<p class="eyebrow-label">Your rank</p>
					<p class="gradient-text mt-1 text-2xl font-bold">{data.myEntry.valorant.label}</p>
					<p class="mono mt-0.5 text-xs" style="color: var(--app-text-dim);">#{data.myEntry.placement} of {data.totalMembers}</p>
				</div>
			</div>
		</div>

		<div class="fade-up" style="animation-delay: 0.1s">
			<GlassCard compact>
				<p class="eyebrow-label">Total RR</p>
				<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{data.myEntry.totalPoints}</p>
				<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">rating points</p>
			</GlassCard>
		</div>

		<div class="fade-up" style="animation-delay: 0.15s">
			<GlassCard compact>
				<p class="eyebrow-label">Segments</p>
				<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{data.myEntry.segmentCompletions}</p>
				<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">completed</p>
			</GlassCard>
		</div>

		<div class="fade-up" style="animation-delay: 0.2s">
			<GlassCard compact>
				<p class="eyebrow-label">Attendance</p>
				<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{data.myEntry.attendanceHours}</p>
				<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">hours logged</p>
			</GlassCard>
		</div>
	</div>

	<!-- Next rank info -->
	{#if data.myEntry.valorant.nextLabel}
		<div class="fade-up" style="animation-delay: 0.25s">
			<div class="relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
				<p class="relative text-center text-sm" style="color: var(--app-text-muted);">
					<span class="mono font-semibold" style="color: var(--app-text);">{data.myEntry.valorant.pointsToNext} RR</span> to reach
					<span class="chip-violet inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">{data.myEntry.valorant.nextLabel}</span>
				</p>
			</div>
		</div>
	{/if}

	<!-- Scoring model -->
	<div class="fade-up" style="animation-delay: 0.3s">
		<GlassCard compact>
			<p class="eyebrow-label">Scoring model</p>
			<div class="mt-2 flex flex-wrap gap-3">
				<span class="chip-emerald inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">+3 RR per segment</span>
				<span class="chip-cyan inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">+2 RR per attendance hour</span>
			</div>
		</GlassCard>
	</div>

	<!-- Leaderboard table -->
	<div class="fade-up" style="animation-delay: 0.35s">
		<div class="overflow-hidden rounded-2xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<div class="relative border-b px-5 py-3" style="border-color: var(--app-glass-border);">
				<p class="eyebrow-label">Public leaderboard</p>
			</div>
			<ul class="leaderboard-list relative divide-y">
				{#each data.leaderboard as row, i}
					<li class="leaderboard-row flex items-center justify-between gap-3 px-5 py-3 transition-colors duration-200">
						<div class="flex items-center gap-3">
							<div class="flex w-8 items-center justify-center">
								{#if row.placement <= 3}
									<span class={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${row.placement === 1 ? 'chip-amber' : row.placement === 2 ? 'chip-cyan' : 'chip-pink'} border`}>
										{row.placement}
									</span>
								{:else}
									<span class="mono text-sm font-semibold" style="color: var(--app-text-dim);">#{row.placement}</span>
								{/if}
							</div>
							<Avatar name={row.fullName} url={row.avatarUrl} size="sm" />
							<div>
								<p class="text-sm font-medium" style="color: var(--app-text);">{row.fullName}</p>
								<span class="chip-violet inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium">{row.valorant.label}</span>
							</div>
						</div>
						<div class="text-right">
							<p class="mono text-sm font-semibold" style="color: var(--app-text);">{row.totalPoints} RR</p>
							<p class="text-xs" style="color: var(--app-text-dim);">
								{row.segmentCompletions} seg · {row.attendanceHours} hrs
							</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<style>
	.leaderboard-list > :global(* + *) {
		border-color: var(--app-glass-border);
	}
	.leaderboard-row:hover {
		background: var(--app-glass-bg-hover);
	}
</style>
