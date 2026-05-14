<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let activeTab = $state<'events' | 'verify' | 'announcements' | 'gaps' | 'families' | 'categories'>('events');
	let showCreateEvent = $state(false);
	let showCreateAnn = $state(false);
	let editingEventId = $state('');
	let editingOppId = $state('');
	let editingAnnId = $state('');
	let rejectingId = $state('');
	let rejectReason = $state('');

	const pendingCount = $derived((data.pendingVerifications ?? []).length);
	const gapCount = $derived((data.gapsReport ?? []).length);

	const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString() : '';
	const fmtTime = (t: string | null) => {
		if (!t) return '';
		const [h, m] = t.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
	};

	// For each event, build a set of currently-active category_ids
	const activeCategoriesByEvent = $derived(() => {
		const map = new Map<string, Set<string>>();
		for (const opp of data.opportunities ?? []) {
			if (!opp.event_id || !opp.is_active) continue;
			const set = map.get(opp.event_id) ?? new Set<string>();
			set.add(opp.category_id);
			map.set(opp.event_id, set);
		}
		return map;
	});
</script>

<section class="space-y-5">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Admin</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Volunteer Management</span></h1>
		{#if data.season}<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.season.label}</p>{/if}
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Done.</p>
	{/if}

	{#if !data.season}
		<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">No active season. Create one in <a href="/admin/lettering" class="underline" style="color: var(--app-accent);">Lettering</a> first.</p></GlassCard>
	{:else}
		<!-- Tabs -->
		<div class="fade-up flex gap-1 overflow-x-auto rounded-xl border p-1" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			{#each [
				{ key: 'events', label: 'Events' },
				{ key: 'verify', label: `Verify (${pendingCount})` },
				{ key: 'announcements', label: 'Announcements' },
				{ key: 'gaps', label: `Gaps (${gapCount})` },
				{ key: 'families', label: 'Families' },
				{ key: 'categories', label: 'Categories' }
			] as tab (tab.key)}
				<button type="button" onclick={() => { activeTab = tab.key as any; }} class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all" style={activeTab === tab.key ? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);' : 'color: var(--app-text-muted);'}>{tab.label}</button>
			{/each}
		</div>

		<!-- ═══════════ EVENTS ═══════════ -->
		{#if activeTab === 'events'}
			<div class="flex items-center justify-between">
				<p class="text-xs" style="color: var(--app-text-dim);">{(data.events ?? []).length} event{(data.events ?? []).length !== 1 ? 's' : ''}</p>
				<Button variant="primary" size="sm" onclick={() => { showCreateEvent = !showCreateEvent; }}>{showCreateEvent ? 'Cancel' : 'New Event'}</Button>
			</div>

			{#if showCreateEvent}
				<GlassCard title="Create Event / Competition" subtitle="Check the categories this event needs. Each checked category creates a volunteer signup section parents can claim.">
					<form method="POST" action="?/createEvent" class="space-y-3">
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Title</label>
								<input type="text" name="title" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="e.g. GRITS Regional" />
							</div>
							<div>
								<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Location</label>
								<input type="text" name="location" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="Venue / city" />
							</div>
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Start Date</label>
								<input type="date" name="start_date" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
							<div>
								<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">End Date</label>
								<input type="date" name="end_date" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							</div>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Description</label>
							<textarea name="description" rows="2" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="Details parents need to know..."></textarea>
						</div>
						<div>
							<p class="mb-2 text-xs font-medium" style="color: var(--app-text-muted);">Volunteer categories needed</p>
							<div class="grid gap-1.5 sm:grid-cols-2">
								{#each data.categories as cat (cat.id)}
									<label class="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border);">
										<div class="flex items-center gap-2 min-w-0">
											<input type="checkbox" name="category_ids" value={cat.id} />
											<span style="color: var(--app-text);">{cat.name}</span>
										</div>
										<div class="flex items-center gap-1 shrink-0">
											<span class="text-xs" style="color: var(--app-text-dim);">slots</span>
											<input type="number" name={`slots_${cat.id}`} value="4" min="1" class="w-14 rounded border px-1.5 py-0.5 text-xs text-center" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
										</div>
									</label>
								{/each}
							</div>
						</div>
						<Button variant="primary" type="submit">Create Event</Button>
					</form>
				</GlassCard>
			{/if}

			<!-- Events list -->
			{#each data.events as evt (evt.id)}
				{@const evtOpps = (data.opportunities ?? []).filter((o) => o.event_id === evt.id)}
				{@const activeCatIds = activeCategoriesByEvent().get(evt.id) ?? new Set()}
				<GlassCard>
					{#if editingEventId === evt.id}
						<!-- EDIT MODE -->
						<form method="POST" action="?/updateEvent" class="space-y-3">
							<input type="hidden" name="id" value={evt.id} />
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Title</label>
									<input type="text" name="title" required value={evt.title} class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
								</div>
								<div>
									<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Location</label>
									<input type="text" name="location" value={evt.location ?? ''} class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
								</div>
							</div>
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Start Date</label>
									<input type="date" name="start_date" required value={evt.start_date} class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
								</div>
								<div>
									<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">End Date</label>
									<input type="date" name="end_date" value={evt.end_date ?? ''} class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
								</div>
							</div>
							<div>
								<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Description</label>
								<textarea name="description" rows="2" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">{evt.description ?? ''}</textarea>
							</div>
							<div>
								<p class="mb-2 text-xs font-medium" style="color: var(--app-text-muted);">Volunteer categories needed</p>
								<div class="grid gap-1.5 sm:grid-cols-2">
									{#each data.categories as cat (cat.id)}
										{@const existingOpp = evtOpps.find((o) => o.category_id === cat.id)}
										<label class="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border);">
											<div class="flex items-center gap-2 min-w-0">
												<input type="checkbox" name="category_ids" value={cat.id} checked={activeCatIds.has(cat.id)} />
												<span style="color: var(--app-text);">{cat.name}</span>
											</div>
											<div class="flex items-center gap-1 shrink-0">
												<span class="text-xs" style="color: var(--app-text-dim);">slots</span>
												<input type="number" name={`slots_${cat.id}`} value={existingOpp?.slots ?? 4} min="1" class="w-14 rounded border px-1.5 py-0.5 text-xs text-center" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											</div>
										</label>
									{/each}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button variant="primary" type="submit">Save</Button>
								<Button variant="ghost" onclick={() => { editingEventId = ''; }}>Cancel</Button>
							</div>
						</form>
					{:else}
						<!-- VIEW MODE -->
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-bold" style="color: var(--app-text);">{evt.title}</p>
								<p class="text-xs" style="color: var(--app-text-dim);">{fmtDate(evt.start_date)}{evt.end_date ? ` – ${fmtDate(evt.end_date)}` : ''}{evt.location ? ` · ${evt.location}` : ''}</p>
								{#if evt.description}<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{evt.description}</p>{/if}
							</div>
							<div class="flex items-center gap-1.5 shrink-0">
								<Button variant="ghost" size="sm" onclick={() => { editingEventId = evt.id; }}>Edit</Button>
								<form method="POST" action="?/deleteEvent" onsubmit={(e) => { if (!confirm('Delete this event and all its opportunities?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={evt.id} />
									<Button variant="danger" size="sm" type="submit">Delete</Button>
								</form>
							</div>
						</div>

						{#if evtOpps.length > 0}
							<div class="mt-3 space-y-1.5">
								{#each evtOpps as opp (opp.id)}
									{#if editingOppId === opp.id}
										<form method="POST" action="?/updateOpportunity" class="rounded-lg border p-3 space-y-2" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);">
											<input type="hidden" name="id" value={opp.id} />
											<div class="grid gap-2 sm:grid-cols-3">
												<input type="text" name="title" value={opp.title} placeholder="Title" class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
												<input type="date" name="event_date" value={opp.event_date} class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
												<input type="number" name="slots" value={opp.slots} min="1" class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											</div>
											<div class="grid gap-2 sm:grid-cols-3">
												<input type="time" name="start_time" value={opp.start_time ?? ''} class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
												<input type="time" name="end_time" value={opp.end_time ?? ''} class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
												<input type="text" name="location" value={opp.location ?? ''} placeholder="Location" class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											</div>
											<textarea name="description" rows="2" placeholder="Description / notes for parents" class="w-full rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">{opp.description ?? ''}</textarea>
											<div class="flex items-center gap-2">
												<Button variant="primary" size="sm" type="submit">Save</Button>
												<Button variant="ghost" size="sm" onclick={() => { editingOppId = ''; }}>Cancel</Button>
											</div>
										</form>
									{:else}
										<div class="flex items-center justify-between gap-2 rounded-lg border p-2" style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);">
											<div class="min-w-0 flex-1">
												<p class="text-xs font-medium" style="color: var(--app-text);">
													{opp.title}
													<span style="color: var(--app-text-dim);">· {opp.category?.name ?? ''} · {opp.currentSignups}/{opp.slots} signed up</span>
													{#if !opp.is_active}<span class="ml-1 rounded px-1 text-[10px]" style="background: color-mix(in srgb, var(--app-text-dim) 15%, transparent); color: var(--app-text-dim);">inactive</span>{/if}
												</p>
												{#if opp.start_time || opp.location}
													<p class="text-[11px]" style="color: var(--app-text-dim);">
														{#if opp.start_time}{fmtTime(opp.start_time)}{#if opp.end_time}–{fmtTime(opp.end_time)}{/if}{/if}
														{#if opp.location} · {opp.location}{/if}
													</p>
												{/if}
											</div>
											<Button variant="ghost" size="sm" onclick={() => { editingOppId = opp.id; }}>Edit</Button>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<p class="mt-2 text-xs" style="color: var(--app-text-dim);">No categories selected yet — click Edit to add some.</p>
						{/if}
					{/if}
				</GlassCard>
			{/each}

		<!-- ═══════════ VERIFY ═══════════ -->
		{:else if activeTab === 'verify'}
			{#if pendingCount === 0}
				<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">No pending verifications.</p></GlassCard>
			{:else}
				<p class="text-xs" style="color: var(--app-text-dim);">{pendingCount} pending</p>
				<div class="space-y-2">
					{#each data.pendingVerifications as log (log.id)}
						<GlassCard compact>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{log.amount} {log.category?.unit ?? 'hrs'} <span class="font-normal text-xs" style="color: var(--app-text-muted);">· {log.category?.name}</span></p>
									<p class="text-xs" style="color: var(--app-text-dim);">{(log.family as any)?.name} · {(log.reporter as any)?.full_name ?? (log.reporter as any)?.email} · {fmtDate(log.activity_date)}</p>
									{#if log.description}<p class="mt-0.5 text-xs" style="color: var(--app-text);">{log.description}</p>{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if rejectingId === log.id}
										<form method="POST" action="?/verifyHours" class="flex items-center gap-2">
											<input type="hidden" name="log_id" value={log.id} /><input type="hidden" name="action" value="reject" />
											<input type="text" name="rejection_reason" bind:value={rejectReason} placeholder="Reason" class="w-32 rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<Button variant="danger" size="sm" type="submit">Reject</Button>
											<Button variant="ghost" size="sm" onclick={() => { rejectingId = ''; }}>Cancel</Button>
										</form>
									{:else}
										<form method="POST" action="?/verifyHours"><input type="hidden" name="log_id" value={log.id} /><input type="hidden" name="action" value="verify" /><Button variant="primary" size="sm" type="submit">Verify</Button></form>
										<Button variant="ghost" size="sm" onclick={() => { rejectingId = log.id; rejectReason = ''; }}>Reject</Button>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════ ANNOUNCEMENTS ═══════════ -->
		{:else if activeTab === 'announcements'}
			<div class="flex items-center justify-between">
				<p class="text-xs" style="color: var(--app-text-dim);">{(data.announcements ?? []).length} announcement{(data.announcements ?? []).length !== 1 ? 's' : ''}</p>
				<Button variant="primary" size="sm" onclick={() => { showCreateAnn = !showCreateAnn; }}>{showCreateAnn ? 'Cancel' : 'New Announcement'}</Button>
			</div>

			{#if !data.emailConfigured}
				<div class="rounded-xl border p-3" style="border-color: color-mix(in srgb, var(--app-warning) 40%, transparent); background: color-mix(in srgb, var(--app-warning) 6%, transparent);">
					<p class="text-xs font-medium" style="color: var(--app-warning);">Email not configured</p>
					<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">Set GMAIL_USER and GMAIL_APP_PASSWORD env vars to enable email blasts. Announcements still appear in the portal.</p>
				</div>
			{/if}

			{#if showCreateAnn}
				<GlassCard title="Create Announcement">
					<form method="POST" action="?/createAnnouncement" class="space-y-3">
						<div>
							<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Title</label>
							<input type="text" name="title" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="Announcement title" />
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Body</label>
							<textarea name="body" rows="4" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="Message content..."></textarea>
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Audience</label>
								<select name="audience" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
									<option value="all">Everyone</option>
									<option value="parents">Parents only</option>
									<option value="students">Students only</option>
									<option value="mentors">Mentors only</option>
								</select>
							</div>
							<div class="space-y-2 pt-5">
								<label class="flex items-center gap-2 text-sm" style="color: var(--app-text-muted);"><input type="checkbox" name="is_pinned" /> Pin to top</label>
								<label class="flex items-center gap-2 text-sm" style="color: {data.emailConfigured ? 'var(--app-text-muted)' : 'var(--app-text-dim)'};"><input type="checkbox" name="send_email" disabled={!data.emailConfigured} /> Send email blast</label>
							</div>
						</div>
						<Button variant="primary" type="submit">Post Announcement</Button>
					</form>
				</GlassCard>
			{/if}

			<div class="space-y-2">
				{#each data.announcements as ann (ann.id)}
					<GlassCard compact>
						{#if editingAnnId === ann.id}
							<form method="POST" action="?/updateAnnouncement" class="space-y-2">
								<input type="hidden" name="id" value={ann.id} />
								<input type="text" name="title" required value={ann.title} class="w-full rounded-lg border px-3 py-2 text-sm font-semibold" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
								<textarea name="body" rows="4" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">{ann.body ?? ''}</textarea>
								<div class="flex items-center gap-3">
									<select name="audience" class="rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
										<option value="all" selected={ann.audience === 'all'}>Everyone</option>
										<option value="parents" selected={ann.audience === 'parents'}>Parents</option>
										<option value="students" selected={ann.audience === 'students'}>Students</option>
										<option value="mentors" selected={ann.audience === 'mentors'}>Mentors</option>
									</select>
									<label class="flex items-center gap-1 text-xs" style="color: var(--app-text-muted);"><input type="checkbox" name="is_pinned" checked={ann.is_pinned} /> Pinned</label>
									<Button variant="primary" size="sm" type="submit">Save</Button>
									<Button variant="ghost" size="sm" onclick={() => { editingAnnId = ''; }}>Cancel</Button>
								</div>
								{#if ann.emailed_at}<p class="text-[10px]" style="color: var(--app-text-dim);">Already emailed to {ann.email_count} recipients on {new Date(ann.emailed_at).toLocaleDateString()}. Editing won't re-send.</p>{/if}
							</form>
						{:else}
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="text-sm font-semibold" style="color: var(--app-text);">{ann.title}</p>
										{#if ann.is_pinned}<span class="rounded px-1 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">pinned</span>{/if}
										<span class="rounded px-1 text-[10px]" style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-accent);">{ann.audience}</span>
									</div>
									{#if ann.body}<p class="mt-0.5 text-xs whitespace-pre-wrap" style="color: var(--app-text-muted);">{ann.body.slice(0, 200)}{ann.body.length > 200 ? '...' : ''}</p>{/if}
									<p class="mt-1 text-[10px]" style="color: var(--app-text-dim);">
										{ann.author?.full_name ?? ''} · {new Date(ann.created_at).toLocaleDateString()}
										{#if ann.emailed_at} · Emailed to {ann.email_count}{/if}
									</p>
								</div>
								<div class="flex items-center gap-1.5 shrink-0">
									<Button variant="ghost" size="sm" onclick={() => { editingAnnId = ann.id; }}>Edit</Button>
									<form method="POST" action="?/deleteAnnouncement" onsubmit={(e) => { if (!confirm('Delete this announcement?')) e.preventDefault(); }}>
										<input type="hidden" name="id" value={ann.id} />
										<Button variant="danger" size="sm" type="submit">Delete</Button>
									</form>
								</div>
							</div>
						{/if}
					</GlassCard>
				{/each}
			</div>

		<!-- ═══════════ GAPS ═══════════ -->
		{:else if activeTab === 'gaps'}
			{#if gapCount === 0}
				<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">All opportunities are fully staffed.</p></GlassCard>
			{:else}
				<p class="text-xs" style="color: var(--app-text-dim);">{gapCount} need more volunteers</p>
				<div class="space-y-2">
					{#each data.gapsReport as gap (gap.opportunity.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{gap.opportunity.title}</p>
									<p class="text-xs" style="color: var(--app-text-dim);">{gap.categoryName} · {fmtDate(gap.opportunity.event_date)}{gap.opportunity.event ? ` · ${gap.opportunity.event.title}` : ''}</p>
								</div>
								<div class="text-right">
									<p class="text-sm font-semibold" style="color: var(--app-danger);">{gap.needed} needed</p>
									<p class="text-xs" style="color: var(--app-text-dim);">{gap.filled}/{gap.opportunity.slots}</p>
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════ FAMILIES ═══════════ -->
		{:else if activeTab === 'families'}
			{#if (data.commitmentStats ?? []).length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Leaderboard</h2>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead><tr class="border-b" style="border-color: var(--app-glass-border);"><th class="py-2 pr-3 text-left text-xs font-medium" style="color: var(--app-text-muted);">Family</th><th class="px-3 py-2 text-center text-xs" style="color: var(--app-text-muted);">Pledged</th><th class="px-3 py-2 text-center text-xs" style="color: var(--app-text-muted);">Met</th></tr></thead>
						<tbody>
							{#each data.commitmentStats.sort((a, b) => b.verifiedCount - a.verifiedCount) as stat (stat.familyId)}
								<tr class="border-b" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"><td class="py-2 pr-3" style="color: var(--app-text);">{stat.familyName}</td><td class="px-3 py-2 text-center" style="color: var(--app-text-muted);">{stat.pledgedCount}</td><td class="px-3 py-2 text-center" style="color: {stat.verifiedCount >= 3 ? 'var(--app-success)' : 'var(--app-text)'};">{stat.verifiedCount}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">All Families ({(data.families ?? []).length})</h2>
			<div class="space-y-2">
				{#each data.families as fam (fam.id)}
					<GlassCard compact>
						<p class="text-sm font-medium" style="color: var(--app-text);">{fam.name}</p>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each (fam as any).family_members ?? [] as member}
								<span class="rounded-full px-2 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, {member.role === 'parent' ? 'var(--app-accent)' : 'var(--app-info)'} 15%, transparent); color: {member.role === 'parent' ? 'var(--app-accent)' : 'var(--app-info)'};">{member.profile?.full_name ?? member.profile?.email ?? '?'} ({member.role})</span>
							{/each}
						</div>
					</GlassCard>
				{/each}
			</div>

		<!-- ═══════════ CATEGORIES ═══════════ -->
		{:else if activeTab === 'categories'}
			<p class="text-xs" style="color: var(--app-text-dim);">Configure targets and active status for volunteer categories</p>
			<div class="space-y-2">
				{#each data.categories as cat (cat.id)}
					<GlassCard compact>
						<form method="POST" action="?/updateCategory" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<input type="hidden" name="id" value={cat.id} />
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium" style="color: var(--app-text);">{cat.name}</p>
								<p class="text-xs" style="color: var(--app-text-dim);">{cat.description}</p>
								{#if cat.requires_prereq}<p class="text-xs" style="color: var(--app-warning);">{cat.requires_prereq}</p>{/if}
							</div>
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1">
									<label class="text-xs" style="color: var(--app-text-muted);">Target:</label>
									<input type="number" name="target_value" value={cat.target_value} min="0" step="0.5" class="w-16 rounded-lg border px-2 py-1 text-xs text-center" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
									<span class="text-xs" style="color: var(--app-text-dim);">{cat.unit}</span>
								</div>
								<label class="flex items-center gap-1 text-xs" style="color: var(--app-text-muted);"><input type="checkbox" name="is_active" value="on" checked={cat.is_active} /> Active</label>
								<Button variant="secondary" size="sm" type="submit">Save</Button>
							</div>
						</form>
					</GlassCard>
				{/each}
			</div>
		{/if}
	{/if}
</section>
