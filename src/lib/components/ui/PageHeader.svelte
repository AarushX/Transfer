<script lang="ts">
	let {
		title,
		description = ''
	}: {
		title: string;
		description?: string;
	} = $props();
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold text-slate-100">{title}</h1>
		{#if description}
			<p class="mt-1 text-sm text-slate-400">{description}</p>
		{/if}
	</div>
	<slot />
</header>
