<script lang="ts">
	let { data } = $props();
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">Roster Dashboard</h1>
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="font-semibold">Bottlenecks</h2>
		<ul class="mt-2 list-disc pl-5 text-sm text-slate-300">
			{#each data.bottlenecks as b}
				<li>{b.node}: {b.count} waiting</li>
			{/each}
		</ul>
	</div>
	<div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
		<table class="min-w-full text-sm">
			<thead class="bg-slate-800 text-left">
				<tr>
					<th class="p-2">Name</th>
					<th class="p-2">Role</th>
					<th class="p-2">Progress</th>
					<th class="p-2">Pending Checkoffs</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rows as row}
					<tr class="border-t border-slate-800">
						<td class="p-2">{row.full_name || row.email}</td>
						<td class="p-2">{row.role}</td>
						<td class="p-2">{row.progressPercent}%</td>
						<td class="p-2">{row.pendingCheckoffs}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
