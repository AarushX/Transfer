<script lang="ts">
	let { items }: { items: Array<{ id: string; body: string; scope: 'team' | 'subteam'; scope_name: string; updated_at: string }> } = $props();
</script>

<div class="rounded-2xl border p-4" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
	<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Announcements</p>
	{#if items.length === 0}
		<p class="mt-2 text-sm italic" style="color: var(--app-text-dim, var(--app-text-muted));">Nothing new.</p>
	{:else}
		{#each items as it (it.id)}
			<div class="border-t mt-2 pt-2 first:border-t-0 first:mt-0 first:pt-0" style="border-color: var(--app-glass-border);">
				<div class="flex gap-2 items-start">
					<span class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style="background: var(--app-table-header-bg); color: var(--app-text-muted);">{it.scope === 'team' ? 'Team' : it.scope_name}</span>
					<div class="flex-1 min-w-0">
						<p class="text-sm" style="color: var(--app-text);">{it.body.split('\n')[0]}</p>
						<p class="text-[10px]" style="color: var(--app-text-dim, var(--app-text-muted));">{new Date(it.updated_at).toLocaleDateString()}</p>
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
