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

	const hoursPct = $derived(hoursTarget > 0 ? Math.min(100, (hoursSeason / hoursTarget) * 100) : 0);
</script>

<div class="flex flex-col gap-3">
	<!-- Student ID / QR -->
	<div
		class="rounded-2xl border p-4 text-center"
		style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
	>
		<p class="eyebrow-label mb-2">Student ID</p>
		<div class="flex justify-center">
			<div
				class="inline-block rounded-xl border p-2"
				style="border-color: var(--app-border);"
			>
				<PassportQR qrDataUrl={passportQrDataUrl} compact />
			</div>
		</div>
		<p class="mt-2 text-[11.5px]" style="color: var(--app-text-dim);">
			Show to a mentor for checkoffs,<br />machines &amp; attendance
		</p>
	</div>

	<!-- Lettering progress -->
	<div
		class="rounded-2xl border p-4"
		style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
	>
		<div class="mb-3 flex items-baseline justify-between">
			<p class="eyebrow-label">Lettering progress</p>
			<span class="mono text-[13px] font-bold" style="color: var(--app-success);">
				{Math.min(100, lettering.pct)}%
			</span>
		</div>
		{#if lettering.categories && lettering.categories.length > 0}
			<div class="flex flex-col gap-2.5">
				{#each lettering.categories as cat}
					<div>
						<div class="mb-1 flex items-center justify-between text-[12px]">
							<span style="color: var(--app-text-muted);">{cat.label}</span>
							<span
								class="font-bold"
								style="color: {cat.isMet ? 'var(--app-success)' : 'var(--app-text-dim)'};"
							>
								{cat.isMet ? '✓' : cat.pct + '%'}
							</span>
						</div>
						<div
							class="h-[4px] overflow-hidden rounded-full"
							style="background: var(--app-border);"
						>
							<div
								class="h-full rounded-full transition-all duration-500"
								style="width: {cat.pct}%; background: {cat.isMet
									? 'var(--app-accent)'
									: 'color-mix(in srgb, var(--app-accent) 45%, var(--app-border))'};"
							></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Hours fallback when no categories -->
			<div class="mb-1 flex items-baseline gap-1">
				<span class="mono text-2xl font-bold" style="color: var(--app-text);"
					>{hoursSeason.toFixed(1)}</span
				>
				<span class="text-xs" style="color: var(--app-text-muted);">of {hoursTarget} hrs</span>
			</div>
			<div class="h-[4px] overflow-hidden rounded-full" style="background: var(--app-border);">
				<div
					class="h-full rounded-full"
					style="width: {hoursPct}%; background: var(--app-accent);"
				></div>
			</div>
		{/if}
	</div>
</div>
