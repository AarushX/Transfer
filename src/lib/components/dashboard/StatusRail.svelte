<script lang="ts">
	import PassportQR from '../PassportQR.svelte';
	let {
		passportQrDataUrl,
		hoursSeason,
		hoursTarget,
		lettering
	}: {
		passportQrDataUrl: string;
		hoursSeason: number;
		hoursTarget: number;
		lettering: { pct: number; overflow: boolean };
	} = $props();
	const hoursPct = $derived(hoursTarget > 0 ? Math.min(100, (hoursSeason / hoursTarget) * 100) : 0);
	const letBase = $derived(Math.min(100, lettering.pct));
	const letOver = $derived(Math.max(0, lettering.pct - 100));
</script>

<div class="space-y-3">
	<div class="rounded-2xl border p-4 backdrop-blur-xl text-center" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Passport QR</p>
		<div class="mx-auto mt-2" style="max-width: 70%;">
			<PassportQR qrDataUrl={passportQrDataUrl} />
		</div>
	</div>

	<div class="rounded-2xl border p-4" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Hours · season</p>
		<p class="mt-1 text-2xl font-bold mono" style="color: var(--app-text);">{hoursSeason.toFixed(1)}</p>
		<p class="text-xs" style="color: var(--app-text-muted);">of {hoursTarget} target</p>
		<div class="mt-2 h-1.5 rounded-full overflow-hidden" style="background: var(--app-glass-border);">
			<div class="h-full rounded-full" style="width: {hoursPct}%; background: linear-gradient(90deg, var(--app-accent), var(--app-info));"></div>
		</div>
	</div>

	<div class="rounded-2xl border p-4" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Lettering progress</p>
		<p class="mt-1 text-2xl font-bold mono" style="color: var(--app-text);">{lettering.pct}%</p>
		<div class="mt-2 h-2 rounded-full overflow-hidden relative" style="background: var(--app-glass-border);">
			<div class="h-full" style="width: {letBase}%; background: linear-gradient(90deg, var(--app-success), var(--app-info));"></div>
			{#if letOver > 0}
				<div class="absolute top-0 right-0 h-full" style="width: {Math.min(letOver, 50)}%; background: linear-gradient(90deg, transparent, var(--app-accent)); box-shadow: 0 0 12px -2px var(--app-accent);"></div>
			{/if}
		</div>
		{#if lettering.overflow}
			<p class="text-[10px] mt-1" style="color: var(--app-accent);">Above lettering threshold</p>
		{/if}
	</div>
</div>
