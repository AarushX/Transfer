<script lang="ts">
	type Level = 'beginner' | 'intermediate' | 'advanced' | null | undefined;
	let {
		level,
		code,
		size = 'sm'
	}: { level: Level; code?: string | null; size?: 'sm' | 'xs' } = $props();

	const letter = $derived(
		level === 'beginner' ? 'B' : level === 'intermediate' ? 'I' : level === 'advanced' ? 'A' : null
	);
	const label = $derived(
		level === 'beginner'
			? 'Beginner'
			: level === 'intermediate'
				? 'Intermediate'
				: level === 'advanced'
					? 'Advanced'
					: ''
	);
	// Map each level to a theme variable. Falls back to text muted when unset.
	const toneStyle = $derived(
		level === 'beginner'
			? 'border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 18%, transparent); color: color-mix(in srgb, var(--app-success) 55%, white);'
			: level === 'intermediate'
				? 'border-color: color-mix(in srgb, var(--app-info) 60%, transparent); background: color-mix(in srgb, var(--app-info) 18%, transparent); color: color-mix(in srgb, var(--app-info) 55%, white);'
				: level === 'advanced'
					? 'border-color: color-mix(in srgb, var(--app-accent) 60%, transparent); background: color-mix(in srgb, var(--app-accent) 22%, transparent); color: var(--app-text);'
					: 'border-color: var(--app-glass-border); background: transparent; color: var(--app-text-dim);'
	);
</script>

{#if letter}
	<span
		class="pf-badge inline-flex items-center gap-1 rounded-full border font-semibold"
		class:pf-sm={size === 'sm'}
		class:pf-xs={size === 'xs'}
		style={toneStyle}
		title={label}
	>
		<span class="pf-letter">{letter}</span>
		{#if code}
			<span class="mono pf-code">{code}</span>
		{/if}
	</span>
{/if}

<style>
	.pf-sm {
		padding: 1px 8px;
		font-size: 11px;
	}
	.pf-xs {
		padding: 0 6px;
		font-size: 10px;
	}
	.pf-letter {
		letter-spacing: 0.04em;
	}
	.pf-code {
		opacity: 0.8;
	}
</style>
