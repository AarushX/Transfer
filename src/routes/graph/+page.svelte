<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	let { data } = $props();
</script>

<section class="space-y-6">
	<PageHeader title="Skill Graph" description="Visualize your training progress and module dependencies." />
	<SkillTree nodes={data.nodes} statuses={data.statuses} prerequisites={data.prerequisites} />
</section>
