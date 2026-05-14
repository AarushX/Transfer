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
	<header class="fade-up">
		<p class="eyebrow-label">Scan</p>
		<h1 class="gradient-text mt-1 text-3xl font-bold tracking-tight">Machine & shop access</h1>
		<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">
			Point your camera at a machine's QR code. Authorization is checked against your completed
			training. Shop attendance scanning will land here next.
		</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
		<!-- Scanner card -->
		<div class="fade-up relative overflow-hidden rounded-2xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<div class="relative border-b px-5 py-3" style="border-color: var(--app-glass-border);">
				<div class="flex items-center gap-2">
					<div class="live-dot" style="color: var(--app-success);"></div>
					<p class="text-sm font-medium" style="color: var(--app-text);">Scanner</p>
				</div>
			</div>
			<div class="relative p-4">
				<QRScanner onDecoded={(v: string) => authorize(v.trim())} />
			</div>
		</div>

		<!-- Status panel -->
		<div class="space-y-4">
			{#if status === 'idle'}
				<div class="fade-up rounded-2xl border border-dashed p-6 text-center backdrop-blur-xl" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);">
					<p class="text-sm" style="color: var(--app-text-dim);">Waiting for a scan...</p>
				</div>
			{:else if status === 'checking'}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-6 text-center backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<p class="relative text-sm" style="color: var(--app-text-muted);">Checking authorization...</p>
				</div>
			{:else if status === 'ok'}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-6" style="background: color-mix(in srgb, var(--app-success) 10%, transparent); border-color: color-mix(in srgb, var(--app-success) 30%, transparent); box-shadow: 0 0 24px -8px color-mix(in srgb, var(--app-success) 25%, transparent);">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<div class="relative">
						<span class="chip-emerald inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
							<span class="live-dot" style="color: var(--app-success); width: 6px; height: 6px;"></span>
							Authorized
						</span>
						<p class="mt-3 text-xl font-semibold" style="color: var(--app-text);">{machine?.name ?? 'Machine'}</p>
						<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{message}</p>
						{#if machine?.description}
							<p class="mt-3 border-t pt-3 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 20%, transparent); color: var(--app-text-muted);">
								{machine.description}
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-6" style="background: color-mix(in srgb, var(--app-danger) 10%, transparent); border-color: color-mix(in srgb, var(--app-danger) 30%, transparent); box-shadow: 0 0 24px -8px color-mix(in srgb, var(--app-danger) 25%, transparent);">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<div class="relative">
						<span class="chip-rose inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
							Denied
						</span>
						<p class="mt-3 text-xl font-semibold" style="color: var(--app-text);">{machine?.name ?? 'Not authorized'}</p>
						<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{message}</p>
					</div>
				</div>
			{/if}

			<p class="text-center text-xs" style="color: var(--app-text-dim);">Ready for next scan automatically.</p>
		</div>
	</div>

	{#if data.canManageAttendance}
		<div class="fade-up grid gap-4" style="animation-delay: 0.1s;">
			<div class="relative overflow-hidden rounded-2xl border backdrop-blur-xl p-5" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
				<div class="relative">
					<p class="eyebrow-label">Attendance Assist</p>
					<p class="mt-1 text-sm font-semibold" style="color: var(--app-text);">Manual Attendance (No RR)</p>
					<p class="mt-1 text-xs" style="color: var(--app-text-dim);">Use when a member cannot scan. This records attendance but excludes RR points.</p>
					<div class="mt-4 space-y-3">
						<select
							class="w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
							style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
							bind:value={manualAttendeeUserId}
						>
							<option value="">Select member...</option>
							{#each data.members as member}
								<option value={member.id}>{member.label}</option>
							{/each}
						</select>
						<input
							class="w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
							style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
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
						{#if manualMessage}
							<p class="chip-emerald inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium">{manualMessage}</p>
						{/if}
						{#if manualError}
							<p class="chip-rose inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium">{manualError}</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>
