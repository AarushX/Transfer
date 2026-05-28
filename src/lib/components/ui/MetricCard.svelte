<script lang="ts">
	type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
	let {
		label,
		value,
		note = '',
		tone = 'neutral'
	}: {
		label: string;
		value: string | number;
		note?: string;
		tone?: Tone;
	} = $props();

	const iconBg = $derived.by(() => {
		switch (tone) {
			case 'success':
				return 'background: color-mix(in srgb, var(--app-success) 15%, transparent); color: #6ee7b7;';
			case 'warning':
				return 'background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: #fcd34d;';
			case 'danger':
				return 'background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: #fda4af;';
			case 'info':
				return 'background: color-mix(in srgb, var(--app-info) 15%, transparent); color: #67e8f9;';
			default:
				return 'background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: #c4b5fd;';
		}
	});
	// Treat a literal 0 (or "0") as an empty state so a row of three "0" cards
	// doesn't dominate the page when there's genuinely nothing to act on.
	const isEmpty = $derived(value === 0 || value === '0');
</script>

<article
	class="rounded-2xl border p-4 backdrop-blur-xl transition duration-200"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	onmouseenter={(e) => {
		e.currentTarget.style.borderColor = 'var(--app-glass-border-hover)';
		e.currentTarget.style.background = 'var(--app-glass-bg-hover)';
	}}
	onmouseleave={(e) => {
		e.currentTarget.style.borderColor = 'var(--app-glass-border)';
		e.currentTarget.style.background = 'var(--app-glass-bg)';
	}}
>
	<div class="mb-2.5 grid h-8 w-8 place-items-center rounded-[10px]" style={iconBg}>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-4 w-4"
		>
			{#if tone === 'success'}
				<polyline points="2 12 7 17 16 7" /><polyline points="11 17 14 20 22 8" />
			{:else if tone === 'warning'}
				<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
			{:else if tone === 'danger'}
				<path d="M12 22a7 7 0 0 0 5-12c-1 3-3 3-4 1-1-3 0-7 0-9-3 2-9 6-9 13a7 7 0 0 0 8 7z" />
			{:else if tone === 'info'}
				<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
			{:else}
				<circle cx="12" cy="12" r="9" />
			{/if}
		</svg>
	</div>
	<p
		class="mono font-bold {isEmpty ? 'text-xl' : 'text-3xl'}"
		style="letter-spacing: -0.04em; color: {isEmpty ? 'var(--app-text-dim)' : 'var(--app-text)'};"
	>
		{value}
	</p>
	<p class="text-xs" style="color: var(--app-text-muted);">{label}</p>
	{#if note}
		<p class="mt-1 text-[11px]" style="color: var(--app-text-dim, var(--app-text-muted));">
			{note}
		</p>
	{/if}
</article>
