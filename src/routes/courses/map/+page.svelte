<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';
	let { data } = $props();
	const scopeSet = $derived(data.scopeNodeIds ? new Set(data.scopeNodeIds) : undefined);
</script>

<section class="space-y-4">
	<header class="flex items-end justify-between">
		<div>
			<p class="eyebrow-label">Courses</p>
			<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Skill map</span></h1>
		</div>
	</header>

	<div
		class="rounded-2xl border overflow-hidden"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); aspect-ratio: 16/9;"
	>
		<SkillTree
			nodes={data.nodes}
			prerequisites={data.prerequisites}
			statuses={data.statuses}
			scope={scopeSet}
		/>
	</div>
</section>
