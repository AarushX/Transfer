<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let activeTab = $state<'verify' | 'opportunities' | 'gaps' | 'families' | 'categories'>('verify');
	let showCreateOpp = $state(false);

	const pendingCount = $derived((data.pendingVerifications ?? []).length);
	const gapCount = $derived((data.gapsReport ?? []).length);

	const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString() : '';
	const fmtTime = (t: string | null) => {
		if (!t) return '';
		const [h, m] = t.split(':').map(Number);
		const ampm = h >= 12 ? 'PM' : 'AM';
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
	};

	let rejectingId = $state('');
	let rejectReason = $state('');
</script>

<section class="space-y-5">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Admin</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Volunteer Management</span></h1>
		{#if data.season}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.season.label}</p>
		{/if}
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Done.</p>
	{/if}

	{#if !data.season}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">No active season. Create one in <a href="/admin/lettering" class="underline" style="color: var(--app-accent);">Lettering</a> first.</p>
		</GlassCard>
	{:else}
		<!-- Tab nav -->
		<div class="fade-up flex gap-1 overflow-x-auto rounded-xl border p-1" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			{#each [
				{ key: 'verify', label: `Verify (${pendingCount})` },
				{ key: 'opportunities', label: 'Opportunities' },
				{ key: 'gaps', label: `Gaps (${gapCount})` },
				{ key: 'families', label: 'Families' },
				{ key: 'categories', label: 'Categories' }
			] as tab (tab.key)}
				<button
					type="button"
					onclick={() => { activeTab = tab.key as any; }}
					class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all"
					style={activeTab === tab.key
						? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);'
						: 'color: var(--app-text-muted);'}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- ═══════════ VERIFY TAB ═══════════ -->
		{#if activeTab === 'verify'}
			{#if pendingCount === 0}
				<GlassCard>
					<p class="text-sm" style="color: var(--app-text-muted);">No pending verifications. All caught up.</p>
				</GlassCard>
			{:else}
				<p class="text-xs" style="color: var(--app-text-dim);">{pendingCount} hour log{pendingCount !== 1 ? 's' : ''} awaiting verification</p>
				<div class="space-y-2">
					{#each data.pendingVerifications as log (log.id)}
						<GlassCard compact>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">
										{log.amount} {log.category?.unit ?? 'hours'}
										<span class="font-normal text-xs" style="color: var(--app-text-muted);">&middot; {log.category?.name ?? ''}</span>
									</p>
									<p class="text-xs" style="color: var(--app-text-dim);">
										{(log.family as any)?.name ?? 'Unknown Family'} &middot; {(log.reporter as any)?.full_name ?? (log.reporter as any)?.email ?? ''} &middot; {fmtDate(log.activity_date)}
									</p>
									{#if log.description}
										<p class="mt-0.5 text-xs" style="color: var(--app-text);">{log.description}</p>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if rejectingId === log.id}
										<form method="POST" action="?/verifyHours" class="flex items-center gap-2">
											<input type="hidden" name="log_id" value={log.id} />
											<input type="hidden" name="action" value="reject" />
											<input
												type="text"
												name="rejection_reason"
												bind:value={rejectReason}
												placeholder="Reason"
												class="w-32 rounded-lg border px-2 py-1 text-xs"
												style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
											/>
											<Button variant="danger" size="sm" type="submit">Reject</Button>
											<Button variant="ghost" size="sm" onclick={() => { rejectingId = ''; rejectReason = ''; }}>Cancel</Button>
										</form>
									{:else}
										<form method="POST" action="?/verifyHours">
											<input type="hidden" name="log_id" value={log.id} />
											<input type="hidden" name="action" value="verify" />
											<Button variant="primary" size="sm" type="submit">Verify</Button>
										</form>
										<Button variant="ghost" size="sm" onclick={() => { rejectingId = log.id; rejectReason = ''; }}>Reject</Button>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════ OPPORTUNITIES TAB ═══════════ -->
		{:else if activeTab === 'opportunities'}
			<div class="flex items-center justify-between">
				<p class="text-xs" style="color: var(--app-text-dim);">{(data.opportunities ?? []).length} opportunity{(data.opportunities ?? []).length !== 1 ? 'ies' : 'y'}</p>
				<Button variant="primary" size="sm" onclick={() => { showCreateOpp = !showCreateOpp; }}>
					{showCreateOpp ? 'Cancel' : 'New Opportunity'}
				</Button>
			</div>

			{#if showCreateOpp}
				<GlassCard title="Create Opportunity">
					<form method="POST" action="?/createOpportunity" class="space-y-3">
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<label for="opp_category" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Category</label>
								<select name="category_id" id="opp_category" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
									<option value="">Select...</option>
									{#each data.categories as cat (cat.id)}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</select>
							</div>
							<div>
								<label for="opp_title" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Title</label>
								<input type="text" name="title" id="opp_title" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="e.g. GRITS Transportation" />
							</div>
						</div>
						<div>
							<label for="opp_desc" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Description</label>
							<textarea name="description" id="opp_desc" rows="2" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="Details about what's needed..."></textarea>
						</div>
						<div class="grid gap-3 sm:grid-cols-3">
							<div>
								<label for="opp_date" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Date</label>
								<input type="date" name="event_date" id="opp_date" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
							<div>
								<label for="opp_start" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Start Time</label>
								<input type="time" name="start_time" id="opp_start" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
							<div>
								<label for="opp_end" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">End Time</label>
								<input type="time" name="end_time" id="opp_end" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
						</div>
						<div class="grid gap-3 sm:grid-cols-3">
							<div>
								<label for="opp_location" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Location</label>
								<input type="text" name="location" id="opp_location" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="Address or venue" />
							</div>
							<div>
								<label for="opp_slots" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Slots</label>
								<input type="number" name="slots" id="opp_slots" min="1" value="4" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
							<div>
								<label for="opp_deadline" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Signup Deadline</label>
								<input type="datetime-local" name="signup_deadline" id="opp_deadline" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
						</div>
						<label class="flex items-center gap-2 text-sm" style="color: var(--app-text-muted);">
							<input type="checkbox" name="requires_approval" />
							Require admin approval for signups
						</label>
						<Button variant="primary" type="submit">Create Opportunity</Button>
					</form>
				</GlassCard>
			{/if}

			<div class="space-y-2">
				{#each data.opportunities as opp (opp.id)}
					<GlassCard compact>
						<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="text-sm font-medium" style="color: var(--app-text);">{opp.title}</p>
									{#if !opp.is_active}
										<span class="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-text-dim) 15%, transparent); color: var(--app-text-dim);">inactive</span>
									{/if}
								</div>
								<p class="text-xs" style="color: var(--app-text-dim);">
									{opp.category?.name ?? ''} · {fmtDate(opp.event_date)}
									{#if opp.start_time} · {fmtTime(opp.start_time)}{/if}
									{#if opp.location} · {opp.location}{/if}
									· {opp.currentSignups}/{opp.slots} slots
								</p>
							</div>
							<div class="flex items-center gap-2">
								<form method="POST" action="?/toggleOpportunity">
									<input type="hidden" name="id" value={opp.id} />
									<input type="hidden" name="is_active" value={opp.is_active ? 'false' : 'true'} />
									<Button variant="ghost" size="sm" type="submit">{opp.is_active ? 'Deactivate' : 'Activate'}</Button>
								</form>
								<form method="POST" action="?/deleteOpportunity" onsubmit={(e) => { if (!confirm('Delete this opportunity?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={opp.id} />
									<Button variant="danger" size="sm" type="submit">Delete</Button>
								</form>
							</div>
						</div>
					</GlassCard>
				{/each}
			</div>

		<!-- ═══════════ GAPS TAB ═══════════ -->
		{:else if activeTab === 'gaps'}
			{#if gapCount === 0}
				<GlassCard>
					<p class="text-sm" style="color: var(--app-text-muted);">All opportunities are fully staffed.</p>
				</GlassCard>
			{:else}
				<p class="text-xs" style="color: var(--app-text-dim);">{gapCount} opportunity{gapCount !== 1 ? 'ies' : 'y'} need more volunteers</p>
				<div class="space-y-2">
					{#each data.gapsReport as gap (gap.opportunity.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{gap.opportunity.title}</p>
									<p class="text-xs" style="color: var(--app-text-dim);">
										{gap.categoryName} · {fmtDate(gap.opportunity.event_date)}
									</p>
								</div>
								<div class="text-right">
									<p class="text-sm font-semibold" style="color: var(--app-danger);">{gap.needed} needed</p>
									<p class="text-xs" style="color: var(--app-text-dim);">{gap.filled}/{gap.opportunity.slots} filled</p>
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════ FAMILIES TAB ═══════════ -->
		{:else if activeTab === 'families'}
			<p class="text-xs" style="color: var(--app-text-dim);">{(data.families ?? []).length} families · {(data.commitmentStats ?? []).length} with pledges</p>

			{#if (data.commitmentStats ?? []).length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Pledge Leaderboard</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b" style="border-color: var(--app-glass-border);">
								<th class="py-2 pr-3 text-left text-xs font-medium" style="color: var(--app-text-muted);">Family</th>
								<th class="px-3 py-2 text-center text-xs font-medium" style="color: var(--app-text-muted);">Pledged</th>
								<th class="px-3 py-2 text-center text-xs font-medium" style="color: var(--app-text-muted);">Met</th>
							</tr>
						</thead>
						<tbody>
							{#each data.commitmentStats.sort((a, b) => b.verifiedCount - a.verifiedCount) as stat (stat.familyId)}
								<tr class="border-b" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
									<td class="py-2 pr-3" style="color: var(--app-text);">{stat.familyName}</td>
									<td class="px-3 py-2 text-center" style="color: var(--app-text-muted);">{stat.pledgedCount}</td>
									<td class="px-3 py-2 text-center" style="color: {stat.verifiedCount >= 3 ? 'var(--app-success)' : 'var(--app-text)'};">{stat.verifiedCount}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">All Families</h2>
			<div class="space-y-2">
				{#each data.families as fam (fam.id)}
					<GlassCard compact>
						<p class="text-sm font-medium" style="color: var(--app-text);">{fam.name}</p>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each (fam as any).family_members ?? [] as member}
								<span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
									style="background: color-mix(in srgb, {member.role === 'parent' ? 'var(--app-accent)' : 'var(--app-info)'} 15%, transparent); color: {member.role === 'parent' ? 'var(--app-accent)' : 'var(--app-info)'};">
									{member.profile?.full_name ?? member.profile?.email ?? 'Unknown'} ({member.role})
								</span>
							{/each}
						</div>
					</GlassCard>
				{/each}
			</div>

		<!-- ═══════════ CATEGORIES TAB ═══════════ -->
		{:else if activeTab === 'categories'}
			<p class="text-xs" style="color: var(--app-text-dim);">Configure volunteer category targets and status</p>
			<div class="space-y-2">
				{#each data.categories as cat (cat.id)}
					<GlassCard compact>
						<form method="POST" action="?/updateCategory" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<input type="hidden" name="id" value={cat.id} />
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium" style="color: var(--app-text);">{cat.name}</p>
								<p class="text-xs" style="color: var(--app-text-dim);">{cat.description}</p>
								{#if cat.requires_prereq}
									<p class="text-xs" style="color: var(--app-warning);">{cat.requires_prereq}</p>
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1">
									<label for={`target_${cat.slug}`} class="text-xs" style="color: var(--app-text-muted);">Target:</label>
									<input
										type="number"
										name="target_value"
										id={`target_${cat.slug}`}
										value={cat.target_value}
										min="0"
										step="0.5"
										class="w-16 rounded-lg border px-2 py-1 text-xs text-center"
										style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
									/>
									<span class="text-xs" style="color: var(--app-text-dim);">{cat.unit}</span>
								</div>
								<label class="flex items-center gap-1 text-xs" style="color: var(--app-text-muted);">
									<input type="checkbox" name="is_active" value="on" checked={cat.is_active} />
									Active
								</label>
								<Button variant="secondary" size="sm" type="submit">Save</Button>
							</div>
						</form>
					</GlassCard>
				{/each}
			</div>
		{/if}
	{/if}
</section>
