<script lang="ts">
	import GlassTable from '$lib/components/ui/GlassTable.svelte';
	let { data } = $props();
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Audit Log</h1>
	<GlassTable>
		<thead>
			<tr>
				<th class="p-2">When</th>
				<th class="p-2">Action</th>
				<th class="p-2">Actor</th>
				<th class="p-2">Target User</th>
				<th class="p-2">Metadata</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row}
				<tr>
					<td class="p-2">{new Date(row.created_at).toLocaleString()}</td>
					<td class="p-2">{row.action}</td>
					<td class="p-2">{row.actor_id}</td>
					<td class="p-2">{row.target_user_id}</td>
					<td class="p-2 text-xs">{JSON.stringify(row.metadata)}</td>
				</tr>
			{/each}
		</tbody>
	</GlassTable>
</section>
