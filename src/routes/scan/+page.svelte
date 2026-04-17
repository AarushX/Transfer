<script lang="ts">
	import QRScanner from '$lib/components/QRScanner.svelte';
	let { data } = $props();

	let status = $state<'idle' | 'checking' | 'ok' | 'denied'>('idle');
	let message = $state('');
	let machine = $state<{ name?: string; description?: string } | null>(null);
	let lastToken = $state('');
	let releaseLastTokenHandle: ReturnType<typeof setTimeout> | null = null;

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
			}, 900);
		}
	};

	// Auto-authorize if arriving with ?machine=...
	$effect(() => {
		if (data.machineToken) authorize(data.machineToken);
	});

</script>

<section class="space-y-6">
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Scan</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight">Machine &amp; shop access</h1>
		<p class="mt-2 max-w-2xl text-sm text-slate-400">
			Point your camera at a machine's QR code. Authorization is checked against your completed
			training. Shop attendance scanning will land here next.
		</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
		<div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
			<div class="border-b border-slate-800 px-5 py-3">
				<p class="text-sm font-medium">Scanner</p>
			</div>
			<div class="p-4">
				<QRScanner onDecoded={(v: string) => authorize(v.trim())} />
			</div>
		</div>

		<div class="space-y-4">
			{#if status === 'idle'}
				<div class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
					Waiting for a scan…
				</div>
			{:else if status === 'checking'}
				<div class="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-300">
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

			<p class="text-center text-xs text-slate-500">Ready for next scan automatically.</p>
		</div>
	</div>
</section>
