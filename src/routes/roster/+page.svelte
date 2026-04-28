<script lang="ts">
	let { data } = $props();
	let expandedUserId = $state<string | null>(null);

	const labelFor = (status: string) =>
		({
			available: 'Not started',
			video_pending: 'Watching',
			quiz_pending: 'Ready for quiz',
			mentor_checkoff_pending: 'Awaiting mentor checkoff',
			completed: 'Completed'
		})[status] ?? status;
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
						<td class="p-2">
							<div class="flex items-center gap-2">
								<button
									class="rounded border border-slate-800 px-2 py-0.5 text-xs"
									onclick={() => (expandedUserId = expandedUserId === row.id ? null : row.id)}
								>
									{expandedUserId === row.id ? 'Hide' : 'View'}
								</button>
								<span>{row.full_name || row.email}</span>
								<a href={`/roster/${row.id}`} class="text-xs text-sky-300 underline">Profile</a>
							</div>
						</td>
						<td class="p-2">{row.role}</td>
						<td class="p-2">{row.progressPercent}%</td>
						<td class="p-2">{row.pendingCheckoffs}</td>
					</tr>
					{#if expandedUserId === row.id}
						<tr class="border-t border-slate-800 bg-slate-900/40">
							<td colspan="4" class="p-3">
								<div class="rounded border border-slate-800 bg-slate-900 p-3">
									<h3 class="mb-2 font-semibold">Courses Passed / In Progress</h3>
									<ul class="space-y-2 text-xs text-slate-300">
										{#each row.courses as c}
											<li class="flex items-center justify-between rounded border border-slate-800 p-2">
												<div>
													<p class="font-medium">{c.title}</p>
													<p class="text-slate-400">{c.slug}</p>
												</div>
												<span class="rounded bg-slate-800 px-2 py-0.5">{labelFor(c.status)}</span>
											</li>
										{:else}
											<li>No passed or in-progress courses yet.</li>
										{/each}
									</ul>
									<a
										href={`/roster/${row.id}`}
										class="mt-3 inline-block text-xs text-sky-300 underline"
									>
										View full profile with quiz details →
									</a>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
</section>
