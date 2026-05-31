<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data, form } = $props();

	let filter = $state('');
	let chip = $state<'all' | 'leads' | 'mentors' | 'pending'>('all');
	let subteamFilter = $state<string>('');
	let groupBySubteam = $state(true);
	let expandedUserId = $state<string | null>(null);
	const canManage = $derived(data.canManageUsers);

	const teamGroupNameById = $derived(
		new Map(
			((data.teamGroups as Array<{ id: string; name?: string | null }>) ?? []).map((row) => [
				String(row.id),
				String(row.name ?? '')
			])
		)
	);
	const teamOptionLabel = (subteam: { name?: string | null; team_group_id?: string | null }) => {
		const groupName = teamGroupNameById.get(String(subteam.team_group_id ?? '')) ?? '';
		const teamName = String(subteam.name ?? '').trim();
		return groupName ? `${groupName}: ${teamName}` : teamName;
	};

	const attendanceByUser = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const s of data.attendanceSessions ?? []) {
			const key = String(s.attendee_user_id);
			const list = map.get(key) ?? [];
			list.push(s);
			map.set(key, list);
		}
		return map;
	});

	const filtered = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		return (data.rows ?? []).filter((r: any) => {
			if (q && !((r.full_name ?? '') + ' ' + (r.email ?? '')).toLowerCase().includes(q))
				return false;
			if (chip === 'leads' && !r.is_lead) return false;
			if (chip === 'mentors' && !r.is_mentor) return false;
			if (chip === 'pending' && (r.pendingCheckoffs ?? 0) === 0) return false;
			if (subteamFilter && !(r.subteamIds ?? []).includes(subteamFilter)) return false;
			return true;
		});
	});

	const groups = $derived.by(() => {
		if (!groupBySubteam) return [{ label: 'All', rows: filtered }];
		const byKey = new Map<string, { label: string; rows: any[] }>();
		for (const row of filtered) {
			const label = (row.primarySubteamName as string | null) ?? '(unassigned)';
			const entry = byKey.get(label) ?? { label, rows: [] };
			entry.rows.push(row);
			byKey.set(label, entry);
		}
		return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
	});
</script>

<section class="space-y-5">
	<header class="flex items-end justify-between">
		<div>
			<p class="eyebrow-label" style="margin-bottom: 4px;">Team</p>
			<h1 class="gradient-text text-2xl font-semibold tracking-tight">Roster</h1>
			<p class="text-sm" style="color: var(--app-text-muted);">
				{data.rows?.length ?? 0} members · {data.rows?.filter((r: any) => r.is_mentor).length ?? 0} mentors
				· {data.rows?.filter((r: any) => r.is_lead).length ?? 0} leads
			</p>
		</div>
		{#if canManage}
			<div
				class="rounded-xl border px-3 py-2 text-xs font-semibold"
				style="background: color-mix(in srgb, var(--app-danger) 8%, transparent); border-color: color-mix(in srgb, var(--app-danger) 25%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);"
			>
				● Admin tools active
			</div>
		{/if}
	</header>

	{#if form?.error}
		<p
			class="rounded border p-2 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded border p-2 text-sm"
			style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}

	<!-- Filter bar -->
	<div class="flex flex-wrap items-center gap-2">
		<input
			class="min-w-[200px] flex-1 rounded-xl border px-3 py-2 text-sm"
			style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
			placeholder="Search by name or email…"
			bind:value={filter}
		/>
		{#each [['all', 'All'], ['leads', 'Leads'], ['mentors', 'Mentors'], ['pending', 'Pending checkoffs']] as [key, label] (key)}
			<button
				onclick={() => (chip = key as 'all' | 'leads' | 'mentors' | 'pending')}
				class="rounded-lg px-3 py-1.5 text-xs font-semibold"
				style={chip === key
					? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); border: 1px solid color-mix(in srgb, var(--app-accent) 50%, transparent); color: color-mix(in srgb, var(--app-accent) 30%, white);'
					: 'background: var(--app-glass-bg); border: 1px solid var(--app-glass-border); color: var(--app-text-muted);'}
			>
				{label}
			</button>
		{/each}
		<select
			bind:value={subteamFilter}
			class="rounded-xl border px-3 py-2 text-sm"
			style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
		>
			<option value="">All subteams</option>
			{#each data.subteams ?? [] as st (st.id)}
				<option value={st.id}>{st.name}</option>
			{/each}
		</select>
		<label
			class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
			style="background: var(--app-glass-bg); border: 1px solid var(--app-glass-border); color: var(--app-text-muted);"
		>
			<input type="checkbox" bind:checked={groupBySubteam} />
			Group by subteam
		</label>
	</div>

	{#each groups as group (group.label)}
		<div>
			{#if groupBySubteam}
				<div class="mt-4 mb-2 flex items-center gap-3">
					<p
						class="text-[11px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
						{group.label}
					</p>
					<p class="text-xs" style="color: var(--app-text-muted); opacity: 0.6;">
						{group.rows.length} member{group.rows.length === 1 ? '' : 's'}
					</p>
				</div>
			{/if}
			<div
				class="overflow-hidden rounded-2xl border"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<table class="min-w-full text-sm">
					<thead style="background: var(--app-table-header-bg);">
						<tr>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Member</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Roles</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Progress</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Pending</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Hours</th
							>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each group.rows as row (row.id)}
							<tr class="row-main border-t" style="border-color: var(--app-glass-border);">
								<td class="p-3">
									<div class="flex items-center gap-2">
										<Avatar name={row.full_name} email={row.email} size="sm" />
										<div>
											<a
												href={`/roster/${row.id}`}
												class="font-medium"
												style="color: var(--app-text);">{row.full_name || row.email}</a
											>
											<p class="text-xs" style="color: var(--app-text-muted);">{row.email}</p>
										</div>
									</div>
								</td>
								<td class="p-3">
									<div class="flex flex-wrap gap-1">
										{#if row.base_role === 'admin' || row.role === 'admin'}
											<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);"
												>admin</span
											>
										{/if}
										{#if row.is_mentor}
											<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);"
												>mentor</span
											>
										{/if}
										{#if row.is_lead}
											<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);"
												>lead</span
											>
										{/if}
									</div>
								</td>
								<td class="p-3">
									{#if row.progressPercent > 0}
										<div class="flex items-center gap-2">
											<div
												class="h-1.5 w-24 rounded-full"
												style="background: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
											>
												<div
													class="h-full rounded-full"
													style="width: {row.progressPercent}%; background: var(--app-accent);"
												></div>
											</div>
											<span class="mono text-xs" style="color: var(--app-text-muted);"
												>{row.progressPercent}%</span
											>
										</div>
									{:else}
										<span class="mono text-xs" style="color: var(--app-text-dim);">—</span>
									{/if}
								</td>
								<td class="p-3">
									{#if (row.pendingCheckoffs ?? 0) > 0}
										<span data-role="pending-count" class="mono" style="color: var(--app-warning);"
											>{row.pendingCheckoffs}</span
										>
									{:else}
										<span data-role="pending-count" class="mono" style="color: var(--app-text-dim);"
											>—</span
										>
									{/if}
								</td>
								<td class="p-3">
									<span
										class="mono"
										style="color: {row.hoursTotal
											? 'var(--app-text-muted)'
											: 'var(--app-text-dim)'};">{row.hoursTotal ?? '—'}</span
									>
								</td>
								<td class="p-3 text-right">
									<button
										data-role="expand-caret"
										type="button"
										class="rounded-md border px-2 py-1 text-xs"
										style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
										onclick={() => (expandedUserId = expandedUserId === row.id ? null : row.id)}
									>
										{expandedUserId === row.id ? '▾' : '▸'}
									</button>
								</td>
							</tr>
							{#if expandedUserId === row.id}
								<tr
									class="row-expand border-t"
									style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
								>
									<td colspan="6" class="p-4">
										<div class="flex gap-6">
											<!-- Left: Attendance history -->
											<div class="flex-1">
												<p class="eyebrow-label" style="margin-bottom: 8px;">
													Attendance · last 4 sessions
												</p>
												<div class="flex flex-wrap gap-2">
													{#each (attendanceByUser.get(row.id) ?? []).slice(0, 4) as s}
														<span
															class="rounded-md px-2 py-1 text-xs"
															style="background: var(--app-glass-bg); border: 1px solid var(--app-glass-border); color: var(--app-text-muted);"
														>
															{s.attendance_day}
														</span>
													{:else}
														<span class="text-xs" style="color: var(--app-text-muted);"
															>No attendance records yet.</span
														>
													{/each}
												</div>
												<a
													href={`/roster/${row.id}`}
													class="mt-3 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium"
													style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
												>
													Full course history
													<svg
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														class="h-3 w-3"><path d="M5 12h14M13 5l7 7-7 7" /></svg
													>
												</a>
											</div>

											<!-- Right: Admin controls (admins only) -->
											{#if canManage}
												<div
													class="flex-1 border-l pl-6"
													style="border-color: var(--app-glass-border);"
												>
													<p
														class="eyebrow-label"
														style="margin-bottom: 8px; color: color-mix(in srgb, var(--app-danger) 70%, var(--app-text-muted));"
													>
														Admin controls
													</p>
													<form method="POST" action="?/updateMemberAccess" class="space-y-3">
														<input type="hidden" name="user_id" value={row.id} />
														<div class="grid grid-cols-2 gap-3">
															<label class="block">
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Base role</span
																>
																<select
																	name="base_role"
																	class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																>
																	<option value="member" selected={row.base_role === 'member'}
																		>member</option
																	>
																	<option value="admin" selected={row.base_role === 'admin'}
																		>admin</option
																	>
																</select>
															</label>
															<label class="block">
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Lead of team</span
																>
																<select
																	name="lead_team_group_id"
																	class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																>
																	<option value="">— none —</option>
																	{#each data.teamGroups as tg (tg.id)}
																		<option
																			value={tg.id}
																			selected={row.lead_team_group_id === tg.id}>{tg.name}</option
																		>
																	{/each}
																</select>
															</label>
															<div>
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Flags</span
																>
																<div class="mt-1 flex gap-2">
																	<label
																		class="inline-flex items-center gap-1 text-xs"
																		style="color: var(--app-text-muted);"
																	>
																		<input
																			type="checkbox"
																			name="is_mentor"
																			checked={!!row.is_mentor}
																		/>
																		Mentor
																	</label>
																</div>
															</div>
														</div>
														<Button variant="primary" size="sm" type="submit">Save changes</Button>
													</form>

													<!-- Subteam leads — which of the member's subteams they lead. -->
													{#if (row.subteamLeadOptions ?? []).length > 0}
														<form
															method="POST"
															action="?/setMemberSubteamLeads"
															class="mt-5 space-y-2 border-t pt-4"
															style="border-color: var(--app-glass-border);"
														>
															<input type="hidden" name="user_id" value={row.id} />
															<span
																class="text-[10px] tracking-wider uppercase"
																style="color: var(--app-text-muted);">Leads which subteams</span
															>
															<div class="flex flex-col gap-1">
																{#each row.subteamLeadOptions as opt (opt.teamId)}
																	<label
																		class="inline-flex items-center gap-2 text-xs"
																		style="color: var(--app-text-muted);"
																	>
																		<input
																			type="checkbox"
																			name="lead_team_ids"
																			value={opt.teamId}
																			checked={opt.isLead}
																		/>
																		{opt.name}
																	</label>
																{/each}
															</div>
															<Button variant="secondary" size="sm" type="submit"
																>Save subteam leads</Button
															>
														</form>
													{/if}

													<!-- Team assignments — moved here from /roster/[userId] so admins
													     can edit onboarded subteams inline without leaving the table. -->
													<form
														method="POST"
														action="?/setUserTeams"
														class="mt-5 space-y-3 border-t pt-4"
														style="border-color: var(--app-glass-border);"
													>
														<input type="hidden" name="user_id" value={row.id} />
														<p
															class="eyebrow-label"
															style="margin-bottom: 0; color: color-mix(in srgb, var(--app-danger) 70%, var(--app-text-muted));"
														>
															Team assignments
														</p>
														<label class="block">
															<span
																class="text-[10px] tracking-wider uppercase"
																style="color: var(--app-text-muted);">Main team</span
															>
															<select
																name="primary_team_group_id"
																required
																class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
															>
																<option value="">Select main team</option>
																{#each data.teamGroups as tg (tg.id)}
																	<option
																		value={tg.id}
																		selected={String(tg.id) ===
																			String(row.currentPrimaryTeamGroupId)}
																	>
																		{tg.name}
																	</option>
																{/each}
															</select>
														</label>
														{#each data.requiredCategories as category (category.slug)}
															{@const categorySlug = String(category.slug)}
															{@const currentTeamId =
																row.currentTeamIdByCategory?.[categorySlug] ?? ''}
															<label class="block">
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);"
																	>{category.name} subteam</span
																>
																<select
																	name={`team_id_${categorySlug}`}
																	required
																	class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																>
																	<option value=""
																		>Select {category.name.toLowerCase()} subteam</option
																	>
																	{#each data.teams.filter((t: any) => String(t.category_slug ?? '') === categorySlug) as subteam (subteam.id)}
																		<option
																			value={subteam.id}
																			selected={String(currentTeamId) === String(subteam.id)}
																		>
																			{teamOptionLabel(subteam)}
																		</option>
																	{/each}
																</select>
															</label>
														{/each}
														<Button variant="secondary" size="sm" type="submit"
															>Save team assignments</Button
														>
													</form>
												</div>
											{/if}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/each}
</section>
