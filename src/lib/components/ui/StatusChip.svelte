<script lang="ts">
	type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
	let { label, tone = 'neutral' }: { label: string; tone?: Tone } = $props();

	const toneStyle = $derived.by(() => {
		switch (tone) {
			case 'success':
				return 'border-color: color-mix(in srgb, var(--app-success) 70%, transparent); background: color-mix(in srgb, var(--app-success) 20%, transparent); color: color-mix(in srgb, var(--app-success) 55%, white);';
			case 'warning':
				return 'border-color: color-mix(in srgb, var(--app-warning) 70%, transparent); background: color-mix(in srgb, var(--app-warning) 20%, transparent); color: color-mix(in srgb, var(--app-warning) 55%, white);';
			case 'danger':
				return 'border-color: color-mix(in srgb, var(--app-danger) 70%, transparent); background: color-mix(in srgb, var(--app-danger) 20%, transparent); color: color-mix(in srgb, var(--app-danger) 55%, white);';
			case 'info':
				return 'border-color: color-mix(in srgb, var(--app-info) 70%, transparent); background: color-mix(in srgb, var(--app-info) 20%, transparent); color: color-mix(in srgb, var(--app-info) 55%, white);';
			default:
				return 'border-color: var(--app-border); background: var(--app-surface-alt); color: var(--app-text-muted);';
		}
	});
</script>

<span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium" style={toneStyle}>
	{label}
</span>
