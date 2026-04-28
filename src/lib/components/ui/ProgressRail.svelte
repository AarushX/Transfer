<script lang="ts">
	type Step = { label: string; done?: boolean; current?: boolean };
	let { steps = [] }: { steps: Step[] } = $props();
</script>

<ol class="space-y-2">
	{#each steps as step, index (step.label + index)}
		<li class="flex items-center gap-2 text-sm">
			<span
				class={`h-2.5 w-2.5 rounded-full ${
					step.done
						? 'bg-emerald-400'
						: step.current
							? 'bg-sky-400 ring-2 ring-sky-400/35'
							: 'bg-slate-600'
				}`}
			></span>
			<span class={step.current ? 'font-semibold text-slate-100' : 'text-slate-300'}>{step.label}</span>
		</li>
	{/each}
</ol>
