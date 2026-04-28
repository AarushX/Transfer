<script lang="ts">
	type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
	let { label, tone = 'neutral' }: { label: string; tone?: Tone } = $props();

	const toneClass = $derived.by(() => {
		switch (tone) {
			case 'success':
				return 'border-emerald-700/60 bg-emerald-900/30 text-emerald-200';
			case 'warning':
				return 'border-amber-700/60 bg-amber-900/30 text-amber-200';
			case 'danger':
				return 'border-red-700/60 bg-red-900/30 text-red-200';
			case 'info':
				return 'border-sky-700/60 bg-sky-900/30 text-sky-200';
			default:
				return 'border-slate-700 bg-slate-800 text-slate-300';
		}
	});
</script>

<span class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>
	{label}
</span>
