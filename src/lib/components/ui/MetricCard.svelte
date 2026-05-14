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

<article
	class="rounded-xl border p-4 backdrop-blur-xl"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
>
	<div class="flex items-start justify-between gap-2">
		<p class="text-xs font-medium tracking-wide uppercase" style="color: var(--app-text-muted);">{label}</p>
		<StatusChip label={tone} {tone} />
	</div>
	<p class="mt-2 text-2xl font-semibold" style="color: var(--app-text);">{value}</p>
	{#if note}
		<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{note}</p>
	{/if}
</article>
