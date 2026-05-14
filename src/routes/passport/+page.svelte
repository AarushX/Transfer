<script lang="ts">
	import PassportQR from '$lib/components/PassportQR.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data } = $props();
	const specialTitles = $derived((data.specialTitles ?? []) as string[]);
	const trackRanks = $derived((data.trackRanks ?? []) as any[]);
</script>

<section class="grid gap-4 md:grid-cols-2">
	<GlassCard>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Digital Passport</h1>
		<p style="color: var(--app-text-muted);">{data.profile?.full_name || data.profile?.email}</p>
		<p class="mt-2 rounded px-2 py-1 text-sm" style="background: var(--app-surface-alt); color: var(--app-text);">{data.progressSummary}</p>
		<p class="mt-2 text-sm text-yellow-300">Overall rank: {data.overallRank}</p>
		{#if specialTitles.length > 0}
			<p class="mt-1 text-xs text-emerald-200">Special: {specialTitles.join(' · ')}</p>
		{/if}
		<div class="mt-3 rounded p-2" style="background: var(--app-glass-bg); backdrop-filter: blur(12px);">
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Track rank tiers</p>
			<ul class="mt-1 space-y-1 text-sm" style="color: var(--app-text-muted);">
				{#each trackRanks as rank}
					<li>{rank.trackName}: {rank.tier} ({rank.count} completed)</li>
				{:else}
					<li style="color: var(--app-text-muted);">Complete courses to earn track tiers.</li>
				{/each}
			</ul>
		</div>
		<h2 class="mt-4 font-semibold" style="color: var(--app-text);">Badges</h2>
		<ul class="mt-2 list-disc pl-5 text-sm" style="color: var(--app-text-muted);">
			{#each data.badges as badge}
				<li>{badge}</li>
			{/each}
		</ul>
	</GlassCard>
	<GlassCard>
		<h2 class="mb-3 text-lg font-semibold" style="color: var(--app-text);">QR Identity</h2>
		<PassportQR qrDataUrl={data.qrDataUrl} />
	</GlassCard>
</section>
