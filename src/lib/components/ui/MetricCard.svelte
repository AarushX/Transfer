<script lang="ts">
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
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
</script>

<article class="rounded-lg border border-slate-800 bg-slate-900 p-3">
	<div class="flex items-start justify-between gap-2">
		<p class="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</p>
		<StatusChip label={tone} {tone} />
	</div>
	<p class="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
	{#if note}
		<p class="mt-1 text-xs text-slate-400">{note}</p>
	{/if}
</article>
