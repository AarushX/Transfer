<script lang="ts">
	let { data } = $props();
	let query = $state('');
	let dayFilter = $state('');
	let adminAttendeeUserId = $state('');
	let adminNote = $state('');
	let adminActionPending = $state(false);
	let adminActionMessage = $state('');
	let adminActionError = $state('');

	type AttendanceRow = (typeof data.sessions)[number];
	type EventRow = (typeof data.events)[number];

	const formatDateTime = (value: string | null | undefined) => {
		if (!value) return '—';
		const timeZone = (data as any).timeZone ?? 'America/Los_Angeles';
		return new Intl.DateTimeFormat(undefined, {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true,
			timeZoneName: 'short'
		}).format(new Date(value));
	};
	const personLabel = (profile: any, fallback: string | null | undefined) =>
		profile?.full_name || profile?.email || fallback || '—';
	const eventActionLabel = (action: string) =>
		({
			check_in: 'Check in',
			check_out: 'Check out',
			manual_check_in: 'Manual check in',
			guest_sign_in: 'Guest sign in',
			display_activate: 'Display activated',
			display_deactivate: 'Display deactivated'
		})[action] ?? action;
	const eventsBySession = $derived.by(() => {
		const grouped = new Map<string, EventRow[]>();
		for (const row of data.events as EventRow[]) {
			const key = `${row.attendee_user_id ?? 'none'}:${row.attendance_day ?? 'none'}`;
			const list = grouped.get(key) ?? [];
			list.push(row);
			grouped.set(key, list);
		}
		return grouped;
	});
	const filteredSessions = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return (data.sessions as AttendanceRow[]).filter((row) => {
			const attendee = personLabel(row.attendee, row.attendee_user_id).toLowerCase();
			const scanner = personLabel(row.lastScanner, row.last_scanned_by).toLowerCase();
			const dayOk = dayFilter ? String(row.attendance_day) === dayFilter : true;
			if (!needle) return dayOk;
			return dayOk && (attendee.includes(needle) || scanner.includes(needle));
		});
	});
	const summary = $derived.by(() => {
		let checkedIn = 0;
		let checkedOut = 0;
		for (const row of filteredSessions) {
			if (row.check_in_at) checkedIn += 1;
			if (row.check_out_at) checkedOut += 1;
		}
		return {
			sessions: filteredSessions.length,
			checkedIn,
			checkedOut,
			open: Math.max(checkedIn - checkedOut, 0)
		};
	});
	const recentAdminEvents = $derived(
		(data.events as EventRow[]).filter(
			(row) => row.action === 'display_activate' || row.action === 'display_deactivate'
		)
	);
	const timelineFor = (row: AttendanceRow) =>
		eventsBySession.get(`${row.attendee_user_id}:${row.attendance_day}`) ?? [];

	const runAdminAction = async (action: 'activate' | 'deactivate' | 'check_in' | 'check_out') => {
		if (adminActionPending) return;
		if ((action === 'check_in' || action === 'check_out') && !adminAttendeeUserId) {
			adminActionError = 'Choose a member first.';
			adminActionMessage = '';
			return;
		}
		adminActionPending = true;
		adminActionError = '';
		adminActionMessage = '';
		try {
			const res = await fetch('/api/attendance/admin/manual', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action,
					attendeeUserId: adminAttendeeUserId || null,
					note: adminNote.trim() || null
				})
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				adminActionError = body?.error ?? 'Manual attendance action failed.';
				return;
			}
			adminActionMessage = `Manual ${action.replace('_', ' ')} recorded.`;
			adminNote = '';
			await fetch('/api/attendance/public/refresh', { method: 'POST' }).catch(() => null);
			location.reload();
		} catch {
			adminActionError = 'Network error. Try again.';
		} finally {
			adminActionPending = false;
		}
	};
</script>

<section class="space-y-6">
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Admin</p>
		<h1 class="mt-1 text-2xl font-semibold">Attendance</h1>
		<p class="text-sm text-slate-400">
			Tracks daily check-in/check-out sessions plus individual scan events.
		</p>
	</header>

	<div class="grid gap-3 md:grid-cols-4">
		<div class="rounded border border-slate-800 bg-slate-900 p-3">
			<p class="text-xs text-slate-400">Sessions</p>
			<p class="text-xl font-semibold">{summary.sessions}</p>
		</div>
		<div class="rounded border border-slate-800 bg-slate-900 p-3">
			<p class="text-xs text-slate-400">Checked in</p>
			<p class="text-xl font-semibold text-emerald-300">{summary.checkedIn}</p>
		</div>
		<div class="rounded border border-slate-800 bg-slate-900 p-3">
			<p class="text-xs text-slate-400">Checked out</p>
			<p class="text-xl font-semibold text-sky-300">{summary.checkedOut}</p>
		</div>
		<div class="rounded border border-slate-800 bg-slate-900 p-3">
			<p class="text-xs text-slate-400">Still open</p>
			<p class="text-xl font-semibold text-amber-300">{summary.open}</p>
		</div>
	</div>

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-3">
		<div class="grid gap-2 md:grid-cols-[1fr_auto_auto]">
			<input
				class="rounded bg-slate-800 px-3 py-2 text-sm"
				placeholder="Search attendee/scanner..."
				bind:value={query}
			/>
			<input class="rounded bg-slate-800 px-3 py-2 text-sm" type="date" bind:value={dayFilter} />
			{#if query || dayFilter}
				<button class="rounded border border-slate-700 px-3 py-2 text-sm" onclick={() => { query = ''; dayFilter = ''; }}>
					Clear
				</button>
			{/if}
		</div>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="text-lg font-semibold">Manual Kiosk Toggle</h2>
			<p class="mt-1 text-xs text-slate-400">Directly activate or deactivate the attendance display.</p>
			<div class="mt-3 grid gap-2 md:grid-cols-2">
				<button
					class="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
					disabled={adminActionPending}
					onclick={() => runAdminAction('activate')}
				>
					Activate
				</button>
				<button
					class="rounded bg-rose-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
					disabled={adminActionPending}
					onclick={() => runAdminAction('deactivate')}
				>
					Deactivate
				</button>
			</div>
		</div>

		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="text-lg font-semibold">Manual Member Attendance</h2>
			<p class="mt-1 text-xs text-slate-400">Forced check-in/check-out actions for a selected member.</p>
			<div class="mt-3 grid gap-2 md:grid-cols-[1fr_1fr]">
				<select class="rounded bg-slate-800 px-3 py-2 text-sm" bind:value={adminAttendeeUserId}>
					<option value="">Select member for check-in/out...</option>
					{#each data.members as member}
						<option value={member.id}>{member.label}</option>
					{/each}
				</select>
				<input
					class="rounded bg-slate-800 px-3 py-2 text-sm"
					placeholder="Note (optional)"
					bind:value={adminNote}
					maxlength="300"
				/>
			</div>
			<div class="mt-2 grid gap-2 md:grid-cols-2">
				<button
					class="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-60"
					disabled={adminActionPending || !adminAttendeeUserId}
					onclick={() => runAdminAction('check_in')}
				>
					Manual Check In
				</button>
				<button
					class="rounded border border-slate-700 px-3 py-2 text-sm disabled:opacity-60"
					disabled={adminActionPending || !adminAttendeeUserId}
					onclick={() => runAdminAction('check_out')}
				>
					Manual Check Out
				</button>
			</div>
		</div>
	</div>
	{#if adminActionMessage}<p class="mt-2 text-xs text-emerald-300">{adminActionMessage}</p>{/if}
	{#if adminActionError}<p class="mt-2 text-xs text-red-300">{adminActionError}</p>{/if}

	<div class="space-y-3">
		<h2 class="text-lg font-semibold">Member Sessions</h2>
		{#each filteredSessions as row (row.id)}
			<div class="rounded-xl border border-slate-800 bg-slate-900 p-3">
				<div class="flex flex-wrap items-center gap-2">
					<p class="font-semibold">{personLabel(row.attendee, row.attendee_user_id)}</p>
					<span class="rounded bg-slate-800 px-2 py-0.5 text-xs">{row.attendance_day}</span>
					<span class={`rounded px-2 py-0.5 text-xs ${row.check_out_at ? 'bg-sky-900/30 text-sky-200' : 'bg-amber-900/30 text-amber-200'}`}>
						{row.check_out_at ? 'Checked out' : 'Checked in'}
					</span>
					{#if row.counts_for_rank === false}
						<span class="rounded bg-violet-900/30 px-2 py-0.5 text-xs text-violet-200">No RR points</span>
					{/if}
				</div>
				<div class="mt-2 grid gap-2 text-sm md:grid-cols-3">
					<p><span class="text-slate-400">Check in:</span> {formatDateTime(row.check_in_at)}</p>
					<p><span class="text-slate-400">Check out:</span> {formatDateTime(row.check_out_at)}</p>
					<p><span class="text-slate-400">Last scanner:</span> {personLabel(row.lastScanner, row.last_scanned_by)}</p>
				</div>
				{#if timelineFor(row).length > 0}
					<div class="mt-2 rounded border border-slate-800 bg-slate-950/60 p-2">
						<p class="mb-1 text-xs font-semibold text-slate-400">Scan Timeline</p>
						<ul class="space-y-1 text-xs">
							{#each timelineFor(row) as event (event.id)}
								<li class="flex items-center justify-between gap-3">
									<span>{eventActionLabel(event.action)} by {personLabel(event.scannedBy, event.scanned_by_user_id)}</span>
									<span class="text-slate-500">{formatDateTime(event.created_at)}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-slate-400">No attendance sessions found.</p>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
			<div class="border-b border-slate-800 px-4 py-3"><p class="text-sm font-semibold">Display Activations</p></div>
			<table class="min-w-full text-sm">
				<thead class="bg-slate-800 text-left">
					<tr><th class="p-2">Created</th><th class="p-2">Activated at</th><th class="p-2">Activated by</th></tr>
				</thead>
				<tbody>
					{#each data.displays as row}
						<tr class="border-t border-slate-800">
							<td class="p-2">{formatDateTime(row.created_at)}</td>
							<td class="p-2">{row.activated_at ? formatDateTime(row.activated_at) : 'Inactive'}</td>
							<td class="p-2">{personLabel(row.activatedBy, row.activated_by)}</td>
						</tr>
					{:else}
						<tr class="border-t border-slate-800"><td colspan="3" class="p-3 text-slate-400">No display activations yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
			<div class="border-b border-slate-800 px-4 py-3"><p class="text-sm font-semibold">Recent Admin Kiosk Actions</p></div>
			<table class="min-w-full text-sm">
				<thead class="bg-slate-800 text-left">
					<tr><th class="p-2">Action</th><th class="p-2">By</th><th class="p-2">Time</th></tr>
				</thead>
				<tbody>
					{#each recentAdminEvents as event (event.id)}
						<tr class="border-t border-slate-800">
							<td class="p-2">{eventActionLabel(event.action)}</td>
							<td class="p-2">{personLabel(event.scannedBy, event.scanned_by_user_id)}</td>
							<td class="p-2">{formatDateTime(event.created_at)}</td>
						</tr>
					{:else}
						<tr class="border-t border-slate-800"><td colspan="3" class="p-3 text-slate-400">No kiosk toggle actions yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
		<div class="border-b border-slate-800 px-4 py-3">
			<p class="text-sm font-semibold">Guest Sign-Ins (Separate Admin View)</p>
		</div>
		<table class="min-w-full text-sm">
			<thead class="bg-slate-800 text-left">
				<tr>
					<th class="p-2">Day</th>
					<th class="p-2">Guest</th>
					<th class="p-2">Reason</th>
					<th class="p-2">Created by</th>
					<th class="p-2">Created at</th>
				</tr>
			</thead>
			<tbody>
				{#each data.guestSignins as row (row.id)}
					<tr class="border-t border-slate-800">
						<td class="p-2">{row.attendance_day}</td>
						<td class="p-2">{row.guest_name}</td>
						<td class="p-2">{row.reason || '—'}</td>
						<td class="p-2">{personLabel(row.createdBy, row.created_by_user_id)}</td>
						<td class="p-2">{formatDateTime(row.created_at)}</td>
					</tr>
				{:else}
					<tr class="border-t border-slate-800">
						<td colspan="5" class="p-3 text-slate-400">No guest sign-ins yet.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
