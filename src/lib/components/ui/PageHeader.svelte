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
		<h1 class="text-2xl font-semibold tracking-tight" style="color: var(--app-text);">{title}</h1>
		{#if description}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{description}</p>
		{/if}
	</div>
	<slot />
</header>
