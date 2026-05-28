<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let activeTab = $state<'events' | 'verify' | 'gaps' | 'families' | 'categories'>('events');
	let showCreateEvent = $state(false);
	let editingEventId = $state('');
	let editingOppId = $state('');
	let rejectingId = $state('');
	let rejectReason = $state('');

	const pendingCount = $derived((data.pendingVerifications ?? []).length);
	const gapCount = $derived((data.gapsReport ?? []).length);

	const fmtDate = (d: string | null) => {
		if (!d) return '';
		const dt = new Date(d + 'T00:00:00');
		// Don't let `new Date("…junk…")` leak its literal "Invalid Date"
		// string into the UI — fall back to an em dash so the row reads as
		// "no date set" instead of broken.
		if (Number.isNaN(dt.getTime())) return '—';
		return dt.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	};
	const fmtDateRange = (start: string | null, end: string | null) => {
		const a = fmtDate(start);
		const b = fmtDate(end);
		if (!a && !b) return 'Date not set';
		if (a && b && a !== b) return `${a} – ${b}`;
		return a || b;
	};
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

	// Slot fill color helper
	function slotColor(filled: number, total: number): string {
		const ratio = total > 0 ? filled / total : 0;
		if (ratio >= 1) return 'var(--app-danger)';
		if (ratio >= 0.75) return 'var(--app-warning)';
		return 'var(--app-success)';
	}

	// Date proximity accent for event cards
	function eventAccentColor(startDate: string | null): string {
		if (!startDate) return 'var(--app-text-dim)';
		const t = new Date(startDate + 'T00:00:00').getTime();
		if (Number.isNaN(t)) return 'var(--app-text-dim)';
		const days = Math.ceil((t - Date.now()) / 86400000);
		if (days < 0) return 'var(--app-text-dim)';
		if (days <= 7) return 'var(--app-danger)';
		if (days <= 21) return 'var(--app-warning)';
		return 'var(--app-accent)';
	}

	const tabs = [
		{ key: 'events', label: 'Events', icon: '📅' },
		{ key: 'verify', label: 'Verify', badge: pendingCount, icon: '✓' },
		{ key: 'gaps', label: 'Gaps', badge: gapCount, icon: '⚠' },
		{ key: 'families', label: 'Families', icon: '👨‍👩‍👧' },
		{ key: 'categories', label: 'Categories', icon: '🏷' }
	];
</script>

<section class="space-y-6">
	<!-- ── Header ── -->
	<header class="fade-up flex items-end justify-between gap-4">
		<div>
			<p class="eyebrow-label mb-1">Admin · Volunteer Hub</p>
			<h1 class="text-2xl font-bold tracking-tight">
				<span class="gradient-text">Volunteer Management</span>
			</h1>
			{#if data.season}
				<p class="mt-1 text-xs tracking-wider uppercase" style="color: var(--app-text-dim);">
					Season · <span class="mono" style="color: var(--app-text-muted);">{data.season.label}</span>
				</p>
			{/if}
		</div>
		{#if data.season}
			<div class="flex shrink-0 gap-2">
				<div
					class="rounded-xl border px-3 py-2 text-center"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
				>
					<p class="text-lg font-bold tabular-nums" style="color: var(--app-accent);">
						{(data.events ?? []).length}
					</p>
					<p class="text-[10px] tracking-wide uppercase" style="color: var(--app-text-dim);">
						Events
					</p>
				</div>
				<div
					class="rounded-xl border px-3 py-2 text-center"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
				>
					<p
						class="text-lg font-bold tabular-nums"
						style="color: {pendingCount > 0 ? 'var(--app-warning)' : 'var(--app-success)'};"
					>
						{pendingCount}
					</p>
					<p class="text-[10px] tracking-wide uppercase" style="color: var(--app-text-dim);">
						Pending
					</p>
				</div>
				<div
					class="rounded-xl border px-3 py-2 text-center"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
				>
					<p
						class="text-lg font-bold tabular-nums"
						style="color: {gapCount > 0 ? 'var(--app-danger)' : 'var(--app-success)'};"
					>
						{gapCount}
					</p>
					<p class="text-[10px] tracking-wide uppercase" style="color: var(--app-text-dim);">
						Gaps
					</p>
				</div>
			</div>
		{/if}
	</header>

	<!-- ── Toast messages ── -->
	{#if form?.error}
		<div
			class="fade-up flex items-center gap-3 rounded-xl border p-3"
			style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 8%, transparent);"
		>
			<span style="color: var(--app-danger);">✕</span>
			<p class="text-sm" style="color: color-mix(in srgb, var(--app-danger) 85%, white);">
				{form.error}
			</p>
		</div>
	{:else if form?.ok}
		<div
			class="fade-up flex items-center gap-3 rounded-xl border p-3"
			style="border-color: color-mix(in srgb, var(--app-success) 40%, transparent); background: color-mix(in srgb, var(--app-success) 8%, transparent);"
		>
			<span style="color: var(--app-success);">✓</span>
			<p class="text-sm" style="color: color-mix(in srgb, var(--app-success) 85%, white);">
				Saved successfully.
			</p>
		</div>
	{/if}

	{#if !data.season}
		<GlassCard>
			<div class="flex items-center gap-3 py-2">
				<span class="text-2xl">🗓</span>
				<p class="text-sm" style="color: var(--app-text-muted);">
					No active season. Create one in
					<a href="/admin/lettering" class="underline" style="color: var(--app-accent);"
						>Lettering</a
					> first.
				</p>
			</div>
		</GlassCard>
	{:else}
		<!-- ── Tab pill bar ── -->
		<div
			class="fade-up flex gap-1.5 overflow-x-auto rounded-2xl border p-1.5"
			style="background: color-mix(in srgb, var(--app-surface) 70%, transparent); border-color: var(--app-glass-border); backdrop-filter: blur(12px);"
		>
			{#each tabs as tab (tab.key)}
				{@const isActive = activeTab === tab.key}
				<button
					type="button"
					onclick={() => {
						activeTab = tab.key as any;
					}}
					class="relative shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200"
					style={isActive
						? 'background: var(--aurora); color: white; box-shadow: 0 4px 16px -4px color-mix(in srgb, var(--app-accent) 50%, transparent);'
						: 'color: var(--app-text-muted);'}
				>
					{tab.label}
					{#if tab.badge && tab.badge > 0}
						<span
							class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
							style="background: {isActive
								? 'rgba(255,255,255,0.3)'
								: 'var(--app-danger)'}; color: white;">{tab.badge}</span
						>
					{/if}
				</button>
			{/each}
		</div>

		<!-- ═══════════════════════════════════════════════════════
		     EVENTS TAB
		     ═══════════════════════════════════════════════════════ -->
		{#if activeTab === 'events'}
			<div class="fade-up flex items-center justify-between">
				<p class="text-xs" style="color: var(--app-text-dim);">
					{(data.events ?? []).length} event{(data.events ?? []).length !== 1 ? 's' : ''} this season
				</p>
				<Button
					variant="primary"
					size="sm"
					onclick={() => {
						showCreateEvent = !showCreateEvent;
					}}
				>
					{showCreateEvent ? '✕ Cancel' : '+ New Event'}
				</Button>
			</div>

			<!-- Create Event panel -->
			{#if showCreateEvent}
				<div class="fade-up aurora-border">
					<div class="space-y-4 rounded-[17px] p-5" style="background: var(--app-surface);">
						<div>
							<h3 class="text-sm font-semibold" style="color: var(--app-text);">Create Event</h3>
							<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
								Each checked category creates a volunteer signup section parents can claim.
							</p>
						</div>
						<form method="POST" action="?/createEvent" class="space-y-4">
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label class="field-label">Title</label>
									<input
										type="text"
										name="title"
										required
										class="field-input"
										placeholder="e.g. GRITS Regional"
									/>
								</div>
								<div>
									<label class="field-label">Location</label>
									<input
										type="text"
										name="location"
										class="field-input"
										placeholder="Venue / city"
									/>
								</div>
							</div>
							<div class="grid gap-3 sm:grid-cols-2">
								<div>
									<label class="field-label">Start Date</label>
									<input type="date" name="start_date" required class="field-input" />
								</div>
								<div>
									<label class="field-label">End Date</label>
									<input type="date" name="end_date" class="field-input" />
								</div>
							</div>
							<div>
								<label class="field-label">Description</label>
								<textarea
									name="description"
									rows="2"
									class="field-input"
									placeholder="Details parents need to know..."
								></textarea>
							</div>
							<div>
								<p class="field-label mb-2">Volunteer categories needed</p>
								<div class="grid gap-2 sm:grid-cols-2">
									{#each data.categories as cat (cat.id)}
										<label class="cat-checkbox-row">
											<div class="flex min-w-0 items-center gap-2.5">
												<input
													type="checkbox"
													name="category_ids"
													value={cat.id}
													class="accent-purple-500"
												/>
												<span class="truncate text-sm" style="color: var(--app-text);"
													>{cat.name}</span
												>
											</div>
											<div class="flex shrink-0 items-center gap-1.5">
												<span class="text-[10px]" style="color: var(--app-text-dim);">slots</span>
												<input
													type="number"
													name={`slots_${cat.id}`}
													value="4"
													min="1"
													class="w-14 rounded-lg border px-1.5 py-1 text-center text-xs"
													style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
												/>
											</div>
										</label>
									{/each}
								</div>
							</div>
							<div class="flex gap-2">
								<Button variant="primary" type="submit">Create Event</Button>
								<Button
									variant="ghost"
									onclick={() => {
										showCreateEvent = false;
									}}>Cancel</Button
								>
							</div>
						</form>
					</div>
				</div>
			{/if}

			<!-- Events list -->
			<div class="space-y-4">
				{#each data.events as evt (evt.id)}
					{@const evtOpps = (data.opportunities ?? []).filter((o) => o.event_id === evt.id)}
					{@const activeCatIds = activeCategoriesByEvent().get(evt.id) ?? new Set()}
					{@const accentColor = eventAccentColor(evt.start_date)}

					<div
						class="fade-up event-card overflow-hidden rounded-2xl border"
						style="border-color: var(--app-glass-border); background: var(--app-glass-bg); backdrop-filter: blur(20px);"
					>
						<!-- Colored left accent bar -->
						<div
							class="absolute top-0 bottom-0 left-0 w-1 rounded-l-2xl"
							style="background: {accentColor};"
						></div>

						{#if editingEventId === evt.id}
							<div class="p-5 pl-6">
								<form method="POST" action="?/updateEvent" class="space-y-4">
									<input type="hidden" name="id" value={evt.id} />
									<div class="grid gap-3 sm:grid-cols-2">
										<div>
											<label class="field-label">Title</label>
											<input
												type="text"
												name="title"
												required
												value={evt.title}
												class="field-input"
											/>
										</div>
										<div>
											<label class="field-label">Location</label>
											<input
												type="text"
												name="location"
												value={evt.location ?? ''}
												class="field-input"
											/>
										</div>
									</div>
									<div class="grid gap-3 sm:grid-cols-2">
										<div>
											<label class="field-label">Start Date</label>
											<input
												type="date"
												name="start_date"
												required
												value={evt.start_date}
												class="field-input"
											/>
										</div>
										<div>
											<label class="field-label">End Date</label>
											<input
												type="date"
												name="end_date"
												value={evt.end_date ?? ''}
												class="field-input"
											/>
										</div>
									</div>
									<div>
										<label class="field-label">Description</label>
										<textarea name="description" rows="2" class="field-input"
											>{evt.description ?? ''}</textarea
										>
									</div>
									<div>
										<p class="field-label mb-2">Volunteer categories needed</p>
										<div class="grid gap-2 sm:grid-cols-2">
											{#each data.categories as cat (cat.id)}
												{@const existingOpp = evtOpps.find((o) => o.category_id === cat.id)}
												<label class="cat-checkbox-row">
													<div class="flex min-w-0 items-center gap-2.5">
														<input
															type="checkbox"
															name="category_ids"
															value={cat.id}
															checked={activeCatIds.has(cat.id)}
															class="accent-purple-500"
														/>
														<span class="truncate text-sm" style="color: var(--app-text);"
															>{cat.name}</span
														>
													</div>
													<div class="flex shrink-0 items-center gap-1.5">
														<span class="text-[10px]" style="color: var(--app-text-dim);"
															>slots</span
														>
														<input
															type="number"
															name={`slots_${cat.id}`}
															value={existingOpp?.slots ?? 4}
															min="1"
															class="w-14 rounded-lg border px-1.5 py-1 text-center text-xs"
															style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
														/>
													</div>
												</label>
											{/each}
										</div>
									</div>
									<div class="flex gap-2">
										<Button variant="primary" type="submit">Save Changes</Button>
										<Button
											variant="ghost"
											onclick={() => {
												editingEventId = '';
											}}>Cancel</Button
										>
									</div>
								</form>
							</div>
						{:else}
							<!-- Event view mode -->
							<div class="p-5 pl-6">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<h3 class="text-base leading-tight font-bold" style="color: var(--app-text);">
											{evt.title}
										</h3>
										<div class="mt-1 flex flex-wrap items-center gap-2">
											<span
												class="flex items-center gap-1 text-xs"
												style="color: var(--app-text-muted);"
											>
												<span style="color: {accentColor};">●</span>
												{fmtDateRange(evt.start_date, evt.end_date)}
											</span>
											{#if evt.location}
												<span class="text-xs" style="color: var(--app-text-dim);"
													>· {evt.location}</span
												>
											{/if}
										</div>
										{#if evt.description}
											<p
												class="mt-1.5 text-xs leading-relaxed"
												style="color: var(--app-text-muted);"
											>
												{evt.description}
											</p>
										{/if}
									</div>
									<div class="flex shrink-0 items-center gap-1.5">
										<Button
											variant="ghost"
											size="sm"
											onclick={() => {
												editingEventId = evt.id;
											}}>Edit</Button
										>
										<form
											method="POST"
											action="?/deleteEvent"
											onsubmit={(e) => {
												if (!confirm('Delete this event and all its opportunities?'))
													e.preventDefault();
											}}
										>
											<input type="hidden" name="id" value={evt.id} />
											<Button variant="danger" size="sm" type="submit">Delete</Button>
										</form>
									</div>
								</div>

								<!-- Opportunity table -->
								{#if evtOpps.length > 0}
									<div
										class="mt-4 overflow-hidden rounded-xl border"
										style="border-color: color-mix(in srgb, var(--app-glass-border) 70%, transparent);"
									>
										<table class="w-full text-xs">
											<thead>
												<tr style="background: var(--app-table-header-bg);">
													<th
														class="px-3 py-2 text-left text-[10px] font-semibold tracking-wide uppercase"
														style="color: var(--app-text-dim);">Category</th
													>
													<th
														class="px-3 py-2 text-left text-[10px] font-semibold tracking-wide uppercase"
														style="color: var(--app-text-dim);">Role</th
													>
													<th
														class="px-3 py-2 text-left text-[10px] font-semibold tracking-wide uppercase"
														style="color: var(--app-text-dim);">Date</th
													>
													<th
														class="px-3 py-2 text-left text-[10px] font-semibold tracking-wide uppercase"
														style="color: var(--app-text-dim);">Time</th
													>
													<th
														class="px-3 py-2 text-center text-[10px] font-semibold tracking-wide uppercase"
														style="color: var(--app-text-dim);">Slots</th
													>
													<th class="px-3 py-2"></th>
												</tr>
											</thead>
											<tbody>
												{#each evtOpps as opp (opp.id)}
													{@const slotColor_ = slotColor(opp.currentSignups ?? 0, opp.slots ?? 1)}
													{#if editingOppId === opp.id}
														<tr>
															<td
																colspan="6"
																class="p-3"
																style="background: color-mix(in srgb, var(--app-surface) 80%, transparent);"
															>
																<form method="POST" action="?/updateOpportunity" class="space-y-2">
																	<input type="hidden" name="id" value={opp.id} />
																	<div class="grid gap-2 sm:grid-cols-3">
																		<input
																			type="text"
																			name="title"
																			value={opp.title}
																			placeholder="Title"
																			class="field-input text-xs"
																		/>
																		<input
																			type="date"
																			name="event_date"
																			value={opp.event_date}
																			class="field-input text-xs"
																		/>
																		<input
																			type="number"
																			name="slots"
																			value={opp.slots}
																			min="1"
																			placeholder="Slots"
																			class="field-input text-xs"
																		/>
																	</div>
																	<div class="grid gap-2 sm:grid-cols-3">
																		<input
																			type="time"
																			name="start_time"
																			value={opp.start_time ?? ''}
																			class="field-input text-xs"
																		/>
																		<input
																			type="time"
																			name="end_time"
																			value={opp.end_time ?? ''}
																			class="field-input text-xs"
																		/>
																		<input
																			type="text"
																			name="location"
																			value={opp.location ?? ''}
																			placeholder="Location"
																			class="field-input text-xs"
																		/>
																	</div>
																	<textarea
																		name="description"
																		rows="2"
																		placeholder="Description / notes for parents"
																		class="field-input w-full text-xs"
																		>{opp.description ?? ''}</textarea
																	>
																	<div class="flex gap-2">
																		<Button variant="primary" size="sm" type="submit">Save</Button>
																		<Button
																			variant="ghost"
																			size="sm"
																			onclick={() => {
																				editingOppId = '';
																			}}>Cancel</Button
																		>
																	</div>
																</form>
															</td>
														</tr>
													{:else}
														<tr
															class="opp-row border-t"
															style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
														>
															<td class="px-3 py-2.5">
																{#if opp.category}
																	<span
																		class="chip-violet inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium"
																		>{opp.category.name}</span
																	>
																{/if}
															</td>
															<td class="px-3 py-2.5">
																<span
																	style="color: var(--app-text);"
																	class={opp.is_active ? '' : 'opacity-40'}>{opp.title}</span
																>
																{#if !opp.is_active}<span
																		class="ml-1 rounded px-1 text-[10px]"
																		style="background: color-mix(in srgb, var(--app-text-dim) 15%, transparent); color: var(--app-text-dim);"
																		>inactive</span
																	>{/if}
															</td>
															<td class="px-3 py-2.5" style="color: var(--app-text-muted);"
																>{fmtDate(opp.event_date)}</td
															>
															<td class="px-3 py-2.5" style="color: var(--app-text-muted);">
																{#if opp.start_time}{fmtTime(opp.start_time)}{#if opp.end_time}
																		– {fmtTime(opp.end_time)}{/if}{:else}—{/if}
															</td>
															<td class="px-3 py-2.5 text-center">
																<span
																	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums"
																	style="color: {slotColor_}; background: color-mix(in srgb, {slotColor_} 12%, transparent); border-color: color-mix(in srgb, {slotColor_} 30%, transparent);"
																>
																	{opp.currentSignups ?? 0}/{opp.slots}
																</span>
															</td>
															<td class="px-3 py-2.5 text-right">
																<Button
																	variant="ghost"
																	size="sm"
																	onclick={() => {
																		editingOppId = opp.id;
																	}}>Edit</Button
																>
															</td>
														</tr>
													{/if}
												{/each}
											</tbody>
										</table>
									</div>
								{:else}
									<p class="mt-3 text-xs" style="color: var(--app-text-dim);">
										No categories selected yet — click Edit to add some.
									</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- ═══════════════════════════════════════════════════════
		     VERIFY TAB
		     ═══════════════════════════════════════════════════════ -->
		{:else if activeTab === 'verify'}
			<div class="fade-up space-y-4">
				{#if pendingCount === 0}
					<div
						class="rounded-2xl border p-8 text-center"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					>
						<div class="mb-2 text-3xl">✓</div>
						<p class="text-sm font-medium" style="color: var(--app-text-muted);">
							All caught up — no pending verifications.
						</p>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<p class="text-xs" style="color: var(--app-text-dim);">
							<span class="font-semibold" style="color: var(--app-warning);">{pendingCount}</span>
							pending verification{pendingCount !== 1 ? 's' : ''}
						</p>
					</div>

					<div class="space-y-3">
						{#each data.pendingVerifications as log (log.id)}
							<div
								class="fade-up overflow-hidden rounded-2xl border"
								style="background: var(--app-glass-bg); border-color: var(--app-glass-border); backdrop-filter: blur(20px);"
							>
								<div
									class="flex items-center justify-between gap-3 border-b px-5 py-3"
									style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent); background: color-mix(in srgb, var(--app-table-header-bg) 60%, transparent);"
								>
									<div class="flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
											style="background: color-mix(in srgb, var(--app-accent) 20%, transparent); color: var(--app-accent);"
										>
											{((log.family as any)?.name ?? '?')[0]}
										</div>
										<div>
											<p class="text-sm font-bold" style="color: var(--app-text);">
												{(log.family as any)?.name}
											</p>
											<p class="text-xs" style="color: var(--app-text-dim);">
												{(log.reporter as any)?.full_name ?? (log.reporter as any)?.email}
											</p>
										</div>
									</div>
									{#if log.is_approval_needed}
										<span
											class="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-warning); border-color: color-mix(in srgb, var(--app-warning) 35%, transparent); background: color-mix(in srgb, var(--app-warning) 10%, transparent);"
											>Needs Approval</span
										>
									{:else}
										<span
											class="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-accent); border-color: color-mix(in srgb, var(--app-accent) 35%, transparent); background: color-mix(in srgb, var(--app-accent) 10%, transparent);"
											>Past Event</span
										>
									{/if}
								</div>
								<div class="px-5 py-4">
									<div class="mb-3 flex items-start gap-6">
										<div>
											<p
												class="mb-0.5 text-[10px] tracking-wide uppercase"
												style="color: var(--app-text-dim);"
											>
												Amount
											</p>
											<p class="text-xl font-bold tabular-nums" style="color: var(--app-text);">
												{log.amount}
												<span class="text-sm font-normal" style="color: var(--app-text-muted);"
													>{log.category?.unit ?? 'hrs'}</span
												>
											</p>
										</div>
										<div>
											<p
												class="mb-0.5 text-[10px] tracking-wide uppercase"
												style="color: var(--app-text-dim);"
											>
												Category
											</p>
											<p class="text-sm font-semibold" style="color: var(--app-accent);">
												{log.category?.name}
											</p>
										</div>
										<div>
											<p
												class="mb-0.5 text-[10px] tracking-wide uppercase"
												style="color: var(--app-text-dim);"
											>
												Date
											</p>
											<p class="text-sm" style="color: var(--app-text-muted);">
												{fmtDate(log.activity_date)}
											</p>
										</div>
									</div>
									{#if log.description}
										<p
											class="mb-3 rounded-lg p-2.5 text-xs italic"
											style="color: var(--app-text-muted); background: color-mix(in srgb, var(--app-surface) 60%, transparent);"
										>
											"{log.description}"
										</p>
									{/if}
									<div class="flex items-center gap-2">
										{#if rejectingId === log.id}
											<form
												method="POST"
												action="?/verifyHours"
												class="flex flex-1 items-center gap-2"
											>
												<input type="hidden" name="log_id" value={log.id} />
												<input type="hidden" name="action" value="reject" />
												<input
													type="text"
													name="rejection_reason"
													bind:value={rejectReason}
													placeholder="Reason for decline…"
													class="field-input flex-1 text-xs"
												/>
												<Button variant="danger" size="sm" type="submit">Confirm Decline</Button>
												<Button
													variant="ghost"
													size="sm"
													onclick={() => {
														rejectingId = '';
													}}>Cancel</Button
												>
											</form>
										{:else if log.is_approval_needed}
											<form method="POST" action="?/verifyHours">
												<input type="hidden" name="log_id" value={log.id} />
												<input type="hidden" name="action" value="approve" />
												<Button variant="primary" size="sm" type="submit">✓ Approve Slot</Button>
											</form>
											<Button
												variant="ghost"
												size="sm"
												onclick={() => {
													rejectingId = log.id;
													rejectReason = '';
												}}>Decline Slot</Button
											>
										{:else}
											<form method="POST" action="?/verifyHours">
												<input type="hidden" name="log_id" value={log.id} />
												<input type="hidden" name="action" value="verify" />
												<Button variant="primary" size="sm" type="submit"
													>✓ Verify Attendance</Button
												>
											</form>
											<Button
												variant="ghost"
												size="sm"
												onclick={() => {
													rejectingId = log.id;
													rejectReason = '';
												}}>Mark Absent</Button
											>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ═══════════════════════════════════════════════════════
		     GAPS TAB
		     ═══════════════════════════════════════════════════════ -->
		{:else if activeTab === 'gaps'}
			<div class="fade-up space-y-4">
				{#if gapCount === 0}
					<div
						class="rounded-2xl border p-8 text-center"
						style="background: var(--app-glass-bg); border-color: color-mix(in srgb, var(--app-success) 30%, transparent);"
					>
						<div class="mb-2 text-3xl">✓</div>
						<p class="text-sm font-medium" style="color: var(--app-success);">
							All opportunities are fully staffed!
						</p>
					</div>
				{:else}
					<div class="flex items-center justify-between">
						<p class="text-xs" style="color: var(--app-text-dim);">
							<span class="font-semibold" style="color: var(--app-danger);">{gapCount}</span>
							opportunit{gapCount !== 1 ? 'ies' : 'y'} need more volunteers
						</p>
					</div>

					<div class="space-y-3">
						{#each data.gapsReport as gap (gap.opportunity.id)}
							{@const urgency =
								gap.needed >= 3
									? 'var(--app-danger)'
									: gap.needed === 2
										? 'var(--app-warning)'
										: 'var(--app-info)'}
							<div
								class="fade-up overflow-hidden rounded-2xl border"
								style="background: var(--app-glass-bg); border-color: color-mix(in srgb, {urgency} 35%, var(--app-glass-border) 65%); backdrop-filter: blur(20px);"
							>
								<div
									class="absolute top-0 bottom-0 left-0 w-1"
									style="background: {urgency};"
								></div>
								<div class="flex items-center justify-between gap-4 py-4 pr-5 pl-5">
									<div class="min-w-0 flex-1">
										<p class="text-sm font-semibold" style="color: var(--app-text);">
											{gap.opportunity.title}
										</p>
										<div class="mt-1 flex flex-wrap items-center gap-2">
											<span class="text-xs" style="color: var(--app-text-dim);"
												>{gap.categoryName}</span
											>
											<span class="text-xs" style="color: var(--app-text-dim);">·</span>
											<span class="text-xs" style="color: var(--app-text-dim);"
												>{fmtDate(gap.opportunity.event_date)}</span
											>
											{#if gap.opportunity.event}
												<span class="text-xs" style="color: var(--app-text-dim);">·</span>
												<span class="text-xs" style="color: var(--app-text-muted);"
													>{gap.opportunity.event.title}</span
												>
											{/if}
										</div>
									</div>
									<div class="flex shrink-0 items-center gap-3">
										<div class="text-right">
											<p
												class="text-[10px] tracking-wide uppercase"
												style="color: var(--app-text-dim);"
											>
												Filled
											</p>
											<p class="text-sm tabular-nums" style="color: var(--app-text-muted);">
												{gap.filled}/{gap.opportunity.slots}
											</p>
										</div>
										<div
											class="rounded-xl border px-3 py-1.5 text-center"
											style="border-color: color-mix(in srgb, {urgency} 40%, transparent); background: color-mix(in srgb, {urgency} 12%, transparent);"
										>
											<p
												class="text-base leading-none font-bold tabular-nums"
												style="color: {urgency};"
											>
												{gap.needed}
											</p>
											<p
												class="mt-0.5 text-[9px] tracking-wide uppercase"
												style="color: {urgency};"
											>
												needed
											</p>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ═══════════════════════════════════════════════════════
		     FAMILIES TAB
		     ═══════════════════════════════════════════════════════ -->
		{:else if activeTab === 'families'}
			<div class="fade-up space-y-6">
				{#if (data.commitmentStats ?? []).length > 0}
					<div>
						<div class="mb-3 flex items-center justify-between">
							<h2
								class="text-xs font-semibold tracking-widest uppercase"
								style="color: var(--app-text-dim);"
							>
								Leaderboard
							</h2>
						</div>
						<div
							class="overflow-hidden rounded-2xl border"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
						>
							<table class="w-full">
								<thead>
									<tr style="background: var(--app-table-header-bg);">
										<th
											class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-text-dim);">#</th
										>
										<th
											class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-text-dim);">Family</th
										>
										<th
											class="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-text-dim);">Pledged</th
										>
										<th
											class="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-text-dim);">Completed</th
										>
										<th
											class="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wide uppercase"
											style="color: var(--app-text-dim);">Progress</th
										>
									</tr>
								</thead>
								<tbody>
									{#each data.commitmentStats.sort((a, b) => b.verifiedCount - a.verifiedCount) as stat, i (stat.familyId)}
										{@const pct =
											stat.pledgedCount > 0
												? Math.min(100, (stat.verifiedCount / stat.pledgedCount) * 100)
												: 0}
										<tr
											class="border-t"
											style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
										>
											<td class="px-4 py-3">
												<span
													class="text-xs font-bold tabular-nums"
													style="color: {i === 0
														? '#fbbf24'
														: i === 1
															? '#9ca3af'
															: i === 2
																? '#c97a2a'
																: 'var(--app-text-dim)'};">{i + 1}</span
												>
											</td>
											<td class="px-4 py-3 text-sm font-medium" style="color: var(--app-text);"
												>{stat.familyName}</td
											>
											<td
												class="px-4 py-3 text-center text-sm tabular-nums"
												style="color: var(--app-text-muted);">{stat.pledgedCount}</td
											>
											<td class="px-4 py-3 text-center">
												<span
													class="text-sm font-semibold tabular-nums"
													style="color: {stat.verifiedCount >= 3
														? 'var(--app-success)'
														: 'var(--app-text)'};">{stat.verifiedCount}</span
												>
											</td>
											<td class="px-4 py-3">
												<div class="aurora-progress w-24">
													<div class="aurora-progress-fill" style="width: {pct}%;"></div>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<div>
					<div class="mb-3 flex items-center justify-between">
						<h2
							class="text-xs font-semibold tracking-widest uppercase"
							style="color: var(--app-text-dim);"
						>
							All Families ({(data.families ?? []).length})
						</h2>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each data.families as fam (fam.id)}
							<div
								class="rounded-2xl border p-4"
								style="background: var(--app-glass-bg); border-color: var(--app-glass-border); backdrop-filter: blur(20px);"
							>
								<p class="mb-2 text-sm font-semibold" style="color: var(--app-text);">{fam.name}</p>
								<div class="flex flex-wrap gap-1.5">
									{#each (fam as any).family_members ?? [] as member}
										<span
											class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium"
											class:chip-violet={member.role === 'parent'}
											class:chip-cyan={member.role !== 'parent'}
										>
											{member.profile?.full_name ?? member.profile?.email ?? '?'}
											<span class="ml-1 opacity-60">· {member.role}</span>
										</span>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- ═══════════════════════════════════════════════════════
		     CATEGORIES TAB
		     ═══════════════════════════════════════════════════════ -->
		{:else if activeTab === 'categories'}
			<div class="fade-up space-y-4">
				<p class="text-xs" style="color: var(--app-text-dim);">
					Configure targets and active status for volunteer categories
				</p>
				<div
					class="overflow-hidden rounded-2xl border"
					style="border-color: var(--app-glass-border);"
				>
					{#each data.categories as cat, i (cat.id)}
						<div
							class="border-b px-5 py-4"
							style="background: {i % 2 === 0
								? 'var(--app-glass-bg)'
								: 'color-mix(in srgb, var(--app-surface) 30%, transparent)'}; border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent); backdrop-filter: blur(20px);"
						>
							<form
								method="POST"
								action="?/updateCategory"
								class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<input type="hidden" name="id" value={cat.id} />
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="text-sm font-semibold" style="color: var(--app-text);">{cat.name}</p>
										{#if cat.is_active}
											<span
												class="chip-emerald rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase"
												>Active</span
											>
										{:else}
											<span
												class="rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase"
												style="color: var(--app-text-dim); background: color-mix(in srgb, var(--app-text-dim) 10%, transparent); border-color: color-mix(in srgb, var(--app-text-dim) 25%, transparent);"
												>Inactive</span
											>
										{/if}
									</div>
									{#if cat.description}
										<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">
											{cat.description}
										</p>
									{/if}
									{#if cat.requires_prereq}
										<p class="mt-0.5 text-xs font-medium" style="color: var(--app-warning);">
											Prereq: {cat.requires_prereq}
										</p>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-4">
									<div class="flex items-center gap-2">
										<label class="text-xs" style="color: var(--app-text-muted);">Target</label>
										<input
											type="number"
											name="target_value"
											value={cat.target_value}
											min="0"
											step="0.5"
											class="w-16 rounded-lg border px-2 py-1 text-center text-xs tabular-nums"
											style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
										/>
										<span class="text-xs" style="color: var(--app-text-dim);">{cat.unit}</span>
									</div>
									<label class="flex cursor-pointer items-center gap-2">
										<input
											type="checkbox"
											name="is_active"
											value="on"
											checked={cat.is_active}
											class="accent-purple-500"
										/>
										<span class="text-xs" style="color: var(--app-text-muted);">Active</span>
									</label>
									<Button variant="secondary" size="sm" type="submit">Save</Button>
								</div>
							</form>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</section>

<style>
	/* ── Field helpers ── */
	:global(.field-label) {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--app-text-dim);
	}
	:global(.field-input) {
		width: 100%;
		border-radius: 0.75rem;
		border: 1px solid var(--app-glass-border);
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		background: var(--app-input-bg);
		color: var(--app-input-text);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	:global(.field-input:focus) {
		outline: none;
		border-color: var(--app-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 15%, transparent);
	}

	/* ── Category checkbox row ── */
	.cat-checkbox-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid var(--app-glass-border);
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		background: var(--app-input-bg);
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.cat-checkbox-row:hover {
		border-color: color-mix(in srgb, var(--app-accent) 40%, transparent);
		background: color-mix(in srgb, var(--app-accent) 5%, var(--app-input-bg));
	}

	/* ── Event card left border offset ── */
	.event-card {
		position: relative;
	}

	/* ── Opportunity row hover ── */
	.opp-row {
		transition: background 0.15s ease;
	}
	.opp-row:hover {
		background: color-mix(in srgb, var(--app-table-row-hover) 70%, transparent);
	}
</style>
