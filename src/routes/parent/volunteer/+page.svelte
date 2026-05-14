<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let mainTab = $state<'dashboard' | 'events'>('dashboard');
	let selectedEventId = $state('');
	let showPledgeForm = $state(false);

	const commitmentMap = $derived(new Map((data.commitments ?? []).map((c: any) => [c.category_id, c])));
	const hasPledge = $derived((data.commitments ?? []).length > 0);
	const yesCount = $derived((data.commitments ?? []).filter((c: any) => c.response === 'yes').length);
	const totalSignups = $derived((data.mySignups ?? []).filter((s: any) => s.status !== 'cancelled').length);

	const selectedEvent = $derived((data.events ?? []).find((e: any) => e.id === selectedEventId) ?? null);
	const eventOpps = $derived(
		selectedEventId
			? (data.opportunities ?? []).filter((o: any) => o.event_id === selectedEventId)
			: []
	);
	const eventCategorySlugs = $derived(
		[...new Set(eventOpps.map((o: any) => o.category?.slug).filter(Boolean))]
	);
	const eventCategories = $derived(
		(data.categories ?? []).filter((c: any) => eventCategorySlugs.includes(c.slug))
	);

	let activeCatSlug = $state('');
	$effect(() => {
		if (eventCategories.length > 0 && !eventCategorySlugs.includes(activeCatSlug)) {
			activeCatSlug = eventCategories[0].slug;
		}
	});

	const activeCategory = $derived(eventCategories.find((c: any) => c.slug === activeCatSlug));
	const activeCatOpps = $derived(
		eventOpps.filter((o: any) => o.category?.slug === activeCatSlug)
	);

	const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString() : '';
	const fmtTime = (t: string | null) => {
		if (!t) return '';
		const [h, m] = t.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
	};
	const pct = (v: number, t: number) => t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0;

	const CATEGORY_LABELS: Record<string, string> = {
		transport_to_comp: 'Carpool',
		equipment_transport: 'Equipment Transport',
		food: 'Food & Meals',
		chaperone: 'Chaperone',
		shop_supervision: 'Shop Shifts',
		field_build_hours: 'Build Hours',
		travel_planning: 'Travel Planning',
		mentor: 'Mentor',
		outreach: 'Outreach',
		sponsorship: 'Sponsorship'
	};

	let carpoolSeats = $state(4);
	let carpoolVehicle = $state('');
	let carpoolPickup = $state('');
	let foodItems = $state('');
	let foodDietary = $state('');
	let foodServings = $state(10);
	let genericNotes = $state('');
</script>

<section class="space-y-5">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Portal</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Volunteer Center</span></h1>
		{#if data.season}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.season.label} · {data.family?.name ?? ''}</p>
		{/if}
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">
			{#if form.section === 'pledge'}Pledge saved.{:else if form.section === 'signup'}Signed up!{:else if form.section === 'cancel'}Cancelled.{:else if form.section === 'hours'}Hours logged.{:else}Done.{/if}
		</p>
	{/if}

	{#if !data.season}
		<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">No active season.</p></GlassCard>
	{:else if !data.family}
		<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">Link a student from the <a href="/parent/dashboard" class="underline" style="color: var(--app-accent);">Dashboard</a> first.</p></GlassCard>
	{:else}
		<!-- Main tab bar -->
		<div class="fade-up flex gap-1 rounded-xl border p-1" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			{#each [{ key: 'dashboard', label: 'Dashboard' }, { key: 'events', label: 'Events' }] as tab (tab.key)}
				<button type="button" onclick={() => { mainTab = tab.key as any; }} class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all" style={mainTab === tab.key ? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);' : 'color: var(--app-text-muted);'}>{tab.label}</button>
			{/each}
		</div>

		<!-- ═══════════════════════════ DASHBOARD ═══════════════════════════ -->
		{#if mainTab === 'dashboard'}
			<!-- Announcements -->
			{#if (data.announcements ?? []).length > 0}
				<div class="space-y-2">
					{#each data.announcements.slice(0, 5) as ann (ann.id)}
						<div class="fade-up rounded-xl border p-3" style="border-color: {ann.is_pinned ? 'color-mix(in srgb, var(--app-warning) 40%, transparent)' : 'var(--app-glass-border)'}; background: {ann.is_pinned ? 'color-mix(in srgb, var(--app-warning) 6%, transparent)' : 'var(--app-glass-bg)'};">
							<div class="flex items-start gap-2">
								{#if ann.is_pinned}<span class="mt-0.5 text-xs" style="color: var(--app-warning);">pinned</span>{/if}
								<div class="min-w-0 flex-1">
									<p class="text-sm font-semibold" style="color: var(--app-text);">{ann.title}</p>
									<p class="mt-0.5 text-xs whitespace-pre-wrap" style="color: var(--app-text-muted);">{ann.body}</p>
									<p class="mt-1 text-[10px]" style="color: var(--app-text-dim);">{ann.author?.full_name ?? ''} · {new Date(ann.created_at).toLocaleDateString()}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Summary -->
			<div class="fade-up grid gap-3 sm:grid-cols-2" style="animation-delay: 0.05s;">
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Pledged categories</p>
					<p class="mt-1 text-xl font-semibold" style="color: var(--app-text);">{yesCount} <span class="text-sm font-normal" style="color: var(--app-text-muted);">of {(data.categories ?? []).length}</span></p>
				</GlassCard>
				<GlassCard compact>
					<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Active signups</p>
					<p class="mt-1 text-xl font-semibold" style="color: var(--app-accent);">{totalSignups}</p>
				</GlassCard>
			</div>

			<!-- Pledge -->
			{#if !hasPledge || showPledgeForm}
				<GlassCard title={hasPledge ? 'Update Pledge' : 'Family Volunteer Pledge'} subtitle="Commit to at least 3 categories for the season.">
					<form method="POST" action="?/submitPledge" class="space-y-1">
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b" style="border-color: var(--app-glass-border);">
										<th class="py-2 pr-3 text-left text-xs font-medium" style="color: var(--app-text-muted);">Category</th>
										<th class="px-2 py-2 text-center text-xs" style="color: var(--app-text-muted); width: 50px;">Yes</th>
										<th class="px-2 py-2 text-center text-xs" style="color: var(--app-text-muted); width: 50px;">No</th>
										<th class="px-2 py-2 text-center text-xs" style="color: var(--app-text-muted); width: 65px;">Maybe</th>
										<th class="py-2 pl-3 text-left text-xs" style="color: var(--app-text-muted); min-width: 100px;">Notes</th>
									</tr>
								</thead>
								<tbody>
									{#each data.categories as cat (cat.id)}
										{@const ex = commitmentMap.get(cat.id)}
										<tr class="border-b" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
											<td class="py-2.5 pr-3">
												<p class="font-medium" style="color: var(--app-text);">{cat.name}</p>
												<p class="text-xs" style="color: var(--app-text-dim);">Target: {cat.target_value} {cat.unit}{cat.requires_prereq ? ` · ${cat.requires_prereq}` : ''}</p>
											</td>
											<td class="px-2 py-2.5 text-center"><input type="radio" name={`pledge_${cat.slug}`} value="yes" checked={ex?.response === 'yes'} style="accent-color: var(--app-success);" /></td>
											<td class="px-2 py-2.5 text-center"><input type="radio" name={`pledge_${cat.slug}`} value="no" checked={!ex || ex?.response === 'no'} /></td>
											<td class="px-2 py-2.5 text-center"><input type="radio" name={`pledge_${cat.slug}`} value="maybe" checked={ex?.response === 'maybe'} style="accent-color: var(--app-warning);" /></td>
											<td class="py-2.5 pl-3"><input type="text" name={`notes_${cat.slug}`} value={ex?.notes ?? ''} placeholder="Optional" class="w-full rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" /></td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="flex items-center gap-3 pt-3">
							<Button variant="primary" type="submit">{hasPledge ? 'Update' : 'Submit Pledge'}</Button>
							{#if hasPledge}<Button variant="ghost" onclick={() => { showPledgeForm = false; }}>Cancel</Button>{/if}
							<p class="text-xs" style="color: var(--app-text-dim);">Min 3 "Yes" required</p>
						</div>
					</form>
				</GlassCard>
			{:else}
				<div class="flex items-center justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Your pledges</h2>
					<Button variant="ghost" size="sm" onclick={() => { showPledgeForm = true; }}>Edit Pledge</Button>
				</div>
				<div class="fade-up grid gap-2">
					{#each (data.commitments ?? []).filter((c: any) => c.response !== 'no') as com (com.id)}
						{@const cat = (data.categories ?? []).find((c: any) => c.id === com.category_id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="text-sm font-medium" style="color: var(--app-text);">{cat?.name ?? '—'}</p>
										{#if com.response === 'yes'}<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">pledged</span>{/if}
										{#if com.response === 'maybe'}<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">maybe</span>{/if}
									</div>
									{#if com.notes}<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">{com.notes}</p>{/if}
								</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

			<!-- My active signups -->
			{#if (data.mySignups ?? []).filter((s) => s.status !== 'cancelled').length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">My Signups</h2>
				<div class="space-y-2">
					{#each data.mySignups.filter((s) => s.status !== 'cancelled') as signup (signup.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{signup.signer?.full_name ?? 'Signup'}</p>
									<p class="text-xs" style="color: var(--app-text-dim);">
										{#if signup.signup_payload?.items}Bringing: {signup.signup_payload.items}{/if}
										{#if signup.signup_payload?.seats_offered}Seats: {signup.signup_payload.seats_offered}{/if}
										{#if signup.notes} · {signup.notes}{/if}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<span class="rounded-full px-2 py-0.5 text-xs font-medium" style={signup.status === 'confirmed' || signup.status === 'completed' || signup.status === 'verified' ? 'background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);' : 'background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);'}>{signup.status}</span>
									{#if signup.status === 'pending' || signup.status === 'confirmed'}
										<form method="POST" action="?/cancelSignup"><input type="hidden" name="signup_id" value={signup.id} /><Button variant="ghost" size="sm" type="submit">Cancel</Button></form>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

		<!-- ═══════════════════════════ EVENTS ═══════════════════════════ -->
		{:else if mainTab === 'events'}
			<!-- Event selector -->
			<div class="fade-up">
				<select class="w-full rounded-xl border px-4 py-3 text-sm font-medium" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" bind:value={selectedEventId}>
					<option value="">Select an event...</option>
					{#each data.events as evt (evt.id)}
						<option value={evt.id}>{evt.title} — {fmtDate(evt.start_date)}{evt.end_date ? ` to ${fmtDate(evt.end_date)}` : ''}{evt.location ? ` · ${evt.location}` : ''}</option>
					{/each}
				</select>
			</div>

			{#if !selectedEvent}
				<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">Select an event above to see volunteer opportunities.</p></GlassCard>
			{:else}
				<!-- Event header -->
				<div class="fade-up">
					<h2 class="text-lg font-bold" style="color: var(--app-text);">{selectedEvent.title}</h2>
					{#if selectedEvent.description}<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{selectedEvent.description}</p>{/if}
					<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">{fmtDate(selectedEvent.start_date)}{selectedEvent.end_date ? ` – ${fmtDate(selectedEvent.end_date)}` : ''}{selectedEvent.location ? ` · ${selectedEvent.location}` : ''}</p>
				</div>

				{#if eventCategories.length === 0}
					<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">No volunteer needs posted for this event yet.</p></GlassCard>
				{:else}
					<!-- Category sub-tabs -->
					<div class="fade-up flex gap-1 overflow-x-auto rounded-xl border p-1" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
						{#each eventCategories as cat (cat.slug)}
							<button type="button" onclick={() => { activeCatSlug = cat.slug; }} class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap" style={activeCatSlug === cat.slug ? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);' : 'color: var(--app-text-muted);'}>
								{CATEGORY_LABELS[cat.slug] ?? cat.name}
							</button>
						{/each}
					</div>

					<!-- ────── CARPOOL / TRANSPORT UI ────── -->
					{#if activeCatSlug === 'transport_to_comp' || activeCatSlug === 'equipment_transport'}
						<div class="space-y-3">
							{#each activeCatOpps as opp (opp.id)}
								{@const slots = opp.signups ?? []}
								{@const isFull = slots.length >= opp.slots}
								<GlassCard>
									<div class="mb-3 flex items-start justify-between gap-2">
										<div>
											<p class="text-sm font-semibold" style="color: var(--app-text);">{opp.title}</p>
											<p class="text-xs" style="color: var(--app-text-dim);">
												{fmtDate(opp.event_date)}{#if opp.start_time} · Depart {fmtTime(opp.start_time)}{/if}{#if opp.end_time} · Return {fmtTime(opp.end_time)}{/if}{#if opp.location} · {opp.location}{/if}
											</p>
											{#if opp.description}<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{opp.description}</p>{/if}
										</div>
										<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, {isFull ? 'var(--app-danger)' : 'var(--app-success)'} 15%, transparent); color: {isFull ? 'var(--app-danger)' : 'var(--app-success)'};">{slots.length}/{opp.slots} drivers</span>
									</div>

									<!-- Signed-up drivers table -->
									{#if slots.length > 0}
										<div class="overflow-x-auto rounded-lg border" style="border-color: var(--app-glass-border);">
											<table class="w-full text-xs">
												<thead><tr style="background: var(--app-table-header-bg);"><th class="px-3 py-2 text-left font-medium" style="color: var(--app-text-muted);">Driver</th><th class="px-3 py-2 text-center font-medium" style="color: var(--app-text-muted);">Seats</th><th class="px-3 py-2 text-left font-medium" style="color: var(--app-text-muted);">Vehicle</th><th class="px-3 py-2 text-left font-medium" style="color: var(--app-text-muted);">Notes</th></tr></thead>
												<tbody>
													{#each slots as s}
														<tr class="border-t" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
															<td class="px-3 py-2" style="color: var(--app-text);">{s.signer?.full_name ?? s.family?.name ?? '—'}</td>
															<td class="px-3 py-2 text-center" style="color: var(--app-text);">{s.signup_payload?.seats_offered ?? '—'}</td>
															<td class="px-3 py-2" style="color: var(--app-text-muted);">{s.signup_payload?.vehicle ?? '—'}</td>
															<td class="px-3 py-2" style="color: var(--app-text-muted);">{s.signup_payload?.pickup ?? ''}{s.notes ? ` · ${s.notes}` : ''}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}

									<!-- Sign up as driver -->
									{#if opp.myFamily}
										<p class="mt-2 text-xs font-medium" style="color: var(--app-success);">You're signed up for this.</p>
									{:else if !isFull}
										<form method="POST" action="?/signUp" class="mt-3 grid gap-2 sm:grid-cols-4">
											<input type="hidden" name="opportunity_id" value={opp.id} />
											<input type="number" min="1" max="12" bind:value={carpoolSeats} placeholder="Seats" class="rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<input type="text" bind:value={carpoolVehicle} placeholder="Vehicle (e.g. Honda Odyssey)" class="rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<input type="text" bind:value={carpoolPickup} placeholder="Pickup location" class="rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<input type="hidden" name="signup_payload" value={JSON.stringify({ seats_offered: carpoolSeats, vehicle: carpoolVehicle, pickup: carpoolPickup })} />
											<input type="hidden" name="notes" value="" />
											<Button variant="primary" size="sm" type="submit">Sign Up to Drive</Button>
										</form>
									{/if}
								</GlassCard>
							{/each}
						</div>

					<!-- ────── FOOD UI ────── -->
					{:else if activeCatSlug === 'food'}
						<div class="space-y-3">
							{#each activeCatOpps as opp (opp.id)}
								{@const slots = opp.signups ?? []}
								{@const isFull = slots.length >= opp.slots}
								<GlassCard>
									<div class="mb-3 flex items-start justify-between gap-2">
										<div>
											<p class="text-sm font-semibold" style="color: var(--app-text);">{opp.title}</p>
											<p class="text-xs" style="color: var(--app-text-dim);">{fmtDate(opp.event_date)}{#if opp.start_time} · {fmtTime(opp.start_time)}{/if}{#if opp.location} · {opp.location}{/if}</p>
											{#if opp.description}<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{opp.description}</p>{/if}
										</div>
										<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, {isFull ? 'var(--app-success)' : 'var(--app-warning)'} 15%, transparent); color: {isFull ? 'var(--app-success)' : 'var(--app-warning)'};">{slots.length}/{opp.slots} claimed</span>
									</div>

									<!-- Who's bringing what -->
									{#if slots.length > 0}
										<div class="overflow-x-auto rounded-lg border" style="border-color: var(--app-glass-border);">
											<table class="w-full text-xs">
												<thead><tr style="background: var(--app-table-header-bg);"><th class="px-3 py-2 text-left font-medium" style="color: var(--app-text-muted);">Family</th><th class="px-3 py-2 text-left font-medium" style="color: var(--app-text-muted);">Bringing</th><th class="px-3 py-2 text-center font-medium" style="color: var(--app-text-muted);">Serves</th><th class="px-3 py-2 text-left font-medium" style="color: var(--app-text-muted);">Dietary</th></tr></thead>
												<tbody>
													{#each slots as s}
														<tr class="border-t" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
															<td class="px-3 py-2" style="color: var(--app-text);">{s.signer?.full_name ?? s.family?.name ?? '—'}</td>
															<td class="px-3 py-2" style="color: var(--app-text);">{s.signup_payload?.items ?? s.notes ?? '—'}</td>
															<td class="px-3 py-2 text-center" style="color: var(--app-text-muted);">{s.signup_payload?.servings ?? '—'}</td>
															<td class="px-3 py-2" style="color: var(--app-text-muted);">{s.signup_payload?.dietary ?? '—'}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}

									{#if opp.myFamily}
										<p class="mt-2 text-xs font-medium" style="color: var(--app-success);">You're signed up for this.</p>
									{:else if !isFull}
										<form method="POST" action="?/signUp" class="mt-3 grid gap-2 sm:grid-cols-4">
											<input type="hidden" name="opportunity_id" value={opp.id} />
											<input type="text" bind:value={foodItems} placeholder="What you'll bring" class="sm:col-span-2 rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<input type="number" min="1" bind:value={foodServings} placeholder="Serves" class="rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<input type="text" bind:value={foodDietary} placeholder="Dietary notes (nut-free, etc.)" class="rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<input type="hidden" name="signup_payload" value={JSON.stringify({ items: foodItems, servings: foodServings, dietary: foodDietary })} />
											<input type="hidden" name="notes" value="" />
											<Button variant="primary" size="sm" type="submit">Sign Up</Button>
										</form>
									{/if}
								</GlassCard>
							{/each}
						</div>

					<!-- ────── CHAPERONE UI ────── -->
					{:else if activeCatSlug === 'chaperone'}
						<div class="space-y-3">
							{#each activeCatOpps as opp (opp.id)}
								{@const slots = opp.signups ?? []}
								{@const isFull = slots.length >= opp.slots}
								<GlassCard>
									<div class="mb-2 flex items-start justify-between gap-2">
										<div>
											<p class="text-sm font-semibold" style="color: var(--app-text);">{opp.title}</p>
											<p class="text-xs" style="color: var(--app-text-dim);">{fmtDate(opp.event_date)}{#if opp.end_time} overnight{/if}{#if opp.location} · {opp.location}{/if}</p>
											{#if opp.description}<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{opp.description}</p>{/if}
										</div>
										<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, {isFull ? 'var(--app-danger)' : 'var(--app-success)'} 15%, transparent); color: {isFull ? 'var(--app-danger)' : 'var(--app-success)'};">{slots.length}/{opp.slots}</span>
									</div>
									{#if slots.length > 0}
										<div class="flex flex-wrap gap-1.5 mb-2">
											{#each slots as s}
												<span class="rounded-full px-2 py-0.5 text-xs" style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-accent);">{s.signer?.full_name ?? s.family?.name ?? '—'}</span>
											{/each}
										</div>
									{/if}
									{#if opp.myFamily}
										<p class="text-xs font-medium" style="color: var(--app-success);">You're signed up.</p>
									{:else if !isFull}
										<form method="POST" action="?/signUp" class="flex items-center gap-2">
											<input type="hidden" name="opportunity_id" value={opp.id} />
											<input type="hidden" name="signup_payload" value={'{}'} />
											<input type="text" name="notes" placeholder="Experience / notes" class="flex-1 rounded-lg border px-2 py-1.5 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
											<Button variant="primary" size="sm" type="submit">Volunteer</Button>
										</form>
									{/if}
								</GlassCard>
							{/each}
						</div>

					<!-- ────── SHOP SUPERVISION / SHIFTS UI ────── -->
					{:else if activeCatSlug === 'shop_supervision'}
						<div class="space-y-3">
							{#each activeCatOpps as opp (opp.id)}
								{@const slots = opp.signups ?? []}
								{@const isFull = slots.length >= opp.slots}
								<GlassCard compact>
									<div class="flex items-center justify-between gap-3">
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium" style="color: var(--app-text);">{opp.title}</p>
											<p class="text-xs" style="color: var(--app-text-dim);">
												{fmtDate(opp.event_date)}{#if opp.start_time} · {fmtTime(opp.start_time)}{/if}{#if opp.end_time}–{fmtTime(opp.end_time)}{/if}
											</p>
											{#if slots.length > 0}
												<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">Signed up: {slots.map((s: any) => s.signer?.full_name ?? s.family?.name).join(', ')}</p>
											{/if}
										</div>
										<div class="flex items-center gap-2">
											<span class="rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, {isFull ? 'var(--app-danger)' : 'var(--app-success)'} 15%, transparent); color: {isFull ? 'var(--app-danger)' : 'var(--app-success)'};">{slots.length}/{opp.slots}</span>
											{#if opp.myFamily}
												<span class="text-xs" style="color: var(--app-success);">Signed up</span>
											{:else if !isFull}
												<form method="POST" action="?/signUp">
													<input type="hidden" name="opportunity_id" value={opp.id} />
													<input type="hidden" name="signup_payload" value={'{}'} />
													<input type="hidden" name="notes" value="" />
													<Button variant="primary" size="sm" type="submit">Claim Shift</Button>
												</form>
											{/if}
										</div>
									</div>
								</GlassCard>
							{/each}
						</div>

					<!-- ────── GENERIC CATEGORY UI ────── -->
					{:else}
						<div class="space-y-3">
							{#each activeCatOpps as opp (opp.id)}
								{@const slots = opp.signups ?? []}
								{@const isFull = slots.length >= opp.slots}
								<GlassCard>
									<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
										<div class="min-w-0 flex-1">
											<p class="text-sm font-semibold" style="color: var(--app-text);">{opp.title}</p>
											<p class="text-xs" style="color: var(--app-text-dim);">{fmtDate(opp.event_date)}{#if opp.start_time} · {fmtTime(opp.start_time)}{/if}{#if opp.location} · {opp.location}{/if}</p>
											{#if opp.description}<p class="mt-1 text-xs" style="color: var(--app-text-muted);">{opp.description}</p>{/if}
											<p class="mt-1 text-xs" style="color: var(--app-text-dim);">{slots.length}/{opp.slots} signed up</p>
											{#if slots.length > 0}
												<div class="mt-1 flex flex-wrap gap-1">
													{#each slots as s}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-accent);">{s.signer?.full_name ?? s.family?.name ?? '—'}</span>{/each}
												</div>
											{/if}
										</div>
										<div class="shrink-0">
											{#if opp.myFamily}
												<span class="rounded-full px-2.5 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">Signed up</span>
											{:else if isFull}
												<span class="rounded-full px-2.5 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">Full</span>
											{:else}
												<form method="POST" action="?/signUp" class="flex items-center gap-2">
													<input type="hidden" name="opportunity_id" value={opp.id} />
													<input type="hidden" name="signup_payload" value={'{}'} />
													<input type="text" name="notes" placeholder="Notes" class="w-28 rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
													<Button variant="primary" size="sm" type="submit">Sign Up</Button>
												</form>
											{/if}
										</div>
									</div>
								</GlassCard>
							{/each}
						</div>
					{/if}
				{/if}
			{/if}

		{/if}
	{/if}
</section>
