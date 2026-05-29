<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassTable from '$lib/components/ui/GlassTable.svelte';
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

	const gi = 'rounded-lg border px-3 py-2 backdrop-blur-sm';
	const gs =
		'border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);';

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
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Admin</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Attendance</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Tracks daily check-in/check-out sessions plus individual scan events.
		</p>
	</header>

	<div class="fade-up grid gap-3 md:grid-cols-4" style="animation-delay: 0.05s;">
		<div
			class="rounded-2xl border p-4 backdrop-blur-xl"
			style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);"
		>
			<p class="eyebrow-label">Sessions</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{summary.sessions}</p>
		</div>
		<div
			class="rounded-2xl border p-4 backdrop-blur-xl"
			style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);"
		>
			<p class="eyebrow-label">Checked in</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-success);">
				{summary.checkedIn}
			</p>
		</div>
		<div
			class="rounded-2xl border p-4 backdrop-blur-xl"
			style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);"
		>
			<p class="eyebrow-label">Checked out</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-info);">
				{summary.checkedOut}
			</p>
		</div>
		<div
			class="rounded-2xl border p-4 backdrop-blur-xl"
			style="border-color: var(--app-glass-border); background: var(--app-glass-bg); box-shadow: var(--app-glass-shadow);"
		>
			<p class="eyebrow-label">Still open</p>
			<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-warning);">{summary.open}</p>
		</div>
	</div>

	<div
		class="fade-up rounded-2xl border p-3 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.1s;"
	>
		<div class="grid gap-2 md:grid-cols-[1fr_auto_auto]">
			<input class={gi} style={gs} placeholder="Search attendee/scanner..." bind:value={query} />
			<input class={gi} style={gs} type="date" bind:value={dayFilter} />
			{#if query || dayFilter}
				<Button
					variant="secondary"
					onclick={() => {
						query = '';
						dayFilter = '';
					}}>Clear</Button
				>
			{/if}
		</div>
	</div>

	<div class="fade-up grid gap-4 lg:grid-cols-2" style="animation-delay: 0.15s;">
		<div
			class="rounded-2xl border p-5 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Manual Kiosk Toggle</h2>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
				Directly activate or deactivate the attendance display.
			</p>
			<div class="mt-3 grid gap-2 md:grid-cols-2">
				<button
					class="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
					style="background: var(--app-success);"
					disabled={adminActionPending}
					onclick={() => runAdminAction('activate')}
				>
					Activate
				</button>
				<button
					class="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
					style="background: var(--app-danger);"
					disabled={adminActionPending}
					onclick={() => runAdminAction('deactivate')}
				>
					Deactivate
				</button>
			</div>
		</div>

		<div
			class="rounded-2xl border p-5 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">
				Manual Member Attendance
			</h2>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
				Forced check-in/check-out actions for a selected member.
			</p>
			<div class="mt-3 grid gap-2 md:grid-cols-[1fr_1fr]">
				<select class={gi} style={gs} bind:value={adminAttendeeUserId}>
					<option value="">Select member for check-in/out...</option>
					{#each data.members as member (member.id)}
						<option value={member.id}>{member.label}</option>
					{/each}
				</select>
				<input
					class={gi}
					style={gs}
					placeholder="Note (optional)"
					bind:value={adminNote}
					maxlength="300"
				/>
			</div>
			<div class="mt-2 grid gap-2 md:grid-cols-2">
				<Button
					variant="primary"
					disabled={adminActionPending || !adminAttendeeUserId}
					onclick={() => runAdminAction('check_in')}>Manual Check In</Button
				>
				<Button
					variant="primary"
					disabled={adminActionPending || !adminAttendeeUserId}
					onclick={() => runAdminAction('check_out')}>Manual Check Out</Button
				>
			</div>
			{#if !adminAttendeeUserId}
				<p class="mt-1.5 text-[11px]" style="color: var(--app-text-dim);">
					Pick a member above to enable these actions.
				</p>
			{/if}
		</div>
	</div>
	{#if adminActionMessage}<p class="mt-2 text-xs" style="color: var(--app-success);">
			{adminActionMessage}
		</p>{/if}
	{#if adminActionError}<p class="mt-2 text-xs" style="color: var(--app-danger);">
			{adminActionError}
		</p>{/if}

	<div class="fade-up space-y-3" style="animation-delay: 0.2s;">
		<h2 class="text-lg font-semibold" style="color: var(--app-text);">Member sessions</h2>
		{#each filteredSessions as row (row.id)}
			<div
				class="rounded-xl border p-3 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<div class="flex flex-wrap items-center gap-2">
					<p class="font-semibold" style="color: var(--app-text);">
						{personLabel(row.attendee, row.attendee_user_id)}
					</p>
					<span
						class="rounded-lg px-2 py-0.5 text-xs"
						style="background: var(--app-surface-alt); color: var(--app-text);"
						>{row.attendance_day}</span
					>
					<span
						class="rounded-lg px-2 py-0.5 text-xs"
						style={row.check_out_at
							? `background: color-mix(in srgb, var(--app-info) 15%, transparent); color: color-mix(in srgb, var(--app-info) 80%, white);`
							: `background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: color-mix(in srgb, var(--app-warning) 80%, white);`}
					>
						{row.check_out_at ? 'Checked out' : 'Checked in'}
					</span>
					{#if row.counts_for_rank === false}
						<span
							class="rounded-lg px-2 py-0.5 text-xs"
							style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: color-mix(in srgb, var(--app-accent) 80%, white);"
							>No RR points</span
						>
					{/if}
				</div>
				<div class="mt-2 grid gap-2 text-sm md:grid-cols-3">
					<p>
						<span style="color: var(--app-text-muted);">Check in:</span>
						<span style="color: var(--app-text);">{formatDateTime(row.check_in_at)}</span>
					</p>
					<p>
						<span style="color: var(--app-text-muted);">Check out:</span>
						<span style="color: var(--app-text);">{formatDateTime(row.check_out_at)}</span>
					</p>
					<p>
						<span style="color: var(--app-text-muted);">Last scanner:</span>
						<span style="color: var(--app-text);"
							>{personLabel(row.lastScanner, row.last_scanned_by)}</span
						>
					</p>
				</div>
				{#if timelineFor(row).length > 0}
					<div
						class="mt-2 rounded-lg border p-2"
						style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
					>
						<p class="mb-1 text-xs font-semibold" style="color: var(--app-text-muted);">
							Scan Timeline
						</p>
						<ul class="space-y-1 text-xs">
							{#each timelineFor(row) as event (event.id)}
								<li class="flex items-center justify-between gap-3">
									<span style="color: var(--app-text);"
										>{eventActionLabel(event.action)} by {personLabel(
											event.scannedBy,
											event.scanned_by_user_id
										)}</span
									>
									<span style="color: var(--app-text-muted);"
										>{formatDateTime(event.created_at)}</span
									>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{:else}
			<p style="color: var(--app-text-muted);">No attendance sessions found.</p>
		{/each}
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<GlassTable>
			<thead>
				<tr
					><th class="p-2" colspan="3" style="font-size: 0.875rem; font-weight: 600;"
						>Display Activations</th
					></tr
				>
				<tr
					><th class="p-2">Created</th><th class="p-2">Activated at</th><th class="p-2"
						>Activated by</th
					></tr
				>
			</thead>
			<tbody>
				{#each data.displays as row (row.id)}
					<tr>
						<td class="p-2">{formatDateTime(row.created_at)}</td>
						<td class="p-2">{row.activated_at ? formatDateTime(row.activated_at) : 'Inactive'}</td>
						<td class="p-2">{personLabel(row.activatedBy, row.activated_by)}</td>
					</tr>
				{:else}
					<tr
						><td colspan="3" class="p-3" style="color: var(--app-text-muted);"
							>No display activations yet.</td
						></tr
					>
				{/each}
			</tbody>
		</GlassTable>

		<GlassTable>
			<thead>
				<tr
					><th class="p-2" colspan="3" style="font-size: 0.875rem; font-weight: 600;"
						>Recent Admin Kiosk Actions</th
					></tr
				>
				<tr><th class="p-2">Action</th><th class="p-2">By</th><th class="p-2">Time</th></tr>
			</thead>
			<tbody>
				{#each recentAdminEvents as event (event.id)}
					<tr>
						<td class="p-2">{eventActionLabel(event.action)}</td>
						<td class="p-2">{personLabel(event.scannedBy, event.scanned_by_user_id)}</td>
						<td class="p-2">{formatDateTime(event.created_at)}</td>
					</tr>
				{:else}
					<tr
						><td colspan="3" class="p-3" style="color: var(--app-text-muted);"
							>No kiosk toggle actions yet.</td
						></tr
					>
				{/each}
			</tbody>
		</GlassTable>
	</div>

	<GlassTable>
		<thead>
			<tr
				><th class="p-2" colspan="5" style="font-size: 0.875rem; font-weight: 600;"
					>Guest Sign-Ins (Separate Admin View)</th
				></tr
			>
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
				<tr>
					<td class="p-2">{row.attendance_day}</td>
					<td class="p-2">{row.guest_name}</td>
					<td class="p-2">{row.reason || '—'}</td>
					<td class="p-2">{personLabel(row.createdBy, row.created_by_user_id)}</td>
					<td class="p-2">{formatDateTime(row.created_at)}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" class="p-3" style="color: var(--app-text-muted);"
						>No guest sign-ins yet.</td
					>
				</tr>
			{/each}
		</tbody>
	</GlassTable>
</section>
