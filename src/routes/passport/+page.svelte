<script lang="ts">
	import PassportQR from '$lib/components/PassportQR.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data } = $props();
	const specialTitles = $derived((data.specialTitles ?? []) as string[]);
	const trackRanks = $derived((data.trackRanks ?? []) as any[]);
</script>

<section class="grid gap-6 md:grid-cols-2">
	<!-- Main passport card wrapped in aurora-border -->
	<div class="aurora-border fade-up">
		<div class="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<div class="relative space-y-4">
				<div>
					<p class="eyebrow-label">Identity</p>
					<h1 class="gradient-text mt-1 text-2xl font-semibold">Digital Passport</h1>
					<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.profile?.full_name || data.profile?.email}</p>
				</div>

				<p class="rounded-xl border px-3 py-2 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);">{data.progressSummary}</p>

				<div class="flex flex-wrap items-center gap-2">
					<span class="chip-amber inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
						Overall rank: {data.overallRank}
					</span>
					{#if specialTitles.length > 0}
						{#each specialTitles as title, i}
							<span class="chip-emerald inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium fade-up" style="animation-delay: {0.05 * (i + 1)}s">
								{title}
							</span>
						{/each}
					{/if}
				</div>

				<!-- Track ranks as glass sub-cards -->
				<div>
					<p class="eyebrow-label">Track rank tiers</p>
					<div class="mt-2 space-y-2">
						{#each trackRanks as rank, i}
							<div class="relative overflow-hidden rounded-xl border p-3 backdrop-blur-xl fade-up"
								style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: {0.05 * (i + 1)}s">
								<div class="pointer-events-none absolute inset-0 rounded-xl" style="background: var(--app-glass-shine);"></div>
								<div class="relative flex items-center justify-between">
									<span class="text-sm font-medium" style="color: var(--app-text);">{rank.trackName}</span>
									<div class="flex items-center gap-2">
										<span class="chip-violet inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">{rank.tier}</span>
										<span class="mono text-xs" style="color: var(--app-text-dim);">{rank.count} completed</span>
									</div>
								</div>
							</div>
						{:else}
							<p class="text-sm" style="color: var(--app-text-dim);">Complete courses to earn track tiers.</p>
						{/each}
					</div>
				</div>

				<!-- Badges -->
				<div>
					<p class="eyebrow-label">Badges</p>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each data.badges as badge, i}
							<span class="chip-cyan inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium fade-up" style="animation-delay: {0.05 * (i + 1)}s">
								{badge}
							</span>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- QR code section with glass styling -->
	<div class="fade-up" style="animation-delay: 0.1s">
		<GlassCard>
			<p class="eyebrow-label">Verification</p>
			<h2 class="mt-1 text-lg font-semibold" style="color: var(--app-text);">QR Identity</h2>
			<div class="mt-4">
				<PassportQR qrDataUrl={data.qrDataUrl} />
			</div>
		</GlassCard>
	</div>
</section>
