<script lang="ts">
	let { data } = $props();
</script>

<section class="space-y-6">
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Admin</p>
		<h1 class="mt-1 text-2xl font-semibold">Attendance</h1>
	</header>

	<div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
		<div class="border-b border-slate-800 px-4 py-3">
			<p class="text-sm font-semibold">Daily sessions</p>
		</div>
		<table class="min-w-full text-sm">
			<thead class="bg-slate-800 text-left">
				<tr>
					<th class="p-2">Attendance day</th>
					<th class="p-2">Attendee</th>
					<th class="p-2">Check in</th>
					<th class="p-2">Last check out</th>
					<th class="p-2">Last scanner</th>
				</tr>
			</thead>
			<tbody>
				{#each data.sessions as row}
					<tr class="border-t border-slate-800">
						<td class="p-2">{row.attendance_day}</td>
						<td class="p-2">{row.attendee?.full_name || row.attendee?.email || row.attendee_user_id}</td>
						<td class="p-2">{row.check_in_at ? new Date(row.check_in_at).toLocaleString() : '—'}</td>
						<td class="p-2">{row.check_out_at ? new Date(row.check_out_at).toLocaleString() : '—'}</td>
						<td class="p-2">{row.lastScanner?.full_name || row.lastScanner?.email || '—'}</td>
					</tr>
				{:else}
					<tr class="border-t border-slate-800">
						<td colspan="5" class="p-3 text-slate-400">No attendance sessions yet.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
		<div class="border-b border-slate-800 px-4 py-3">
			<p class="text-sm font-semibold">Display activations</p>
		</div>
		<table class="min-w-full text-sm">
			<thead class="bg-slate-800 text-left">
				<tr>
					<th class="p-2">Created</th>
					<th class="p-2">Attendee</th>
					<th class="p-2">Activated at</th>
					<th class="p-2">Activated by</th>
				</tr>
			</thead>
			<tbody>
				{#each data.displays as row}
					<tr class="border-t border-slate-800">
						<td class="p-2">{new Date(row.created_at).toLocaleString()}</td>
						<td class="p-2">{row.attendee?.full_name || row.attendee?.email || row.attendee_user_id}</td>
						<td class="p-2">{row.activated_at ? new Date(row.activated_at).toLocaleString() : 'Inactive'}</td>
						<td class="p-2">{row.activatedBy?.full_name || row.activatedBy?.email || '—'}</td>
					</tr>
				{:else}
					<tr class="border-t border-slate-800">
						<td colspan="4" class="p-3 text-slate-400">No attendance display links created yet.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
