<script lang="ts">
  import SkillTree from './SkillTree.svelte';
  let {
    nodes = [],
    statuses = [],
    prerequisites = [],
    scope = undefined
  }: {
    nodes?: Array<{ id: string; title: string; slug: string }>;
    statuses?: Array<{ node_id: string; computed_status: string }>;
    prerequisites?: Array<{ node_id: string; prerequisite_node_id: string }>;
    scope?: Set<string> | string[] | undefined;
  } = $props();
</script>

<div class="rounded-xl border overflow-hidden"
  style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--app-accent) 6%, transparent), transparent 60%), var(--app-glass-bg); border-color: var(--app-glass-border); aspect-ratio: 4/3;">
  <SkillTree {nodes} {statuses} {prerequisites} {scope} />
</div>
