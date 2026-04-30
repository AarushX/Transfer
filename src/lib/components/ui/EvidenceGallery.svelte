<script lang="ts">
	let {
		images = [],
		maxPreview = 3,
		onOpen
	}: {
		images?: string[];
		maxPreview?: number;
		onOpen?: (url: string) => void;
	} = $props();
</script>

{#if images.length > 0}
	<div class="grid grid-cols-3 gap-2">
		{#each images.slice(0, maxPreview) as image}
			<button
				type="button"
				class="rounded focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
				onclick={(event) => {
					event.stopPropagation();
					onOpen?.(image);
				}}
			>
				<img src={image} alt="Evidence" class="h-16 w-full rounded object-cover" />
			</button>
		{/each}
	</div>
{/if}
