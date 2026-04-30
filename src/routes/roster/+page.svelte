<script lang="ts">
	let { data, form } = $props();
	let expandedUserId = $state<string | null>(null);
	const attendanceByUser = $derived.by(() => {
		const map = new Map<
			string,
			Array<{
				attendance_day: string;
				check_in_at: string | null;
				check_out_at: string | null;
			}>
		>();
		for (const session of data.attendanceSessions as Array<{
			attendee_user_id: string;
			attendance_day: string;
			check_in_at: string | null;
			check_out_at: string | null;
		}>) {
			const key = String(session.attendee_user_id);
			const list = map.get(key) ?? [];
			list.push({
				attendance_day: String(session.attendance_day),
				check_in_at: session.check_in_at ?? null,
				check_out_at: session.check_out_at ?? null
			});
			map.set(key, list);
		}
		return map;
	});
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">Roster Dashboard</h1>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	{#if data.canManageUsers}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">User Access</h2>
			<p class="text-xs text-slate-400">Admin-only role, mentor, and lead controls.</p>
		</div>
	{/if}

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
					{#if data.canManageUsers}
						<th class="p-2">Access</th>
					{/if}
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
									{expandedUserId === row.id ? 'Hide details' : 'Details'}
								</button>
								<span>{row.full_name || row.email}</span>
							</div>
						</td>
						<td class="p-2">{row.role}</td>
						<td class="p-2">{row.progressPercent}%</td>
						<td class="p-2">{row.pendingCheckoffs}</td>
						{#if data.canManageUsers}
							<td class="p-2">
								<form method="POST" action="?/setRole" class="flex items-center gap-2">
									<input type="hidden" name="user_id" value={row.id} />
									<select class="rounded bg-slate-800 px-2 py-1" name="base_role" value={row.base_role ?? 'member'}>
										<option value="member">member</option>
										<option value="admin">admin</option>
									</select>
									<label class="inline-flex items-center gap-1 text-xs text-slate-300">
										<input type="checkbox" name="is_mentor" checked={!!row.is_mentor || row.role === 'mentor'} />
										Mentor
									</label>
									<label class="inline-flex items-center gap-1 text-xs text-slate-300">
										<input type="checkbox" name="is_lead" checked={!!row.is_lead || row.role === 'student_lead'} />
										Lead
									</label>
									<button class="rounded border border-slate-800 px-2 py-1 text-xs">Save</button>
								</form>
							</td>
						{/if}
					</tr>
					{#if expandedUserId === row.id}
						<tr class="border-t border-slate-800 bg-slate-900/40">
							<td colspan={data.canManageUsers ? 5 : 4} class="p-3">
								<div class="rounded border border-slate-800 bg-slate-900 p-3">
									<h3 class="mb-2 font-semibold">Attendance history</h3>
									<div class="overflow-x-auto rounded border border-slate-800">
										<table class="min-w-full text-xs text-slate-300">
											<thead class="bg-slate-800 text-left text-[11px] uppercase text-slate-400">
												<tr>
													<th class="px-2 py-1">Day</th>
													<th class="px-2 py-1">Check in</th>
													<th class="px-2 py-1">Check out</th>
												</tr>
											</thead>
											<tbody>
												{#each attendanceByUser.get(row.id) ?? [] as session}
													<tr class="border-t border-slate-800">
														<td class="px-2 py-1">{session.attendance_day}</td>
														<td class="px-2 py-1">
															{session.check_in_at ? new Date(session.check_in_at).toLocaleString() : '—'}
														</td>
														<td class="px-2 py-1">
															{session.check_out_at ? new Date(session.check_out_at).toLocaleString() : '—'}
														</td>
													</tr>
												{:else}
													<tr>
														<td class="px-2 py-2 text-slate-400" colspan="3">No attendance records yet.</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
									<a
										href={`/roster/${row.id}#course-results`}
										class="mt-3 inline-block text-xs text-sky-300 underline"
									>
										Open full profile for courses, quiz results, and profile info →
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
