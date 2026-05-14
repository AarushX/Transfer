<script lang="ts">
	type Step = { label: string; done?: boolean; current?: boolean };
	let { steps = [] }: { steps: Step[] } = $props();
</script>

<ol class="flex flex-wrap items-center gap-1.5">
	{#each steps as step, index (step.label + index)}
		<li class="flex items-center gap-2 rounded-full border px-2 py-1"
			style={step.current
				? 'border-color: color-mix(in srgb, #06b6d4 50%, transparent); background: color-mix(in srgb, #06b6d4 10%, transparent);'
				: 'border-color: var(--app-glass-border); background: transparent;'}>
			<span class="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold"
				style={step.done
					? 'background: #34d399; color: white;'
					: step.current
					? 'background: var(--aurora); color: white; box-shadow: 0 0 16px -2px #06b6d4;'
					: 'background: color-mix(in srgb, white 6%, transparent); color: var(--app-text-dim, var(--app-text-muted));'}>
				{#if step.done}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><polyline points="4 12 10 18 20 6"/></svg>
				{:else if step.current}
					<span class="h-1.5 w-1.5 rounded-full bg-white"></span>
				{:else}
					{index + 1}
				{/if}
			</span>
			<span class="text-xs font-medium" style="color: {step.done || step.current ? 'var(--app-text)' : 'var(--app-text-dim, var(--app-text-muted))'};">{step.label}</span>
		</li>
		{#if index < steps.length - 1}
			<span class="h-px w-3" style="background: var(--app-glass-border);"></span>
		{/if}
	{/each}
</ol>
