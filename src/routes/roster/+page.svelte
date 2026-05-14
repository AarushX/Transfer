<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
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

<section class="space-y-5">
	<div class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Team</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Roster Dashboard</span></h1>
	</div>

	{#if form?.error}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	{#if data.canManageUsers}
		<GlassCard>
			<h2 class="font-semibold" style="color: var(--app-text);">User Access</h2>
			<p class="text-xs" style="color: var(--app-text-muted);">Admin-only role, mentor, and lead controls.</p>
		</GlassCard>
	{/if}

	<GlassCard>
		<h2 class="font-semibold" style="color: var(--app-text);">Bottlenecks</h2>
		<ul class="mt-2 list-disc pl-5 text-sm" style="color: var(--app-text-muted);">
			{#each data.bottlenecks as b}
				<li>{b.node}: {b.count} waiting</li>
			{/each}
		</ul>
	</GlassCard>
	<div class="fade-up overflow-x-auto rounded-2xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;">
		<table class="min-w-full text-sm">
			<thead class="text-left" style="background: var(--app-table-header-bg);">
				<tr>
					<th class="p-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">Name</th>
					<th class="p-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">Role</th>
					<th class="p-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">Progress</th>
					<th class="p-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">Pending Checkoffs</th>
					{#if data.canManageUsers}
						<th class="p-3 text-xs font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">Access</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.rows as row}
					<tr class="border-t" style="border-color: var(--app-glass-border);">
						<td class="p-2">
							<div class="flex items-center gap-2">
								<button
									class="rounded border px-2 py-0.5 text-xs"
									style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
									onclick={() => (expandedUserId = expandedUserId === row.id ? null : row.id)}
								>
									{expandedUserId === row.id ? 'Hide details' : 'Details'}
								</button>
								<span style="color: var(--app-text);">{row.full_name || row.email}</span>
							</div>
						</td>
						<td class="p-2" style="color: var(--app-text-muted);">{row.role}</td>
						<td class="p-2"><span class="mono" style="color: var(--app-text-muted);">{row.progressPercent}%</span></td>
						<td class="p-2"><span class="mono" style="color: var(--app-text-muted);">{row.pendingCheckoffs}</span></td>
						{#if data.canManageUsers}
							<td class="p-2">
								<form method="POST" action="?/setRole" class="flex items-center gap-2">
									<input type="hidden" name="user_id" value={row.id} />
									<select class="rounded px-2 py-1" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" name="base_role" value={row.base_role ?? 'member'}>
										<option value="member">member</option>
										<option value="admin">admin</option>
									</select>
									<label class="inline-flex items-center gap-1 text-xs" style="color: var(--app-text-muted);">
										<input type="checkbox" name="is_mentor" checked={!!row.is_mentor || row.role === 'mentor'} />
										Mentor
									</label>
									<label class="inline-flex items-center gap-1 text-xs" style="color: var(--app-text-muted);">
										<input type="checkbox" name="is_lead" checked={!!row.is_lead || row.role === 'student_lead'} />
										Lead
									</label>
									<button class="rounded border px-2 py-1 text-xs" style="border-color: var(--app-glass-border); color: var(--app-text);">Save</button>
								</form>
							</td>
						{/if}
					</tr>
					{#if expandedUserId === row.id}
						<tr class="border-t" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
							<td colspan={data.canManageUsers ? 5 : 4} class="p-3">
								<div class="rounded border p-3" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
									<h3 class="mb-2 font-semibold" style="color: var(--app-text);">Attendance history</h3>
									<div class="overflow-x-auto rounded border" style="border-color: var(--app-glass-border);">
										<table class="min-w-full text-xs" style="color: var(--app-text-muted);">
											<thead class="text-left text-[11px] uppercase" style="background: var(--app-surface-alt); color: var(--app-text-muted);">
												<tr>
													<th class="px-2 py-1">Day</th>
													<th class="px-2 py-1">Check in</th>
													<th class="px-2 py-1">Check out</th>
												</tr>
											</thead>
											<tbody>
												{#each attendanceByUser.get(row.id) ?? [] as session}
													<tr class="border-t" style="border-color: var(--app-glass-border);">
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
														<td class="px-2 py-2" colspan="3" style="color: var(--app-text-muted);">No attendance records yet.</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
									<a
										href={`/roster/${row.id}#course-results`}
										class="mt-3 inline-block text-xs underline"
										style="color: var(--app-link);"
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
