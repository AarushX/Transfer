<script lang="ts">
	type Step = { label: string; done?: boolean; current?: boolean };
	let { steps = [] }: { steps: Step[] } = $props();
</script>

<ol class="space-y-2">
	{#each steps as step, index (step.label + index)}
		<li class="flex items-center gap-2 text-sm">
			{#if step.done}
				<span class="h-2.5 w-2.5 rounded-full" style="background: var(--app-success);"></span>
			{:else if step.current}
				<span class="h-2.5 w-2.5 rounded-full ring-2" style="background: var(--app-info); --tw-ring-color: color-mix(in srgb, var(--app-info) 35%, transparent);"></span>
			{:else}
				<span class="h-2.5 w-2.5 rounded-full" style="background: var(--app-glass-border);"></span>
			{/if}
			<span style="color: {step.current ? 'var(--app-text)' : 'var(--app-text-muted)'};" class={step.current ? 'font-semibold' : ''}>{step.label}</span>
		</li>
	{/each}
</ol>
