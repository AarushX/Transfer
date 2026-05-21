<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let { data, form } = $props();

	// ── Tab state ──────────────────────────────────────────────
	let mainTab = $state<'events' | 'dashboard'>('events');
	let showPledgeForm = $state(false);

	// ── Inline signup expansion: maps opportunity_id -> boolean ─
	let expandedSignup = $state<Record<string, boolean>>({});
	let signupNotes = $state<Record<string, string>>({});

	// ── Commitments ────────────────────────────────────────────
	const commitmentMap = $derived(
		new Map((data.commitments ?? []).map((c: any) => [c.category_id, c]))
	);
	const hasPledge = $derived((data.commitments ?? []).length > 0);
	const yesCount = $derived(
		(data.commitments ?? []).filter((c: any) => c.response === 'yes').length
	);
	const totalSignups = $derived(
		(data.mySignups ?? []).filter((s: any) => s.status !== 'cancelled').length
	);

	// ── Category Progress Calculations ──────────────────────────
	const categoryProgress = $derived.by(() => {
		const categories = data.categories ?? [];
		const commitments = data.commitments ?? [];
		const signups = data.mySignups ?? [];

		const comMap = new Map(commitments.map((c: any) => [c.category_id, c]));

		return categories.map((cat: any) => {
			const pledge = comMap.get(cat.id);
			const response = pledge?.response ?? 'no';
			const notes = pledge?.notes ?? '';
			const target = Number(cat.target_value ?? 0);

			// Filter signups for this category
			const catSignups = signups.filter((s: any) => {
				const opp = (data.opportunities ?? []).find((o: any) => o.id === s.opportunity_id);
				return opp?.category_id === cat.id;
			});

			let verified = 0;
			let confirmed = 0;
			let pending = 0;

			for (const s of catSignups) {
				const opp = (data.opportunities ?? []).find((o: any) => o.id === s.opportunity_id);
				if (!opp) continue;

				// Calculate amount/duration
				let amount = 1;
				if (cat.unit === 'hours') {
					amount = 4; // standard default
					if (opp.start_time && opp.end_time) {
						const [sh, sm] = opp.start_time.split(':').map(Number);
						const [eh, em] = opp.end_time.split(':').map(Number);
						const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
						if (diff > 0) amount = diff;
					}
				}

				if (s.status === 'verified') {
					verified += amount;
				} else if (s.status === 'confirmed') {
					confirmed += amount;
				} else if (s.status === 'pending') {
					pending += amount;
				}
			}

			verified = Math.round(verified * 10) / 10;
			confirmed = Math.round(confirmed * 10) / 10;
			pending = Math.round(pending * 10) / 10;

			let status: 'met' | 'in_progress' | 'unfulfilled' | 'not_pledged' = 'not_pledged';
			if (response === 'yes') {
				if (verified >= target) {
					status = 'met';
				} else if (verified > 0 || confirmed > 0 || pending > 0) {
					status = 'in_progress';
				} else {
					status = 'unfulfilled';
				}
			}

			return {
				id: cat.id,
				name: cat.name,
				unit: cat.unit,
				target,
				response,
				notes,
				verified,
				confirmed,
				pending,
				status
			};
		});
	});

	// ── Events grouped by start_date ───────────────────────────
	const sortedEvents = $derived(
		[...(data.events ?? [])].sort(
			(a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
		)
	);

	// ── Helper functions ───────────────────────────────────────
	const fmtDate = (d: string | null) =>
		d
			? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				})
			: '';

	const fmtDateShort = (d: string | null) =>
		d
			? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				})
			: '';

	const fmtDateDay = (d: string | null) =>
		d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : '';

	const fmtDateNum = (d: string | null) =>
		d ? new Date(d + 'T00:00:00').getDate().toString() : '';

	const fmtMonth = (d: string | null) =>
		d
			? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
					month: 'short'
				})
			: '';

	const fmtTime = (t: string | null) => {
		if (!t) return '';
		const [h, m] = t.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
	};

	const pct = (v: number, t: number) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);

	// Opportunities for each event, grouped by category
	const oppsForEvent = (eventId: string) =>
		(data.opportunities ?? []).filter((o: any) => o.event_id === eventId);

	const categoriesForEvent = (eventId: string) => {
		const opps = oppsForEvent(eventId);
		const slugs = [...new Set(opps.map((o: any) => o.category?.slug).filter(Boolean))];
		return (data.categories ?? []).filter((c: any) => slugs.includes(c.slug));
	};

	// Get initials from name
	const initials = (name: string) =>
		name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();

	// Avatar color based on name hash
	const avatarHue = (name: string) => {
		let h = 0;
		for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
		return h % 360;
	};

	function toggleSignup(oppId: string) {
		expandedSignup = { ...expandedSignup, [oppId]: !expandedSignup[oppId] };
	}
</script>

<section class="space-y-5">
	<!-- ══════════════ HEADER ══════════════ -->
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Portal</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">Volunteer Center</span>
		</h1>
		{#if data.season}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
				{data.season.label}
				{#if data.family?.name}
					· <span style="color: var(--app-text-dim);">{data.family.name}</span>
				{/if}
			</p>
		{/if}
	</header>

	<!-- ══════════════ FLASH MESSAGES ══════════════ -->
	{#if form?.error}
		<div
			class="fade-up flex items-center gap-2 rounded-xl border p-3 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 8%, transparent); color: color-mix(in srgb, var(--app-danger) 90%, white);"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				style="flex-shrink:0; color: var(--app-danger);"
			>
				<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
				<path d="M8 5v3.5M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			</svg>
			{form.error}
		</div>
	{:else if form?.ok}
		<div
			class="fade-up flex items-center gap-2 rounded-xl border p-3 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 8%, transparent); color: color-mix(in srgb, var(--app-success) 90%, white);"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				style="flex-shrink:0; color: var(--app-success);"
			>
				<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
				<path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			{#if form.section === 'pledge'}Pledge saved successfully.
			{:else if form.section === 'signup'}You're signed up!
			{:else if form.section === 'cancel'}Signup cancelled.
			{:else if form.section === 'hours'}Hours logged.
			{:else}Done.{/if}
		</div>
	{/if}

	<!-- ══════════════ EMPTY STATES ══════════════ -->
	{#if !data.season}
		<GlassCard>
			<div class="py-8 text-center">
				<div class="mb-3 text-3xl opacity-40">📅</div>
				<p class="text-sm" style="color: var(--app-text-muted);">No active season configured.</p>
			</div>
		</GlassCard>
	{:else if !data.family}
		<GlassCard>
			<div class="py-8 text-center">
				<div class="mb-3 text-3xl opacity-40">👨‍👩‍👧</div>
				<p class="text-sm" style="color: var(--app-text-muted);">
					Link a student from the
					<a href="/parent/dashboard" class="underline" style="color: var(--app-accent);"
						>Dashboard</a
					> first.
				</p>
			</div>
		</GlassCard>
	{:else}
		<!-- ══════════════ TAB BAR ══════════════ -->
		<div
			class="fade-up flex gap-1 rounded-xl border p-1"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
		>
			{#each [{ key: 'events', label: 'Events & Signups', icon: 'M3 7h10M3 12h7M13 9l3 3-3 3' }, { key: 'dashboard', label: 'My Dashboard', icon: 'M2 3h12v4H2zM2 10h5v5H2zM9 10h5v5H2' }] as tab (tab.key)}
				<button
					type="button"
					onclick={() => {
						mainTab = tab.key as any;
					}}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
					style={mainTab === tab.key
						? 'background: color-mix(in srgb, var(--app-accent) 16%, transparent); color: var(--app-text);'
						: 'color: var(--app-text-muted);'}
				>
					{tab.label}
					{#if tab.key === 'events' && totalSignups > 0}
						<span
							class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
							style="background: var(--app-accent); color: white; min-width: 18px; text-align: center;"
							>{totalSignups}</span
						>
					{/if}
				</button>
			{/each}
		</div>

		<!-- ╔══════════════════════════════════════════╗ -->
		<!-- ║              EVENTS VIEW                 ║ -->
		<!-- ╚══════════════════════════════════════════╝ -->
		{#if mainTab === 'events'}
			{#if sortedEvents.length === 0}
				<GlassCard>
					<div class="py-10 text-center">
						<div
							class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
							style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--app-accent) 20%, transparent);"
						>
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								style="color: var(--app-accent);"
							>
								<rect
									x="3"
									y="4"
									width="18"
									height="18"
									rx="3"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<path
									d="M3 9h18M8 2v4M16 2v4"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium" style="color: var(--app-text-muted);">
							No events posted yet.
						</p>
						<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
							Check back soon for volunteer opportunities.
						</p>
					</div>
				</GlassCard>
			{:else}
				<div class="space-y-5">
					{#each sortedEvents as evt (evt.id)}
						{@const evtOpps = oppsForEvent(evt.id)}
						{@const evtCats = categoriesForEvent(evt.id)}
						{@const totalSlots = evtOpps.reduce((s: number, o: any) => s + (o.slots ?? 0), 0)}
						{@const filledSlots = evtOpps.reduce(
							(s: number, o: any) => s + (o.currentSignups ?? (o.signups ?? []).length),
							0
						)}
						{@const mySignupsHere = evtOpps.filter((o: any) => o.myFamily).length}

						<!-- Event card -->
						<div class="fade-up">
							<!-- Event header strip -->
							<div
								class="flex items-start gap-4 rounded-t-2xl border-x border-t px-4 py-4"
								style="background: color-mix(in srgb, var(--app-surface) 70%, transparent); border-color: var(--app-glass-border);"
							>
								<!-- Date badge -->
								<div
									class="flex w-12 shrink-0 flex-col items-center rounded-xl py-2 text-center"
									style="background: color-mix(in srgb, var(--app-accent) 14%, transparent); border: 1px solid color-mix(in srgb, var(--app-accent) 22%, transparent);"
								>
									<span class="text-[10px] font-bold uppercase tracking-widest" style="color: var(--app-accent);">{fmtMonth(evt.start_date)}</span>
									<span class="text-xl font-bold leading-tight" style="color: var(--app-text);">{fmtDateNum(evt.start_date)}</span>
									<span class="text-[9px] uppercase tracking-wide" style="color: var(--app-text-dim);">{fmtDateDay(evt.start_date)}</span>
								</div>

								<!-- Title & meta -->
								<div class="min-w-0 flex-1">
									<h2 class="text-base font-bold leading-tight" style="color: var(--app-text);">
										{evt.title}
									</h2>
									<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
										{fmtDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date
											? ` – ${fmtDateShort(evt.end_date)}`
											: ''}
										{#if evt.location}
											<span style="color: var(--app-text-dim);">· {evt.location}</span>
										{/if}
									</p>
									{#if evt.description}
										<p class="mt-1 text-xs" style="color: var(--app-text-dim);">{evt.description}</p>
									{/if}
								</div>

								<!-- Right summary -->
								<div class="flex shrink-0 flex-col items-end gap-1.5">
									{#if mySignupsHere > 0}
										<span
											class="rounded-full px-2.5 py-1 text-xs font-semibold"
											style="background: color-mix(in srgb, var(--app-success) 14%, transparent); color: var(--app-success); border: 1px solid color-mix(in srgb, var(--app-success) 25%, transparent);"
										>
											{mySignupsHere} signed up
										</span>
									{/if}
									<span class="text-xs" style="color: var(--app-text-dim);">
										{filledSlots}/{totalSlots} slots
									</span>
								</div>
							</div>

							<!-- Overall progress bar -->
							{#if totalSlots > 0}
								<div
									class="border-x px-4 py-2"
									style="background: color-mix(in srgb, var(--app-surface) 40%, transparent); border-color: var(--app-glass-border);"
								>
									<div class="aurora-progress">
										<div
											class="aurora-progress-fill"
											style="width: {pct(filledSlots, totalSlots)}%;"
										></div>
									</div>
									<p class="mt-1 text-[10px]" style="color: var(--app-text-dim);">
										{pct(filledSlots, totalSlots)}% filled across {evtOpps.length} opportunity{evtOpps.length !== 1 ? 'ies' : 'y'}
									</p>
								</div>
							{/if}

							{#if evtOpps.length === 0}
								<!-- No opportunities -->
								<div
									class="rounded-b-2xl border-x border-b px-4 py-6 text-center"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
								>
									<p class="text-xs" style="color: var(--app-text-dim);">
										No volunteer slots posted for this event yet.
									</p>
								</div>
							{:else}
								<!-- Category sections inside event -->
								<div
									class="rounded-b-2xl border-x border-b"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
								>
									{#each evtCats as cat, ci (cat.id)}
										{@const catOpps = evtOpps.filter((o: any) => o.category?.slug === cat.slug)}

										<!-- Category label row -->
										<div
											class="flex items-center gap-3 px-4 py-2.5 {ci > 0 ? 'border-t' : ''}"
											style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent); background: color-mix(in srgb, var(--app-surface) 30%, transparent);"
										>
											<span
												class="text-[11px] font-bold uppercase tracking-widest"
												style="color: var(--app-text-muted);">{cat.name}</span
											>
											<div
												class="h-px flex-1"
												style="background: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
											></div>
											<span class="text-[10px]" style="color: var(--app-text-dim);">
												{catOpps.filter((o: any) => o.myFamily).length > 0
													? `✓ You're signed up`
													: `${catOpps.filter((o: any) => (o.currentSignups ?? (o.signups ?? []).length) < o.slots).length} open`}
											</span>
										</div>

										<!-- Opportunity rows -->
										{#each catOpps as opp (opp.id)}
											{@const signups = opp.signups ?? []}
											{@const filled = opp.currentSignups ?? signups.length}
											{@const total = opp.slots ?? 0}
											{@const isFull = filled >= total}
											{@const isExpanded = expandedSignup[opp.id]}

											<div
												class="border-t"
												style="border-color: color-mix(in srgb, var(--app-glass-border) 40%, transparent);"
											>
												<!-- Opportunity main row -->
												<div class="flex items-center gap-3 px-4 py-3">
													<!-- Status indicator -->
													<div
														class="h-2 w-2 shrink-0 rounded-full"
														style="background: {opp.myFamily
															? 'var(--app-success)'
															: isFull
																? 'var(--app-danger)'
																: 'var(--app-success)'}; box-shadow: 0 0 6px {opp.myFamily
															? 'var(--app-success)'
															: isFull
																? 'var(--app-danger)'
																: 'var(--app-success)'}60;"
													></div>

													<!-- Info -->
													<div class="min-w-0 flex-1">
														<div class="flex items-baseline gap-2">
															<p
																class="text-sm font-semibold"
																style="color: var(--app-text);"
															>
																{opp.title}
															</p>
															{#if opp.myFamily}
																<span
																	class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
																	style="background: color-mix(in srgb, var(--app-success) 14%, transparent); color: var(--app-success);"
																	>You're in</span
																>
															{:else if isFull}
																<span
																	class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
																	style="background: color-mix(in srgb, var(--app-danger) 14%, transparent); color: var(--app-danger);"
																	>Full</span
																>
															{/if}
														</div>
														<div
															class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]"
															style="color: var(--app-text-dim);"
														>
															{#if opp.event_date && opp.event_date !== evt.start_date}
																<span>{fmtDateShort(opp.event_date)}</span>
															{/if}
															{#if opp.start_time}
																<span
																	>{fmtTime(opp.start_time)}{opp.end_time
																		? `–${fmtTime(opp.end_time)}`
																		: ''}</span
																>
															{/if}
															{#if opp.location}
																<span style="color: var(--app-text-dim);">{opp.location}</span>
															{/if}
														</div>
														{#if opp.description}
															<p
																class="mt-0.5 text-[11px]"
																style="color: var(--app-text-dim);"
															>
																{opp.description}
															</p>
														{/if}
													</div>

													<!-- Slots progress + avatars -->
													<div
														class="flex shrink-0 flex-col items-end gap-1.5"
														style="min-width: 100px;"
													>
														<!-- Slot bar -->
														<div class="flex w-full items-center gap-2">
															<div
																class="flex-1 overflow-hidden rounded-full"
																style="height: 5px; background: color-mix(in srgb, var(--app-text) 8%, transparent);"
															>
																<div
																	style="height: 100%; border-radius: inherit; width: {pct(filled, total)}%; background: {isFull
																		? 'var(--app-danger)'
																		: 'var(--app-success)'}; transition: width 0.6s cubic-bezier(0.2,0.7,0.2,1); box-shadow: 0 0 8px -1px {isFull
																		? 'var(--app-danger)'
																		: 'var(--app-success)'}60;"
																></div>
															</div>
															<span
																class="text-[11px] font-mono font-medium"
																style="color: {isFull ? 'var(--app-danger)' : 'var(--app-text-muted)'}; min-width: 30px; text-align: right;"
															>
																{filled}/{total}
															</span>
														</div>

														<!-- Avatar stack -->
														{#if signups.length > 0}
															<div class="flex items-center" style="gap: -4px;">
																{#each signups.slice(0, 4) as s, si}
																	{@const name = s.signer?.full_name ?? s.family?.name ?? '?'}
																	{@const hue = avatarHue(name)}
																	<div
																		class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold"
																		style="background: hsl({hue}, 55%, 28%); border-color: hsl({hue}, 45%, 45%); color: hsl({hue}, 80%, 85%); margin-left: {si > 0 ? '-8px' : '0'}; z-index: {10 - si}; position: relative;"
																		title={name}
																	>
																		{initials(name)}
																	</div>
																{/each}
																{#if signups.length > 4}
																	<div
																		class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold"
																		style="background: var(--app-surface); border-color: var(--app-glass-border); color: var(--app-text-muted); margin-left: -8px; position: relative; z-index: 6;"
																	>
																		+{signups.length - 4}
																	</div>
																{/if}
															</div>
														{/if}
													</div>

													<!-- Action button -->
													<div class="shrink-0">
														{#if opp.myFamily}
															<!-- Find their signup for cancel -->
															{@const mySignup = (data.mySignups ?? []).find(
																(s: any) =>
																	s.opportunity_id === opp.id && s.status !== 'cancelled'
															)}
															{#if mySignup}
																<form method="POST" action="?/cancelSignup">
																	<input type="hidden" name="signup_id" value={mySignup.id} />
																	<Button variant="ghost" size="sm" type="submit">Cancel</Button>
																</form>
															{:else}
																<span
																	class="text-xs font-medium"
																	style="color: var(--app-success);">Signed up</span
																>
															{/if}
														{:else if isFull}
															<span
																class="rounded-lg px-2 py-1 text-xs font-medium"
																style="background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: var(--app-danger);"
																>Full</span
															>
														{:else}
															<button
																type="button"
																onclick={() => toggleSignup(opp.id)}
																class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
																style={isExpanded
																	? 'background: color-mix(in srgb, var(--app-accent) 14%, transparent); color: var(--app-accent); border: 1px solid color-mix(in srgb, var(--app-accent) 28%, transparent);'
																	: 'background: var(--aurora); color: white; box-shadow: 0 2px 12px -3px color-mix(in srgb, var(--app-accent) 50%, transparent);'}
															>
																{isExpanded ? 'Cancel' : 'Sign Up'}
															</button>
														{/if}
													</div>
												</div>

												<!-- ── Inline sign-up form ── -->
												{#if isExpanded && !opp.myFamily && !isFull}
													<div
														class="border-t px-4 py-3"
														style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
													>
														<form
															method="POST"
															action="?/signUp"
															class="flex flex-wrap items-end gap-2"
														>
															<input type="hidden" name="opportunity_id" value={opp.id} />
															<input
																type="hidden"
																name="signup_payload"
																value={JSON.stringify({})}
															/>
															<div class="flex-1" style="min-width: 180px;">
																<label
																	for={`signup-notes-${opp.id}`}
																	class="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
																	style="color: var(--app-text-muted);"
																	>Notes (optional)</label
																>
																<input
																	id={`signup-notes-${opp.id}`}
																	type="text"
																	name="notes"
																	bind:value={signupNotes[opp.id]}
																	placeholder="Any notes for the coordinator..."
																	class="w-full rounded-lg border px-3 py-2 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																/>
															</div>
															<Button variant="primary" size="sm" type="submit">Confirm Sign Up</Button>
														</form>
													</div>
												{/if}

												<!-- ── Who's signed up (expanded list) ── -->
												{#if signups.length > 0 && !isExpanded}
													<div
														class="px-4 pb-2"
														style="margin-top: -4px;"
													>
														<div class="flex flex-wrap gap-1.5">
															{#each signups as s}
																{@const name = s.signer?.full_name ?? s.family?.name ?? '—'}
																<span
																	class="rounded-full px-2 py-0.5 text-[10px]"
																	style="background: color-mix(in srgb, var(--app-accent) 10%, transparent); color: var(--app-text-muted); border: 1px solid color-mix(in srgb, var(--app-accent) 16%, transparent);"
																>
																	{name}
																	{#if s.notes}
																		<span style="color: var(--app-text-dim);">· {s.notes}</span>
																	{/if}
																</span>
															{/each}
														</div>
													</div>
												{/if}
											</div>
										{/each}
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

		<!-- ╔══════════════════════════════════════════╗ -->
		<!-- ║             DASHBOARD VIEW               ║ -->
		<!-- ╚══════════════════════════════════════════╝ -->
		{:else if mainTab === 'dashboard'}

			<!-- Announcements -->
			{#if (data.announcements ?? []).length > 0}
				<div class="space-y-2">
					{#each data.announcements.slice(0, 5) as ann (ann.id)}
						<div
							class="fade-up flex gap-3 rounded-xl border p-3.5"
							style="border-color: {ann.is_pinned
								? 'color-mix(in srgb, var(--app-warning) 35%, transparent)'
								: 'var(--app-glass-border)'}; background: {ann.is_pinned
								? 'color-mix(in srgb, var(--app-warning) 5%, var(--app-glass-bg))'
								: 'var(--app-glass-bg)'};"
						>
							{#if ann.is_pinned}
								<div class="mt-0.5 shrink-0">
									<svg
										width="14"
										height="14"
										viewBox="0 0 14 14"
										fill="none"
										style="color: var(--app-warning);"
									>
										<path
											d="M7 1L8.5 5H13L9.5 7.5 11 11.5 7 9 3 11.5 4.5 7.5 1 5H5.5L7 1Z"
											fill="currentColor"
										/>
									</svg>
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold" style="color: var(--app-text);">{ann.title}</p>
								<p
									class="mt-0.5 text-xs whitespace-pre-wrap"
									style="color: var(--app-text-muted);"
								>
									{ann.body}
								</p>
								<p class="mt-1.5 text-[10px]" style="color: var(--app-text-dim);">
									{ann.author?.full_name ?? ''}
									{ann.author?.full_name ? '·' : ''}
									{new Date(ann.created_at).toLocaleDateString()}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Summary stats -->
			<div class="fade-up grid gap-3 sm:grid-cols-3" style="animation-delay: 0.04s;">
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">
						Pledged Categories
					</p>
					<p class="mt-1 text-2xl font-bold" style="color: var(--app-text);">
						{yesCount}
						<span class="text-sm font-normal" style="color: var(--app-text-dim);"
							>/ {(data.categories ?? []).length}</span
						>
					</p>
					{#if yesCount >= 3}
						<p class="mt-0.5 text-[10px]" style="color: var(--app-success);">
							✓ Minimum met
						</p>
					{:else}
						<p class="mt-0.5 text-[10px]" style="color: var(--app-warning);">
							Need {3 - yesCount} more
						</p>
					{/if}
				</GlassCard>
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">
						Active Signups
					</p>
					<p class="mt-1 text-2xl font-bold" style="color: var(--app-accent);">
						{totalSignups}
					</p>
					<p class="mt-0.5 text-[10px]" style="color: var(--app-text-dim);">events volunteered</p>
				</GlassCard>
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">
						Season
					</p>
					<p
						class="mt-1 text-sm font-semibold truncate"
						style="color: var(--app-text);"
					>
						{data.season?.label ?? '—'}
					</p>
					<p class="mt-0.5 text-[10px]" style="color: var(--app-text-dim);">
						{data.family?.name ?? ''}
					</p>
				</GlassCard>
			</div>

			<!-- ── Pledge section ── -->
			<div class="fade-up" style="animation-delay: 0.08s;">
				<div class="mb-3 flex items-center justify-between">
					<div>
						<h2 class="text-sm font-semibold" style="color: var(--app-text);">
							Family Volunteer Pledge
						</h2>
						<p class="text-xs" style="color: var(--app-text-dim);">
							Commit to at least 3 categories for the season.
						</p>
					</div>
					{#if hasPledge && !showPledgeForm}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								showPledgeForm = true;
							}}>Edit Pledge</Button
						>
					{/if}
				</div>

				{#if !hasPledge || showPledgeForm}
					<!-- Pledge form: grid of category cards -->
					<GlassCard>
						<form method="POST" action="?/submitPledge" class="space-y-4">
							<div class="grid gap-2 sm:grid-cols-2">
								{#each data.categories as cat (cat.id)}
									{@const ex = commitmentMap.get(cat.id)}
									<div
										class="rounded-xl border p-3 transition-all"
										style="background: color-mix(in srgb, var(--app-surface) 40%, transparent); border-color: {ex?.response === 'yes' ? 'color-mix(in srgb, var(--app-success) 30%, transparent)' : ex?.response === 'maybe' ? 'color-mix(in srgb, var(--app-warning) 25%, transparent)' : 'var(--app-glass-border)'};"
									>
										<div class="mb-2">
											<p class="text-xs font-semibold" style="color: var(--app-text);">{cat.name}</p>
											<p class="text-[10px]" style="color: var(--app-text-dim);">
												Target: {cat.target_value}
												{cat.unit}{cat.requires_prereq ? ` · ${cat.requires_prereq}` : ''}
											</p>
										</div>
										<!-- Yes / Maybe / No toggle row -->
										<div class="mb-2 flex gap-1">
											{#each [{ val: 'yes', label: 'Yes', color: 'var(--app-success)' }, { val: 'maybe', label: 'Maybe', color: 'var(--app-warning)' }, { val: 'no', label: 'No', color: 'var(--app-danger)' }] as opt}
												<label
													class="flex flex-1 cursor-pointer items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-all"
													style={ex?.response === opt.val
														? `background: color-mix(in srgb, ${opt.color} 18%, transparent); color: ${opt.color}; border: 1px solid color-mix(in srgb, ${opt.color} 35%, transparent);`
														: 'background: color-mix(in srgb, var(--app-text) 5%, transparent); color: var(--app-text-dim); border: 1px solid transparent;'}
												>
													<input
														type="radio"
														name={`pledge_${cat.slug}`}
														value={opt.val}
														checked={ex?.response === opt.val ||
															(!ex && opt.val === 'no')}
														class="sr-only"
													/>
													{opt.label}
												</label>
											{/each}
										</div>
										<!-- Notes field -->
										<input
											type="text"
											name={`notes_${cat.slug}`}
											value={ex?.notes ?? ''}
											placeholder="Notes (optional)"
											class="w-full rounded-lg border px-2 py-1.5 text-[11px]"
											style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
										/>
									</div>
								{/each}
							</div>
							<div class="flex items-center gap-3 border-t pt-3" style="border-color: var(--app-glass-border);">
								<Button variant="primary" type="submit"
									>{hasPledge ? 'Update Pledge' : 'Submit Pledge'}</Button
								>
								{#if hasPledge}
									<Button
										variant="ghost"
										onclick={() => {
											showPledgeForm = false;
										}}>Cancel</Button
									>
								{/if}
								<p class="text-xs" style="color: var(--app-text-dim);">
									Minimum 3 "Yes" responses required
								</p>
							</div>
						</form>
					</GlassCard>
				{:else}
					<!-- Pledge summary: elevated categories progress grid -->
					<div class="grid gap-3 sm:grid-cols-2">
						{#each categoryProgress as cp (cp.id)}
							{@const ratio = cp.target > 0 ? Math.min(100, Math.round((cp.verified / cp.target) * 100)) : 0}
							
							<div class="rounded-xl border p-4 space-y-3 transition-all duration-300 backdrop-blur-xl"
								style="background: var(--app-glass-bg); 
									border-color: {cp.status === 'met' 
										? 'color-mix(in srgb, var(--app-success) 30%, transparent)' 
										: cp.status === 'in_progress' 
										? 'color-mix(in srgb, var(--app-accent) 30%, transparent)' 
										: cp.status === 'unfulfilled' 
										? 'color-mix(in srgb, var(--app-warning) 25%, transparent)' 
										: 'var(--app-glass-border)'};
									opacity: {cp.response === 'no' ? '0.5' : '1'};">
								
								<!-- Header -->
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<p class="text-sm font-bold tracking-tight" style="color: var(--app-text);">{cp.name}</p>
										<p class="text-[10px] font-medium" style="color: var(--app-text-dim);">
											Target: {cp.target} {cp.unit}
										</p>
									</div>

									<!-- Badges -->
									<div>
										{#if cp.status === 'met'}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-success) 12%, transparent); color: var(--app-success); border: 1px solid color-mix(in srgb, var(--app-success) 22%, transparent);">
												Target Met
											</span>
										{:else if cp.status === 'in_progress'}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-accent); border: 1px solid color-mix(in srgb, var(--app-accent) 22%, transparent);">
												In Progress
											</span>
										{:else if cp.status === 'unfulfilled'}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-warning) 12%, transparent); color: var(--app-warning); border: 1px solid color-mix(in srgb, var(--app-warning) 22%, transparent);">
												Pledged - Unfulfilled
											</span>
										{:else}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-text-dim) 8%, transparent); color: var(--app-text-dim); border: 1px solid var(--app-glass-border);">
												Not Pledged
											</span>
										{/if}
									</div>
								</div>

								<!-- Notes -->
								{#if cp.notes}
									<p class="text-[10px] italic" style="color: var(--app-text-dim);">
										"{cp.notes}"
									</p>
								{/if}

								<!-- Dynamic breakdown details -->
								{#if cp.response === 'yes'}
									<div class="space-y-1.5 pt-1">
										<div class="flex items-center justify-between text-[10px]" style="color: var(--app-text-muted);">
											<span>Verified: <strong style="color: var(--app-text);">{cp.verified} / {cp.target} {cp.unit}</strong></span>
											<span class="font-mono">{ratio}%</span>
										</div>

										<!-- Progress Bar -->
										<div class="relative overflow-hidden rounded-full" style="height: 5px; background: color-mix(in srgb, var(--app-text) 6%, transparent);">
											<div class="h-full rounded-full transition-all duration-500"
												style="width: {ratio}%; background: {cp.status === 'met' ? 'var(--app-success)' : 'var(--app-accent)'};">
											</div>
										</div>

										<!-- Future/Pending labels -->
										{#if cp.confirmed > 0 || cp.pending > 0}
											<div class="flex flex-wrap gap-2 pt-1 text-[9px]">
												{#if cp.confirmed > 0}
													<span class="inline-flex items-center gap-1 font-medium" style="color: var(--app-accent);">
														<span class="h-1 w-1 rounded-full bg-cyan-400"></span>
														{cp.confirmed} upcoming
													</span>
												{/if}
												{#if cp.pending > 0}
													<span class="inline-flex items-center gap-1 font-medium" style="color: var(--app-warning);">
														<span class="h-1 w-1 rounded-full bg-amber-400"></span>
														{cp.pending} pending approval
													</span>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ── My Active Signups timeline ── -->
			{#if (data.mySignups ?? []).filter((s: any) => s.status !== 'cancelled').length > 0}
				<div class="fade-up" style="animation-delay: 0.12s;">
					<h2 class="mb-3 text-sm font-semibold" style="color: var(--app-text);">My Signups</h2>
					<div class="relative space-y-2 pl-6">
						<!-- Vertical timeline line -->
						<div
							class="pointer-events-none absolute bottom-0 left-2 top-0 w-px"
							style="background: linear-gradient(to bottom, var(--app-accent), color-mix(in srgb, var(--app-accent) 0%, transparent));"
						></div>

						{#each data.mySignups.filter((s: any) => s.status !== 'cancelled') as signup (signup.id)}
							{@const opp = (data.opportunities ?? []).find(
								(o: any) => o.id === signup.opportunity_id
							)}
							{@const evt = opp ? (data.events ?? []).find((e: any) => e.id === opp.event_id) : null}

							<!-- Timeline dot -->
							<div
								class="absolute h-3 w-3 rounded-full border"
								style="left: calc(0.5rem - 6px); background: var(--app-bg); border-color: var(--app-accent); margin-top: 14px;"
							></div>

							<div
								class="rounded-xl border p-3"
								style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="text-sm font-semibold" style="color: var(--app-text);">
											{opp?.title ?? signup.signer?.full_name ?? 'Signup'}
										</p>
										{#if evt}
											<p class="text-xs" style="color: var(--app-text-muted);">
												{evt.title}
											</p>
										{/if}
										<div
											class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]"
											style="color: var(--app-text-dim);"
										>
											{#if opp?.event_date}<span>{fmtDate(opp.event_date)}</span>{/if}
											{#if opp?.start_time}<span>{fmtTime(opp.start_time)}</span>{/if}
											{#if opp?.location}<span>{opp.location}</span>{/if}
											{#if signup.notes}<span style="color: var(--app-text-muted);">{signup.notes}</span>{/if}
										</div>
									</div>
									<div class="flex shrink-0 items-center gap-2">
										<span
											class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
											style={signup.status === 'confirmed' ||
											signup.status === 'completed' ||
											signup.status === 'verified'
												? 'background: color-mix(in srgb, var(--app-success) 14%, transparent); color: var(--app-success);'
												: 'background: color-mix(in srgb, var(--app-warning) 14%, transparent); color: var(--app-warning);'}
										>
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
							</div>
						{/each}
					</div>
				</div>
			{:else if hasPledge}
				<GlassCard>
					<div class="py-6 text-center">
						<p class="text-sm" style="color: var(--app-text-muted);">
							No active signups yet.
						</p>
						<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
							Head to the
							<button
								type="button"
								class="underline"
								style="color: var(--app-accent);"
								onclick={() => {
									mainTab = 'events';
								}}>Events tab</button
							> to sign up for volunteer opportunities.
						</p>
					</div>
				</GlassCard>
			{/if}
		{/if}
	{/if}
</section>
