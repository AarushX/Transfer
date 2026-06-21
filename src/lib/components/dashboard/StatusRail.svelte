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
	let showModal = $state(false);
</script>

<div class="flex flex-col gap-3">
	<!-- Student ID / QR -->
	<div
		class="rounded-2xl border p-4 text-center"
		style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
	>
		<p class="eyebrow-label mb-2">Student ID</p>
		<div class="flex justify-center">
			<button
				type="button"
				class="w-28 overflow-hidden rounded-xl border transition-opacity hover:opacity-80"
				style="border-color: var(--app-border); background: white; padding: 0;"
				onclick={() => (showModal = true)}
				aria-label="Show full-size student ID"
			>
				<PassportQR qrDataUrl={passportQrDataUrl} compact />
			</button>
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

<!-- Fullscreen QR modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background: rgba(26,33,28,0.6); backdrop-filter: blur(6px);"
		onclick={(e) => { if (e.target === e.currentTarget) showModal = false; }}
	>
		<div
			class="relative flex flex-col items-center gap-6 rounded-3xl border p-8"
			style="background: var(--app-surface); border-color: var(--app-border); box-shadow: 0 24px 64px rgba(26,33,28,0.18); max-width: 360px; width: calc(100vw - 2rem);"
		>
			<button
				type="button"
				class="absolute top-4 right-4 grid h-7 w-7 place-items-center rounded-full"
				style="background: var(--app-surface-alt); border: none; color: var(--app-text-muted); cursor: pointer;"
				onclick={() => (showModal = false)}
				aria-label="Close"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4" style="transform: rotate(45deg);"><path d="M12 5v14M5 12h14" /></svg>
			</button>
			<div>
				<p class="eyebrow-label text-center mb-1">Student ID</p>
				<p class="text-center text-[13px]" style="color: var(--app-text-muted);">Show to a mentor to scan</p>
			</div>
			<div class="w-64 overflow-hidden rounded-2xl border" style="border-color: var(--app-border); background: white;">
				<PassportQR qrDataUrl={passportQrDataUrl} compact />
			</div>
			<p class="text-center text-[12px]" style="color: var(--app-text-dim);">
				Valid for checkoffs, machines &amp; attendance.<br />Tap outside to close.
			</p>
		</div>
	</div>
{/if}
