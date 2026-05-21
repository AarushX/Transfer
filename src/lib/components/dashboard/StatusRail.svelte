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
		lettering: {
			pct: number;
			overflow: boolean;
			completedCount: number;
			totalRequired: number;
			categories?: Array<{
				category: string;
				label: string;
				actual: number;
				required: number;
				pct: number;
				isMet: boolean;
			}>;
		};
	} = $props();

	let isExpanded = $state(false);

	const hoursPct = $derived(hoursTarget > 0 ? Math.min(100, (hoursSeason / hoursTarget) * 100) : 0);
	const letBase = $derived(Math.min(100, lettering.pct));
	const letOver = $derived(Math.max(0, lettering.pct - 100));

	const categoryEmojis: Record<string, string> = {
		outreach_hours: '🤝',
		competition_hours: '🏆',
		parent_volunteer_hours: '👨‍👩‍👦',
		shop_hours: '🛠️'
	};
</script>

<div class="space-y-3">
	<div class="rounded-2xl border p-4 backdrop-blur-xl text-center" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Passport QR</p>
		<div class="mt-2">
			<PassportQR qrDataUrl={passportQrDataUrl} compact />
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

	<div class="rounded-2xl border p-4 transition-all duration-300" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		<button 
			type="button"
			class="flex w-full items-center justify-between text-left focus:outline-none"
			onclick={() => isExpanded = !isExpanded}
		>
			<div class="min-w-0 flex-1">
				<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Lettering progress</p>
				<p class="mt-1 text-2xl font-bold mono leading-none" style="color: var(--app-text);">
					{lettering.pct}%
					<span class="text-xs font-normal font-sans" style="color: var(--app-text-dim);">
						({lettering.completedCount}/{lettering.totalRequired} reqs)
					</span>
				</p>
			</div>
			<span class="rounded-lg p-1 transition-transform duration-200 hover:bg-white/5 shrink-0" style="transform: rotate({isExpanded ? '180deg' : '0deg'}); color: var(--app-text-muted);">
				<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
			</span>
		</button>

		<div class="mt-3 h-2 rounded-full overflow-hidden relative" style="background: var(--app-glass-border);">
			<div class="h-full transition-all duration-500" style="width: {letBase}%; background: linear-gradient(90deg, var(--app-success), var(--app-info));"></div>
			{#if letOver > 0}
				<div class="absolute top-0 right-0 h-full" style="width: {Math.min(letOver, 50)}%; background: linear-gradient(90deg, transparent, var(--app-accent)); box-shadow: 0 0 12px -2px var(--app-accent);"></div>
			{/if}
		</div>

		{#if lettering.overflow}
			<p class="text-[10px] mt-1.5" style="color: var(--app-accent);">Above lettering threshold</p>
		{/if}

		{#if isExpanded && lettering.categories && lettering.categories.length > 0}
			<div class="mt-4 pt-3 border-t space-y-3" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
				{#each lettering.categories as cat}
					<div class="space-y-1">
						<div class="flex items-center justify-between text-[11px]">
							<span class="flex items-center gap-1.5 font-medium" style="color: var(--app-text);">
								<span>{categoryEmojis[cat.category] ?? '📋'}</span>
								{cat.label}
							</span>
							<span class="font-mono font-bold" style="color: {cat.isMet ? 'var(--app-success)' : 'var(--app-text-muted)'};">
								{cat.actual} / {cat.required}
							</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="flex-1 rounded-full overflow-hidden" style="height: 4px; background: color-mix(in srgb, var(--app-text) 8%, transparent);">
								<div class="h-full rounded-full transition-all duration-500" style="width: {cat.pct}%; background: {cat.isMet ? 'var(--app-success)' : 'var(--app-info)'};"></div>
							</div>
							{#if cat.isMet}
								<span class="text-[10px] font-bold" style="color: var(--app-success);">✓</span>
							{:else}
								<span class="text-[9px] font-medium" style="color: var(--app-text-dim);">{cat.pct}%</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

