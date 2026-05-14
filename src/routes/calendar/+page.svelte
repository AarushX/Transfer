<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Avatar from '$lib/components/Avatar.svelte';
	import { isAdmin, isLead, isMentor, roleBadgeParts } from '$lib/roles';

	let { data } = $props();

	const mineSet = $derived(new Set<string>(data.mine));
	const mineRecurringSet = $derived(
		new Set(
			((data.mineRecurring as Array<{ day_of_week: number; shift_number: number; is_active: boolean }>) ?? [])
				.filter((row) => row.is_active)
				.map((row) => `${row.day_of_week}|${row.shift_number}`)
		)
	);
	const roster = $derived(data.roster);
	const rosterMap = $derived(new Map(roster.map((r) => [r.id, r])));
	const subteamMap = $derived(new Map(data.subteams.map((s) => [s.id, s])));

	const shifts: { n: 1 | 2; label: string; hint: string }[] = [
		{ n: 1, label: 'Shift 1', hint: 'First half' },
		{ n: 2, label: 'Shift 2', hint: 'Second half' }
	];
	const dayLabelLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const calendarRows = $derived.by(() => {
		const rows: (string | null)[][] = [];
		if (!data.dates.length) return rows;
		let row: (string | null)[] = Array(7).fill(null);
		let cursor = 0;
		for (const iso of data.dates as string[]) {
			const day = new Date(iso + 'T00:00:00').getDay();
			if (rows.length === 0 && cursor === 0 && day > 0) {
				// Leave leading blanks so calendar always starts with Sun column.
				for (let i = 0; i < day; i++) row[i] = null;
				cursor = day;
			}
			if (day < cursor) {
				rows.push(row);
				row = Array(7).fill(null);
			}
			row[day] = iso;
			cursor = day + 1;
		}
		rows.push(row);
		return rows;
	});
	const mobileWeekGroups = $derived.by(() => {
		return calendarRows
			.map((row, index) => {
				const dates = row.filter((iso): iso is string => Boolean(iso));
				if (dates.length === 0) return null;
				const start = dates[0];
				const end = dates[dates.length - 1];
				const title = index === 0 ? 'This week' : index === 1 ? 'Next week' : `Week ${index + 1}`;
				return { title, start, end, dates };
			})
			.filter((group): group is { title: string; start: string; end: string; dates: string[] } => Boolean(group));
	});

	const fmt = (iso: string) => {
		const d = new Date(iso + 'T00:00:00');
		return {
			weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
			day: d.getDate(),
			month: d.toLocaleDateString(undefined, { month: 'short' }),
			isToday: iso === new Date().toISOString().slice(0, 10),
			isWeekend: [0, 6].includes(d.getDay())
		};
	};
	const weekRangeLabel = (startIso: string, endIso: string) => {
		const start = fmt(startIso);
		const end = fmt(endIso);
		if (startIso === endIso) return `${start.month} ${start.day}`;
		return `${start.month} ${start.day} - ${end.month} ${end.day}`;
	};

	const setScope = (scope: 'me' | 'team' | 'all') => {
		const url = new URL(window.location.href);
		url.searchParams.set('scope', scope);
		window.location.href = url.toString();
	};

	let selectedShift = $state<{
		key: string;
		date: string;
		shift: 1 | 2;
		userIds: string[];
	} | null>(null);

	const toggle = async (date: string, shift: 1 | 2, currentlyAvailable: boolean) => {
		const fd = new FormData();
		fd.set('date', date);
		fd.set('shift', String(shift));
		fd.set('available', String(!currentlyAvailable));
		await fetch('?/toggle', { method: 'POST', body: fd });
		await invalidateAll();
	};
	const toggleRecurring = async (day: number, shift: 1 | 2, currentlyActive: boolean) => {
		const fd = new FormData();
		fd.set('day', String(day));
		fd.set('shift', String(shift));
		fd.set('active', String(!currentlyActive));
		await fetch('?/recurring', { method: 'POST', body: fd });
		await invalidateAll();
	};

	const openShift = (date: string, shift: 1 | 2) => {
		if (data.scope !== 'all') return;
		const key = `${date}|${shift}`;
		selectedShift = { key, date, shift, userIds: (data.rosterByKey[key] ?? []) as string[] };
	};

	const closeShift = () => {
		selectedShift = null;
	};
	const addWeeklyRule = async () => {
		const res = await fetch('/api/shop-availability/schedule', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				dayOfWeek: Number(scheduleDay),
				startTime: scheduleStart,
				endTime: scheduleEnd,
				note: scheduleNote
			})
		});
		if (res.ok) {
			scheduleNote = '';
			await invalidateAll();
		}
	};
	const removeWeeklyRule = async (ruleId: string) => {
		const res = await fetch('/api/shop-availability/schedule', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ruleId })
		});
		if (res.ok) await invalidateAll();
	};
	const addOverride = async () => {
		const res = await fetch('/api/shop-availability/overrides', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				userId: overrideUserId,
				mode: overrideMode,
				startsAt: overrideStart,
				endsAt: overrideEnd,
				reason: overrideReason
			})
		});
		if (res.ok) {
			overrideReason = '';
			await invalidateAll();
		}
	};
	const removeOverride = async (overrideId: string) => {
		const res = await fetch('/api/shop-availability/overrides', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ overrideId })
		});
		if (res.ok) await invalidateAll();
	};

	const groupedSelectedShiftUsers = $derived.by(() => {
		if (!selectedShift) return [];
		type Group = { key: string; label: string; users: any[] };
		const groups: Group[] = [
			{ key: 'admin', label: 'Admin', users: [] },
			{ key: 'member', label: 'Member', users: [] }
		];
		const byKey = new Map(groups.map((g) => [g.key, g]));
		for (const uid of selectedShift.userIds) {
			const p = rosterMap.get(uid);
			if (!p) continue;
			const key = p.base_role === 'admin' ? 'admin' : 'member';
			byKey.get(key)?.users.push(p);
		}
		return groups.filter((g) => g.users.length > 0);
	});
</script>

<section class="space-y-6">
	<header class="fade-up flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="eyebrow-label">Calendar</p>
			<h1 class="mt-1 text-3xl font-semibold tracking-tight gradient-text">Shop availability</h1>
			<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">
				Mark the shifts you can be at the shop for the next two weeks. Each day has two shifts.
				{#if data.canTeam}Mentors and student leads can see team availability.{/if}
				{#if data.canAll} Admins see everyone.{/if}
			</p>
		</div>

		<div class="inline-flex overflow-hidden rounded-xl border text-sm" style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);">
			<button
				type="button"
				class="px-3 py-1.5 text-sm transition-colors"
				style={data.scope === 'me' ? 'background: var(--app-glass-bg-hover); color: var(--app-text);' : 'background: transparent; color: var(--app-text-muted);'}
				onclick={() => setScope('me')}>Me</button
			>
			{#if data.canTeam}
				<button
					type="button"
					class="border-l px-3 py-1.5 text-sm transition-colors"
					style={`border-color: var(--app-glass-border); ${data.scope === 'team' ? 'background: var(--app-glass-bg-hover); color: var(--app-text);' : 'background: transparent; color: var(--app-text-muted);'}`}
					onclick={() => setScope('team')}>My team</button
				>
			{/if}
			{#if data.canAll}
				<button
					type="button"
					class="border-l px-3 py-1.5 text-sm transition-colors"
					style={`border-color: var(--app-glass-border); ${data.scope === 'all' ? 'background: var(--app-glass-bg-hover); color: var(--app-text);' : 'background: transparent; color: var(--app-text-muted);'}`}
					onclick={() => setScope('all')}>All</button
				>
			{/if}
		</div>
	</header>

	<!-- Weekly recurring plan -->
	<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 60ms;">
		<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
		<div class="relative">
			<p class="eyebrow-label">Recurring</p>
			<h2 class="mt-1 text-lg font-semibold" style="color: var(--app-text);">Weekly recurring plan (Sun-Sat)</h2>
			<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
				Set your normal weekly shifts here. The calendar below auto-populates from this plan.
			</p>
			<div class="mt-4 overflow-x-auto">
				<div class="min-w-[700px]">
					<div class="grid grid-cols-8 gap-2 text-xs" style="color: var(--app-text-dim);">
						<div></div>
						{#each dayLabelLong as day}
							<div class="text-center font-semibold">{day.slice(0, 3)}</div>
						{/each}
					</div>
					{#each shifts as shift (shift.n)}
						<div class="mt-2 grid grid-cols-8 gap-2">
							<div class="flex items-center text-xs font-semibold" style="color: var(--app-text-dim);">{shift.label}</div>
							{#each dayLabelLong as _d, dayIndex}
								{@const key = `${dayIndex}|${shift.n}`}
								{@const on = mineRecurringSet.has(key)}
								<button
									type="button"
									class="rounded-lg border px-2 py-2 text-xs transition-colors"
									style={on
										? 'background: var(--app-glass-bg-hover); border-color: var(--app-glass-border-hover); color: var(--app-text);'
										: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);'}
									onclick={() => toggleRecurring(dayIndex, shift.n, on)}
								>
									{on ? 'On' : 'Off'}
								</button>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	{#if data.scope === 'me'}
		<!-- Mobile calendar (me scope) -->
		<div class="space-y-3 md:hidden">
			{#each mobileWeekGroups as week, wi (week.title)}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: {120 + wi * 60}ms;">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<div class="relative">
						<div class="mb-3 border-b pb-2" style="border-color: var(--app-glass-border);">
							<p class="eyebrow-label">{week.title}</p>
							<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{weekRangeLabel(week.start, week.end)}</p>
						</div>
						<div class="space-y-2.5">
							{#each week.dates as iso (iso)}
								{@const m = fmt(iso)}
								<div class="rounded-xl border p-2.5" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
									<div class="mb-2 flex items-center justify-between">
										<p class="text-sm font-semibold" style="color: var(--app-text);">
											{m.weekday}, {m.month} {m.day}
										</p>
										{#if m.isToday}
											<span class="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide chip-violet">
												Today
											</span>
										{/if}
									</div>
									<div class="grid gap-2">
										{#each shifts as shift (shift.n)}
											{@const key = `${iso}|${shift.n}`}
											{@const on = mineSet.has(key)}
											<button
												type="button"
												onclick={() => toggle(iso, shift.n, on)}
												class="rounded-lg border px-3 py-2 text-left text-sm transition-colors"
												style={on
													? 'background: var(--app-glass-bg-hover); border-color: var(--app-glass-border-hover); color: var(--app-text);'
													: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);'}
											>
												<span class="block font-medium">{shift.label}</span>
												<span class="block text-xs" style={on ? 'opacity: 0.75;' : 'color: var(--app-text-dim);'}>
													{on ? 'Available' : 'Tap to opt in'}
												</span>
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop calendar (me scope) -->
		<div class="fade-up hidden overflow-x-auto rounded-2xl border backdrop-blur-xl md:block" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 120ms;">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<div class="relative min-w-[700px]">
			<div class="grid grid-cols-7 border-b text-[11px] font-medium uppercase tracking-wider" style="background: var(--app-surface-alt); border-color: var(--app-glass-border); color: var(--app-text-dim);">
				{#each weekdayLabels as day (day)}
					<div class="px-3 py-2 text-center">{day}</div>
				{/each}
			</div>
			<div class="space-y-0">
				{#each calendarRows as row, ri (ri)}
					<div class="grid grid-cols-7 border-b last:border-b-0" style="border-color: var(--app-glass-border);">
						{#each row as iso, ci (`${ri}-${ci}`)}
							<div class="min-h-[126px] border-r p-2 last:border-r-0" style="border-color: var(--app-glass-border);">
								{#if iso}
									{@const m = fmt(iso)}
									<div class="mb-1 flex items-baseline justify-between">
										<span class="text-[11px]" style="color: var(--app-text-dim);">{m.month}</span>
										<span class="mono text-xs" style={m.isToday ? 'background: var(--app-surface-alt); border-radius: 6px; padding: 1px 6px; color: var(--app-text);' : 'color: var(--app-text-muted);'}>
											{m.day}
										</span>
									</div>
									<div class="flex flex-col gap-1">
										{#each shifts as shift (shift.n)}
											{@const key = `${iso}|${shift.n}`}
											{@const on = mineSet.has(key)}
											<button
												type="button"
												onclick={() => toggle(iso, shift.n, on)}
												class="rounded-lg border px-2 py-1.5 text-left text-xs transition-colors"
												style={on
													? 'background: var(--app-glass-bg-hover); border-color: var(--app-glass-border-hover); color: var(--app-text);'
													: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);'}
											>
												<span class="block font-medium">{shift.label}</span>
												<span class="block text-[10px]" style={on ? 'opacity: 0.7;' : 'color: var(--app-text-dim);'}>
													{on ? 'Available' : 'Tap to opt in'}
												</span>
											</button>
										{/each}
									</div>
								{/if}
								{#if !iso}
									<div class="flex h-full min-h-[110px] items-center justify-center rounded-lg border border-dashed" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);">
										<span class="text-base font-light" style="color: var(--app-text-dim); opacity: 0.4;">×</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Mobile calendar (team/all scope) -->
			<div class="space-y-3 md:hidden">
				{#each mobileWeekGroups as week, wi (week.title)}
					<div class="fade-up relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: {120 + wi * 60}ms;">
						<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
						<div class="relative">
							<div class="mb-3 border-b pb-2" style="border-color: var(--app-glass-border);">
								<p class="eyebrow-label">{week.title}</p>
								<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{weekRangeLabel(week.start, week.end)}</p>
							</div>
							<div class="space-y-2.5">
								{#each week.dates as iso (iso)}
									{@const m = fmt(iso)}
									<div class="rounded-xl border p-2.5" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
										<div class="mb-2 flex items-center justify-between">
											<p class="text-sm font-semibold" style="color: var(--app-text);">
												{m.weekday}, {m.month} {m.day}
											</p>
											{#if m.isToday}
												<span class="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide chip-violet">
													Today
												</span>
											{/if}
										</div>
										<div class="space-y-2">
											{#each shifts as shift (shift.n)}
												{@const key = `${iso}|${shift.n}`}
												{@const ids = data.rosterByKey[key] ?? []}
												{@const mineOn = mineSet.has(key)}
												<div class="w-full rounded-lg border p-2 text-left" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
													<div class="flex items-center justify-between">
														<p class="eyebrow-label">{shift.label}</p>
														<span class="mono text-xs font-medium" style="color: var(--app-text);">{ids.length}</span>
													</div>
													{#if ids.length === 0}
														<p class="mt-1 text-xs" style="color: var(--app-text-dim);">No one yet</p>
													{:else}
														<div class="mt-1.5 flex flex-wrap gap-1">
															{#each ids.slice(0, 10) as uid (uid)}
																{@const p = rosterMap.get(uid)}
																{#if p}
																	<Avatar
																		name={p.full_name}
																		email={p.email}
																		url={p.avatar_url}
																		size="xs"
																		ring={isMentor(p)}
																		ringClass="ring-sky-400"
																		title={p.full_name || p.email}
																	/>
																{/if}
															{/each}
															{#if ids.length > 10}
																<span class="mono text-xs" style="color: var(--app-text-dim);">+{ids.length - 10}</span>
															{/if}
														</div>
													{/if}
													<div class="mt-2 flex gap-1.5">
														{#if data.scope === 'all'}
															<button
																type="button"
																class="flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors"
																style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
																onclick={() => openShift(iso, shift.n)}
															>
																List
															</button>
														{/if}
														<button
															type="button"
															class="flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors"
															style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
															onclick={() => toggle(iso, shift.n, mineOn)}
														>
															{mineOn ? 'Leave' : 'Add me'}
														</button>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop calendar (team/all scope) -->
			<div class="fade-up hidden overflow-x-auto rounded-2xl border backdrop-blur-xl md:block" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 120ms;">
				<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
				<div class="relative min-w-[700px]">
				<div class="grid grid-cols-7 border-b text-[11px] font-medium uppercase tracking-wider" style="background: var(--app-surface-alt); border-color: var(--app-glass-border); color: var(--app-text-dim);">
					{#each weekdayLabels as day (day)}
						<div class="px-3 py-2 text-center">{day}</div>
					{/each}
				</div>
				<div class="space-y-0">
					{#each calendarRows as row, ri (ri)}
						<div class="grid grid-cols-7 border-b last:border-b-0" style="border-color: var(--app-glass-border);">
							{#each row as iso, ci (`${ri}-${ci}`)}
								<div class="min-h-[154px] border-r p-2 last:border-r-0" style="border-color: var(--app-glass-border);">
									{#if iso}
										{@const m = fmt(iso)}
										<div class="mb-1 flex items-baseline justify-between">
											<span class="text-[11px]" style="color: var(--app-text-dim);">{m.month}</span>
											<span class="mono text-xs" style={m.isToday ? 'background: var(--app-surface-alt); border-radius: 6px; padding: 1px 6px; color: var(--app-text);' : 'color: var(--app-text-muted);'}>
												{m.day}
											</span>
										</div>
										<div class="space-y-2">
											{#each shifts as shift (shift.n)}
												{@const key = `${iso}|${shift.n}`}
												{@const ids = data.rosterByKey[key] ?? []}
												{@const mineOn = mineSet.has(key)}
												<div class="w-full rounded-lg border p-2 text-left" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
													<div class="flex items-center justify-between">
														<p class="text-[11px] font-medium uppercase tracking-wider" style="color: var(--app-text-dim);">
															{shift.label}
														</p>
														<span class="mono text-[11px] font-medium" style="color: var(--app-text);">{ids.length}</span>
													</div>
													{#if ids.length === 0}
														<p class="mt-1.5 text-[11px]" style="color: var(--app-text-dim);">—</p>
													{:else}
														<div class="mt-1.5 flex flex-wrap gap-1">
															{#each ids.slice(0, 8) as uid (uid)}
																{@const p = rosterMap.get(uid)}
																{#if p}
																	<Avatar
																		name={p.full_name}
																		email={p.email}
																		url={p.avatar_url}
																		size="xs"
																		ring={isMentor(p)}
																		ringClass="ring-sky-400"
																		title={p.full_name || p.email}
																	/>
																{/if}
															{/each}
															{#if ids.length > 8}
																<span class="mono text-[11px]" style="color: var(--app-text-dim);">+{ids.length - 8}</span>
															{/if}
														</div>
													{/if}
													<div class="mt-2 flex gap-1">
														{#if data.scope === 'all'}
															<button
																type="button"
																class="flex-1 rounded-lg border px-2 py-1 text-[11px] transition-colors"
																style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
																onclick={() => openShift(iso, shift.n)}
															>
																List
															</button>
														{/if}
														<button
															type="button"
															class="flex-1 rounded-lg border px-2 py-1 text-[11px] transition-colors"
															style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
															onclick={() => toggle(iso, shift.n, mineOn)}
														>
															{mineOn ? 'Leave' : 'Add me'}
														</button>
													</div>
												</div>
											{/each}
										</div>
									{/if}
									{#if !iso}
										<div class="flex h-full min-h-[138px] items-center justify-center rounded-lg border border-dashed" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);">
											<span class="text-base font-light" style="color: var(--app-text-dim); opacity: 0.4;">×</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
				</div>
			</div>

			<!-- Roster panel (all scope) -->
			{#if data.scope === 'all' && roster.length > 0}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 180ms;">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<div class="relative">
						<p class="eyebrow-label">Team</p>
						<p class="mt-1 text-sm font-medium" style="color: var(--app-text);">Roster <span class="mono" style="color: var(--app-text-dim);">({roster.length})</span></p>
						<p class="text-xs" style="color: var(--app-text-dim);">Everyone visible to admins.</p>
						<ul class="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
							{#each roster as p (p.id)}
								<li class="flex items-center gap-2 rounded-xl border p-2 transition-colors" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
									<Avatar
										name={p.full_name}
										email={p.email}
										url={p.avatar_url}
										size="sm"
										ring={isMentor(p)}
										ringClass="ring-sky-400"
									/>
									<div class="min-w-0 text-xs">
										<p class="truncate font-medium" style="color: var(--app-text);">{p.full_name || p.email}</p>
										<p class="truncate" style="color: var(--app-text-dim);">
											{roleBadgeParts(p).join(' · ')} · {subteamMap.get(p.subteam_id ?? '')?.name ?? 'No team'}
										</p>
									</div>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Shift detail modal -->
	{#if selectedShift}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center p-4"
			style="background: var(--app-overlay-scrim);"
			role="button"
			tabindex="0"
			onclick={closeShift}
			onkeydown={(event) => {
				if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') closeShift();
			}}
		>
			<div
				class="fade-up relative max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border p-5 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
				role="dialog"
				aria-modal="true"
				tabindex="0"
				onclick={(event) => event.stopPropagation()}
				onkeydown={(event) => {
					if (event.key === 'Escape') closeShift();
				}}
			>
				<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
				<div class="relative">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div>
							<p class="eyebrow-label">Shift detail</p>
							<p class="mt-1 text-lg font-semibold" style="color: var(--app-text);">
								{fmt(selectedShift.date).weekday}, {fmt(selectedShift.date).month} {fmt(selectedShift.date).day} ·
								Shift {selectedShift.shift}
							</p>
							<p class="mono text-xs" style="color: var(--app-text-dim);">{selectedShift.userIds.length} available</p>
						</div>
						<button
							type="button"
							class="rounded-xl border px-3 py-1.5 text-xs transition-colors"
							style="border-color: var(--app-glass-border); color: var(--app-text);"
							onclick={closeShift}
						>
							Close
						</button>
					</div>
					{#if selectedShift.userIds.length === 0}
						<p class="text-sm" style="color: var(--app-text-muted);">Nobody marked available for this shift.</p>
					{:else}
						<div class="space-y-4">
							{#each groupedSelectedShiftUsers as group (group.key)}
								<div>
									<p class="eyebrow-label mb-2">{group.label}</p>
									<ul class="grid gap-2 sm:grid-cols-2">
										{#each group.users as p (p.id)}
											<li class="flex items-center gap-2 rounded-xl border p-2 transition-colors" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
												<Avatar
													name={p.full_name}
													email={p.email}
													url={p.avatar_url}
													size="sm"
													ring={isMentor(p)}
													ringClass="ring-sky-400"
												/>
												<div class="min-w-0 text-xs">
													<p class="truncate font-medium" style="color: var(--app-text);">{p.full_name || p.email}</p>
													<p class="truncate" style="color: var(--app-text-dim);">
														{roleBadgeParts(p).join(' · ')} · {subteamMap.get(p.subteam_id ?? '')?.name ?? 'No team'}
													</p>
												</div>
											</li>
										{/each}
									</ul>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</section>
