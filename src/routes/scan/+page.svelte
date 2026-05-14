<script lang="ts">
	import QRScanner from '$lib/components/QRScanner.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();

	let status = $state<'idle' | 'checking' | 'ok' | 'denied'>('idle');
	let message = $state('');
	let machine = $state<{ name?: string; description?: string } | null>(null);
	let lastToken = $state('');
	let releaseLastTokenHandle: ReturnType<typeof setTimeout> | null = null;
	let manualAttendeeUserId = $state('');
	let manualReason = $state('');
	let manualMessage = $state('');
	let manualError = $state('');
	let manualSaving = $state(false);

	const authorize = async (token: string) => {
		if (!token || status === 'checking' || token === lastToken) return;
		lastToken = token;
		status = 'checking';
		message = '';
		machine = null;
		try {
			// First, allow mentor/admin checkoff approval QR tokens from module pages.
			const checkoffRes = await fetch('/api/mentor/checkoff', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'approve', checkoffToken: token })
			});
			const checkoffBody = await checkoffRes.json().catch(() => null);
			if (checkoffRes.ok) {
				status = 'ok';
				message = 'Checkoff approved from QR.';
				machine = null;
				return;
			}

			const res = await fetch('/api/machines/use', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ machineToken: token })
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				// Fall back to attendance scan flow when this QR is not a machine token.
				const attendanceRes = await fetch('/api/attendance/scan', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ token })
				});
				const attendanceBody = await attendanceRes.json().catch(() => null);
				if (attendanceRes.ok) {
					status = 'ok';
					if (attendanceBody?.action === 'activate') {
						message = 'Attendance kiosk activated.';
					} else if (attendanceBody?.action === 'deactivate') {
						message = 'Attendance kiosk disabled.';
					} else {
						message =
							attendanceBody?.action === 'check_out'
								? 'Attendance check-out recorded.'
								: 'Attendance check-in recorded.';
					}
					machine = null;
					return;
				}
				status = 'denied';
				message =
					body?.error ??
					checkoffBody?.error ??
					attendanceBody?.error ??
					'Not authorized.';
				machine = body?.machine ?? null;
				return;
			}
			status = 'ok';
			message = body?.message ?? 'Authorized.';
			machine = body?.machine ?? null;
		} catch {
			status = 'denied';
			message = 'Network error. Try again.';
		} finally {
			if (releaseLastTokenHandle) clearTimeout(releaseLastTokenHandle);
			releaseLastTokenHandle = setTimeout(() => {
				lastToken = '';
				releaseLastTokenHandle = null;
			}, 4500);
		}
	};

	// Auto-authorize if arriving with ?machine=...
	$effect(() => {
		if (data.machineToken) authorize(data.machineToken);
	});

	const submitManualCheckIn = async () => {
		if (!manualAttendeeUserId || manualSaving) return;
		manualSaving = true;
		manualError = '';
		manualMessage = '';
		try {
			const res = await fetch('/api/attendance/manual', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ attendeeUserId: manualAttendeeUserId, reason: manualReason.trim() || null })
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				manualError = body?.error ?? 'Manual attendance failed.';
				return;
			}
			manualMessage = 'Manual check-in recorded (excluded from RR).';
			manualReason = '';
		} catch {
			manualError = 'Network error. Try again.';
		} finally {
			manualSaving = false;
		}
	};

</script>

<section class="space-y-6">
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Scan</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight" style="color: var(--app-text);">Machine &amp; shop access</h1>
		<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">
			Point your camera at a machine's QR code. Authorization is checked against your completed
			training. Shop attendance scanning will land here next.
		</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
		<div class="overflow-hidden rounded-xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="border-b px-5 py-3" style="border-color: var(--app-glass-border);">
				<p class="text-sm font-medium" style="color: var(--app-text);">Scanner</p>
			</div>
			<div class="p-4">
				<QRScanner onDecoded={(v: string) => authorize(v.trim())} />
			</div>
		</div>

		<div class="space-y-4">
			{#if status === 'idle'}
				<div class="rounded-xl border border-dashed p-6 text-center text-sm" style="border-color: var(--app-glass-border); color: var(--app-text-muted);">
					Waiting for a scan…
				</div>
			{:else if status === 'checking'}
				<div class="rounded-xl border p-6 text-center text-sm backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">
					Checking authorization…
				</div>
			{:else if status === 'ok'}
				<div class="rounded-xl border border-emerald-700 bg-emerald-900/30 p-6">
					<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
						Authorized
					</p>
					<p class="mt-2 text-xl font-semibold text-emerald-900">{machine?.name ?? 'Machine'}</p>
					<p class="mt-1 text-sm text-emerald-900/80">{message}</p>
					{#if machine?.description}
						<p class="mt-3 border-t border-emerald-700 pt-3 text-sm text-emerald-900/80">
							{machine.description}
						</p>
					{/if}
				</div>
			{:else}
				<div class="rounded-xl border border-red-700 bg-red-900/30 p-6">
					<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">Denied</p>
					<p class="mt-2 text-xl font-semibold text-red-900">{machine?.name ?? 'Not authorized'}</p>
					<p class="mt-1 text-sm text-red-900/80">{message}</p>
				</div>
			{/if}

			<p class="text-center text-xs" style="color: var(--app-text-muted);">Ready for next scan automatically.</p>
		</div>
	</div>

	{#if data.canManageAttendance}
		<div class="grid gap-4">
			<GlassCard>
				<p class="text-sm font-semibold" style="color: var(--app-text);">Manual Attendance Assist (No RR)</p>
				<p class="mt-1 text-xs" style="color: var(--app-text-muted);">Use when a member cannot scan. This records attendance but excludes RR points.</p>
				<div class="mt-3 space-y-2">
					<select class="w-full rounded px-3 py-2 text-sm" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" bind:value={manualAttendeeUserId}>
						<option value="">Select member...</option>
						{#each data.members as member}
							<option value={member.id}>{member.label}</option>
						{/each}
					</select>
					<input
						class="w-full rounded px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
						placeholder="Reason (optional)"
						bind:value={manualReason}
						maxlength="300"
					/>
					<Button
						variant="primary"
						disabled={!manualAttendeeUserId || manualSaving}
						onclick={submitManualCheckIn}
					>
						{manualSaving ? 'Saving...' : 'Manual Check-In'}
					</Button>
					{#if manualMessage}<p class="text-xs text-emerald-300">{manualMessage}</p>{/if}
					{#if manualError}<p class="text-xs text-red-300">{manualError}</p>{/if}
				</div>
			</GlassCard>
		</div>
	{/if}
</section>
