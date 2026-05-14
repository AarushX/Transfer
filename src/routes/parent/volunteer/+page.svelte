<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let activeTab = $state<'dashboard' | 'opportunities' | 'hours'>('dashboard');
	let categoryFilter = $state('all');
	let showPledgeForm = $state(false);
	let signupOppId = $state('');
	let signupNotes = $state('');

	const commitmentMap = $derived(
		new Map((data.commitments ?? []).map((c: any) => [c.category_id, c]))
	);
	const hasPledge = $derived((data.commitments ?? []).length > 0);
	const yesCount = $derived(
		(data.commitments ?? []).filter((c: any) => c.response === 'yes').length
	);
	const categoriesMet = $derived(
		(data.progress ?? []).filter((p: any) => p.target_met).length
	);
	const totalCategories = $derived((data.categories ?? []).length);

	const totalVerifiedAmount = $derived(
		(data.progress ?? []).reduce((sum: number, p: any) => sum + Number(p.verified_amount ?? 0), 0)
	);
	const totalPendingAmount = $derived(
		(data.hourLogs ?? [])
			.filter((h: any) => h.verification_status === 'pending')
			.reduce((sum: number, h: any) => sum + Number(h.amount ?? 0), 0)
	);

	const mySignupOppIds = $derived(
		new Set((data.signups ?? []).filter((s: any) => s.status !== 'cancelled').map((s: any) => s.opportunity_id))
	);

	const filteredOpportunities = $derived(
		(data.opportunities ?? []).filter((o: any) => {
			if (categoryFilter !== 'all' && o.category_id !== categoryFilter) return false;
			return true;
		})
	);

	const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString() : '';
	const fmtTime = (t: string | null) => {
		if (!t) return '';
		const [h, m] = t.split(':').map(Number);
		const ampm = h >= 12 ? 'PM' : 'AM';
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
	};

	const progressPct = (completed: number, target: number) =>
		target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
</script>

<section class="space-y-5">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Portal</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Volunteer Center</span></h1>
		{#if data.season}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.season.label}</p>
		{/if}
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">
			{#if form.section === 'pledge'}Pledge saved successfully.
			{:else if form.section === 'signup'}Signed up successfully.
			{:else if form.section === 'cancel'}Signup cancelled.
			{:else if form.section === 'hours'}Hours logged successfully.
			{:else}Done.{/if}
		</p>
	{/if}

	{#if !data.season}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">No active season. Volunteer features are currently unavailable.</p>
		</GlassCard>
	{:else if !data.family}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">Link a student from the <a href="/parent/dashboard" class="underline" style="color: var(--app-accent);">Parent Dashboard</a> to get started with volunteering.</p>
		</GlassCard>
	{:else}
		<!-- Tab nav -->
		<div class="fade-up flex gap-1 rounded-xl border p-1" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			{#each [
				{ key: 'dashboard', label: 'Dashboard' },
				{ key: 'opportunities', label: 'Opportunities' },
				{ key: 'hours', label: 'Log Hours' }
			] as tab (tab.key)}
				<button
					type="button"
					onclick={() => { activeTab = tab.key as any; }}
					class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all"
					style={activeTab === tab.key
						? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);'
						: 'color: var(--app-text-muted);'}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- ═══════════ DASHBOARD TAB ═══════════ -->
		{#if activeTab === 'dashboard'}
			<!-- Summary cards -->
			<div class="fade-up grid gap-3 sm:grid-cols-3" style="animation-delay: 0.05s;">
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Pledged Categories</p>
					<p class="mt-1 text-xl font-semibold" style="color: var(--app-text);">{yesCount} <span class="text-sm font-normal" style="color: var(--app-text-muted);">of {totalCategories}</span></p>
				</GlassCard>
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Categories Met</p>
					<p class="mt-1 text-xl font-semibold" style="color: var(--app-success);">{categoriesMet} <span class="text-sm font-normal" style="color: var(--app-text-muted);">of {totalCategories}</span></p>
				</GlassCard>
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Verified Hours</p>
					<p class="mt-1 text-xl font-semibold" style="color: var(--app-accent);">{totalVerifiedAmount}
						{#if totalPendingAmount > 0}
							<span class="text-sm font-normal" style="color: var(--app-warning);">+{totalPendingAmount} pending</span>
						{/if}
					</p>
				</GlassCard>
			</div>

			<!-- Pledge section -->
			{#if !hasPledge || showPledgeForm}
				<GlassCard title={hasPledge ? 'Update Pledge' : 'Family Volunteer Pledge'} subtitle="Commit to at least 3 categories for the season. Select Yes, No, or Maybe for each.">
					<form method="POST" action="?/submitPledge" class="space-y-1">
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b" style="border-color: var(--app-glass-border);">
										<th class="py-2 pr-3 text-left text-xs font-medium" style="color: var(--app-text-muted);">Category</th>
										<th class="px-2 py-2 text-center text-xs font-medium" style="color: var(--app-text-muted); width: 60px;">Yes</th>
										<th class="px-2 py-2 text-center text-xs font-medium" style="color: var(--app-text-muted); width: 60px;">No</th>
										<th class="px-2 py-2 text-center text-xs font-medium" style="color: var(--app-text-muted); width: 80px;">Maybe</th>
										<th class="py-2 pl-3 text-left text-xs font-medium" style="color: var(--app-text-muted); min-width: 120px;">Notes</th>
									</tr>
								</thead>
								<tbody>
									{#each data.categories as cat (cat.id)}
										{@const existing = commitmentMap.get(cat.id)}
										<tr class="border-b" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
											<td class="py-2.5 pr-3">
												<p class="font-medium" style="color: var(--app-text);">{cat.name}</p>
												<p class="text-xs" style="color: var(--app-text-dim);">Target: {cat.target_value} {cat.unit}{cat.requires_prereq ? ` · ${cat.requires_prereq}` : ''}</p>
											</td>
											<td class="px-2 py-2.5 text-center">
												<input type="radio" name={`pledge_${cat.slug}`} value="yes" checked={existing?.response === 'yes'} class="accent-current" style="accent-color: var(--app-success);" />
											</td>
											<td class="px-2 py-2.5 text-center">
												<input type="radio" name={`pledge_${cat.slug}`} value="no" checked={!existing || existing?.response === 'no'} class="accent-current" />
											</td>
											<td class="px-2 py-2.5 text-center">
												<input type="radio" name={`pledge_${cat.slug}`} value="maybe" checked={existing?.response === 'maybe'} class="accent-current" style="accent-color: var(--app-warning);" />
											</td>
											<td class="py-2.5 pl-3">
												<input
													type="text"
													name={`notes_${cat.slug}`}
													value={existing?.notes ?? ''}
													placeholder="Optional"
													class="w-full rounded-lg border px-2 py-1 text-xs"
													style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
												/>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="flex items-center gap-3 pt-3">
							<Button variant="primary" type="submit">{hasPledge ? 'Update Pledge' : 'Submit Pledge'}</Button>
							{#if hasPledge}
								<Button variant="ghost" onclick={() => { showPledgeForm = false; }}>Cancel</Button>
							{/if}
							<p class="text-xs" style="color: var(--app-text-dim);">Minimum 3 "Yes" required</p>
						</div>
					</form>
				</GlassCard>
			{:else}
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Progress by Category</h2>
					<Button variant="ghost" size="sm" onclick={() => { showPledgeForm = true; }}>Edit Pledge</Button>
				</div>
			{/if}

			<!-- Progress bars per category -->
			{#if hasPledge}
				<div class="fade-up grid gap-2" style="animation-delay: 0.1s;">
					{#each data.progress as prog (prog.category_id)}
						{@const pct = progressPct(Number(prog.verified_amount), Number(prog.target_value))}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="text-sm font-medium" style="color: var(--app-text);">{prog.category_name}</p>
										{#if prog.pledge_response === 'yes'}
											<span class="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">pledged</span>
										{:else if prog.pledge_response === 'maybe'}
											<span class="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">maybe</span>
										{/if}
									</div>
									<div class="mt-1.5 h-2 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
										<div
											class="h-full rounded-full transition-all"
											style="width: {pct}%; background: {prog.target_met ? 'var(--app-success)' : 'var(--app-accent)'};"
										></div>
									</div>
									<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
										{prog.verified_amount} / {prog.target_value} {prog.unit}
										{#if Number(prog.completed_amount) > Number(prog.verified_amount)}
											<span style="color: var(--app-warning);">({prog.completed_amount} submitted)</span>
										{/if}
									</p>
								</div>
								{#if prog.target_met}
									<span class="shrink-0 text-lg" style="color: var(--app-success);">&#10003;</span>
								{/if}
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

			<!-- Upcoming signups -->
			{#if (data.signups ?? []).filter((s) => s.status !== 'cancelled').length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">My Signups</h2>
				<div class="space-y-2">
					{#each data.signups.filter((s) => s.status !== 'cancelled') as signup (signup.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{signup.opportunity?.title ?? 'Opportunity'}</p>
									<p class="text-xs" style="color: var(--app-text-dim);">
										{fmtDate(signup.opportunity?.event_date)} · {signup.opportunity?.category?.name ?? ''}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
										style={signup.status === 'confirmed' || signup.status === 'completed' || signup.status === 'verified'
											? 'background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);'
											: 'background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);'}>
										{signup.status}
									</span>
									{#if signup.status === 'pending' || signup.status === 'confirmed'}
										<form method="POST" action="?/cancelSignup">
											<input type="hidden" name="signup_id" value={signup.id} />
											<Button variant="ghost" size="sm" type="submit">Cancel</Button>
										</form>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════ OPPORTUNITIES TAB ═══════════ -->
		{:else if activeTab === 'opportunities'}
			<div class="fade-up flex flex-wrap items-center gap-2">
				<select
					class="rounded-lg border px-3 py-2 text-sm"
					style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					bind:value={categoryFilter}
				>
					<option value="all">All categories</option>
					{#each data.categories as cat (cat.id)}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>

			{#if filteredOpportunities.length === 0}
				<GlassCard>
					<p class="text-sm" style="color: var(--app-text-muted);">No opportunities available{categoryFilter !== 'all' ? ' in this category' : ''} right now.</p>
				</GlassCard>
			{:else}
				<div class="fade-up space-y-3" style="animation-delay: 0.05s;">
					{#each filteredOpportunities as opp (opp.id)}
						{@const isFull = opp.currentSignups >= opp.slots}
						{@const alreadySignedUp = mySignupOppIds.has(opp.id)}
						{@const pastDeadline = opp.signup_deadline && new Date(opp.signup_deadline) < new Date()}
						{@const pledgedCategory = commitmentMap.get(opp.category_id)?.response === 'yes'}
						<GlassCard>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<p class="text-sm font-semibold" style="color: var(--app-text);">{opp.title}</p>
										{#if pledgedCategory}
											<span class="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);">pledged</span>
										{/if}
									</div>
									<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
										{opp.category?.name ?? ''} · {fmtDate(opp.event_date)}
										{#if opp.start_time} · {fmtTime(opp.start_time)}{#if opp.end_time}–{fmtTime(opp.end_time)}{/if}{/if}
									</p>
									{#if opp.location}
										<p class="text-xs" style="color: var(--app-text-dim);">{opp.location}</p>
									{/if}
									{#if opp.description}
										<p class="mt-1 text-xs" style="color: var(--app-text);">{opp.description}</p>
									{/if}
									<p class="mt-1 text-xs" style="color: {isFull ? 'var(--app-danger)' : 'var(--app-text-dim)'};">
										{opp.currentSignups} / {opp.slots} slots filled
										{#if opp.signup_deadline} · Deadline: {new Date(opp.signup_deadline).toLocaleDateString()}{/if}
									</p>
								</div>
								<div class="shrink-0">
									{#if alreadySignedUp}
										<span class="inline-block rounded-full px-2.5 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">Signed up</span>
									{:else if isFull}
										<span class="inline-block rounded-full px-2.5 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">Full</span>
									{:else if pastDeadline}
										<span class="inline-block rounded-full px-2.5 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-text-dim) 15%, transparent); color: var(--app-text-dim);">Closed</span>
									{:else}
										<form method="POST" action="?/signUp" class="flex items-center gap-2">
											<input type="hidden" name="opportunity_id" value={opp.id} />
											<input
												type="text"
												name="notes"
												placeholder="Notes"
												class="w-24 rounded-lg border px-2 py-1 text-xs sm:w-32"
												style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
											/>
											<Button variant="primary" size="sm" type="submit">Sign Up</Button>
										</form>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════ HOURS TAB ═══════════ -->
		{:else if activeTab === 'hours'}
			<GlassCard title="Log Volunteer Hours" subtitle="Self-report hours. A mentor will verify them.">
				<form method="POST" action="?/logHours" class="space-y-3">
					<div>
						<label for="category_id" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Category</label>
						<select
							name="category_id"
							id="category_id"
							required
							class="w-full rounded-lg border px-3 py-2 text-sm"
							style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						>
							<option value="">Select category...</option>
							{#each data.categories as cat (cat.id)}
								<option value={cat.id}>{cat.name} ({cat.unit})</option>
							{/each}
						</select>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<label for="amount" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Amount</label>
							<input
								type="number"
								name="amount"
								id="amount"
								step="0.5"
								min="0.5"
								required
								placeholder="e.g. 2"
								class="w-full rounded-lg border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							/>
						</div>
						<div>
							<label for="activity_date" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Date</label>
							<input
								type="date"
								name="activity_date"
								id="activity_date"
								required
								class="w-full rounded-lg border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							/>
						</div>
					</div>
					<div>
						<label for="description" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Description</label>
						<textarea
							name="description"
							id="description"
							required
							rows="3"
							placeholder="Describe the volunteer activity..."
							class="w-full rounded-lg border px-3 py-2 text-sm"
							style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						></textarea>
					</div>
					<Button variant="primary" type="submit">Log Hours</Button>
				</form>
			</GlassCard>

			{#if (data.hourLogs ?? []).length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">My Hour Logs</h2>
				<div class="space-y-2">
					{#each data.hourLogs as entry (entry.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="flex-1 space-y-0.5">
									<p class="text-sm font-medium" style="color: var(--app-text);">
										{entry.amount} {entry.category?.unit ?? 'hours'}
										<span class="font-normal text-xs" style="color: var(--app-text-muted);">&middot; {entry.category?.name ?? ''} &middot; {fmtDate(entry.activity_date)}</span>
									</p>
									{#if entry.description}
										<p class="text-xs" style="color: var(--app-text);">{entry.description}</p>
									{/if}
									{#if entry.rejection_reason}
										<p class="text-xs" style="color: var(--app-danger);">Reason: {entry.rejection_reason}</p>
									{/if}
								</div>
								{#if entry.verification_status === 'pending'}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">pending</span>
								{:else if entry.verification_status === 'verified'}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">verified</span>
								{:else}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">rejected</span>
								{/if}
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</section>
