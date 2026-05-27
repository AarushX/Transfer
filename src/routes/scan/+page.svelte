<script lang="ts">
	import QRScanner from '$lib/components/QRScanner.svelte';
	let { data } = $props();

	let status = $state<'idle' | 'checking' | 'ok' | 'denied'>('idle');
	let message = $state('');
	let machine = $state<{ name?: string; description?: string } | null>(null);
	let lastToken = $state('');
	let releaseLastTokenHandle: ReturnType<typeof setTimeout> | null = null;

	let installPromptEvent = $state<any>(null);
	let canInstall = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const onPrompt = (e: any) => {
			e.preventDefault();
			installPromptEvent = e;
			canInstall = true;
		};
		window.addEventListener('beforeinstallprompt', onPrompt);
		return () => window.removeEventListener('beforeinstallprompt', onPrompt);
	});
	const promptInstall = async () => {
		if (!installPromptEvent) return;
		installPromptEvent.prompt();
		const result = await installPromptEvent.userChoice;
		if (result?.outcome === 'accepted') {
			canInstall = false;
			installPromptEvent = null;
		}
	};

	let showAdmin = $state(false);
	let manualAttendeeUserId = $state('');
	let manualReason = $state('');
	let manualMessage = $state('');
	let manualError = $state('');
	let manualSaving = $state(false);

	const extractJwtCandidate = (value: string) => {
		const trimmed = value.trim();
		const jwtMatch = trimmed.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
		return jwtMatch?.[0] ?? trimmed;
	};

	const authorize = async (token: string) => {
		if (!token || status === 'checking' || token === lastToken) return;
		lastToken = token;
		const normalizedToken = extractJwtCandidate(token);
		status = 'checking';
		message = '';
		machine = null;
		try {
			const checkoffRes = await fetch('/api/mentor/checkoff', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'approve', checkoffToken: normalizedToken })
			});
			const checkoffBody = await checkoffRes.json().catch(() => null);
			if (checkoffRes.ok) {
				status = 'ok';
				message = 'Checkoff approved.';
				return;
			}

			const res = await fetch('/api/machines/use', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ machineToken: token })
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				const attendanceRes = await fetch('/api/attendance/scan', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ token: normalizedToken })
				});
				const attendanceBody = await attendanceRes.json().catch(() => null);
				if (attendanceRes.ok) {
					status = 'ok';
					if (attendanceBody?.action === 'activate') message = 'Kiosk activated.';
					else if (attendanceBody?.action === 'deactivate') message = 'Kiosk disabled.';
					else if (attendanceBody?.action === 'check_out') message = 'Checked out.';
					else message = 'Checked in.';
					return;
				}
				status = 'denied';
				message = checkoffBody?.error ?? attendanceBody?.error ?? body?.error ?? 'Not authorized.';
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
				body: JSON.stringify({
					attendeeUserId: manualAttendeeUserId,
					reason: manualReason.trim() || null
				})
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

<section class="mx-auto max-w-2xl space-y-5">
	<header class="text-center">
		<h1 class="text-2xl font-bold tracking-tight" style="color: var(--app-text);">Scan</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Point at any QR — machines, checkoffs, attendance.
		</p>
	</header>

	<div
		class="overflow-hidden rounded-2xl border backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	>
		<div class="p-3">
			<QRScanner onDecoded={(v: string) => authorize(v.trim())} />
		</div>
	</div>

	{#if status === 'idle'}
		<p class="text-center text-xs" style="color: var(--app-text-dim);">Waiting for a scan…</p>
	{:else if status === 'checking'}
		<p class="text-center text-sm" style="color: var(--app-text-muted);">Checking…</p>
	{:else if status === 'ok'}
		<div
			class="rounded-2xl border p-4 text-center"
			style="border-color: color-mix(in srgb, var(--app-success) 35%, transparent); background: color-mix(in srgb, var(--app-success) 8%, transparent);"
		>
			<p
				class="text-[11px] font-semibold tracking-[0.18em] uppercase"
				style="color: var(--app-success);"
			>
				✓ {machine?.name ?? 'Done'}
			</p>
			<p class="mt-1 text-sm" style="color: var(--app-text);">{message}</p>
			{#if machine?.description}
				<p class="mt-2 text-xs" style="color: var(--app-text-muted);">{machine.description}</p>
			{/if}
		</div>
	{:else}
		<div
			class="rounded-2xl border p-4 text-center"
			style="border-color: color-mix(in srgb, var(--app-danger) 35%, transparent); background: color-mix(in srgb, var(--app-danger) 8%, transparent);"
		>
			<p
				class="text-[11px] font-semibold tracking-[0.18em] uppercase"
				style="color: var(--app-danger);"
			>
				Denied
			</p>
			<p class="mt-1 text-sm" style="color: var(--app-text);">{message}</p>
		</div>
	{/if}

	{#if canInstall}
		<div class="flex justify-center">
			<button
				type="button"
				onclick={promptInstall}
				class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-3.5 w-3.5"><path d="M12 4v12m0 0l-4-4m4 4l4-4" /><path d="M5 20h14" /></svg
				>
				Add to home screen
			</button>
		</div>
	{/if}

	{#if data.canManageAttendance}
		<details
			class="rounded-2xl border"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			bind:open={showAdmin}
		>
			<summary
				class="cursor-pointer px-4 py-3 text-sm font-semibold select-none"
				style="color: var(--app-text);"
			>
				Admin tools
			</summary>
			<div class="space-y-3 px-4 pb-4">
				<div>
					<p
						class="text-xs font-semibold tracking-wider uppercase"
						style="color: var(--app-text-muted);"
					>
						Manual attendance · no RR
					</p>
					<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
						For members who can't scan. Excluded from RR points.
					</p>
				</div>
				<div class="space-y-2">
					<select
						class="w-full rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						bind:value={manualAttendeeUserId}
					>
						<option value="">Select member…</option>
						{#each data.members as member}
							<option value={member.id}>{member.label}</option>
						{/each}
					</select>
					<input
						class="w-full rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						placeholder="Reason (optional)"
						bind:value={manualReason}
						maxlength="300"
					/>
					<button
						class="w-full rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
						style="background: var(--app-accent); color: var(--app-accent-text);"
						disabled={!manualAttendeeUserId || manualSaving}
						onclick={submitManualCheckIn}
					>
						{manualSaving ? 'Saving…' : 'Record manual check-in'}
					</button>
					{#if manualMessage}<p class="text-xs" style="color: var(--app-success);">
							{manualMessage}
						</p>{/if}
					{#if manualError}<p class="text-xs" style="color: var(--app-danger);">
							{manualError}
						</p>{/if}
				</div>
			</div>
		</details>
	{/if}
</section>
