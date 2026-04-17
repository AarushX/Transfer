<script lang="ts">
	let { data } = $props();

	let qrDataUrl = $state<string>('');
	let error = $state('');
	let refreshing = $state(false);
	let isActive = $state<boolean>(false);
	let animateActivation = $state(false);
	let previousActive = $state(false);

	$effect(() => {
		qrDataUrl = String(data.qrDataUrl ?? '');
		isActive = Boolean(data.isActive);
		if (!previousActive && isActive) {
			animateActivation = true;
			setTimeout(() => (animateActivation = false), 1400);
		}
		previousActive = isActive;
	});

	const refreshQr = async () => {
		refreshing = true;
		try {
			const res = await fetch('/api/attendance/public/refresh', {
				method: 'POST'
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				error = body?.error ?? 'Could not refresh attendance QR.';
				return;
			}
			qrDataUrl = String(body?.qrDataUrl ?? '');
			isActive = Boolean(body?.isActive);
			error = '';
		} finally {
			refreshing = false;
		}
	};

	$effect(() => {
		const timer = setInterval(() => {
			if (!isActive) {
				void refreshQr();
				return;
			}
			const now = new Date();
			if (now.getMinutes() === 0) void refreshQr();
		}, 30_000);
		return () => clearInterval(timer);
	});
</script>

<section class="mx-auto max-w-xl space-y-5 py-4">
	<div class={`rounded-xl border p-5 text-center transition-colors duration-500 ${isActive ? 'border-sky-500 bg-slate-900' : 'border-red-500 bg-red-950/20'}`}>
		<p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Attendance QR</p>
		<h1 class="mt-1 text-2xl font-semibold">Shop Attendance</h1>
		<p class="mt-2 text-sm text-slate-400">
			{#if isActive}
				Active. Anyone scanning this QR is toggled check-in/check-out for the 4:30 AM - 4:29 AM day.
			{:else}
				Inactive. Mentor scans this red QR once to activate. Student scans of red QR do not mark attendance.
			{/if}
		</p>
		{#if qrDataUrl}
			<img
				src={qrDataUrl}
				alt="Attendance QR code"
				class={`mx-auto mt-4 w-72 max-w-full rounded-lg bg-white p-3 transition-all duration-500 ${isActive ? 'border-2 border-sky-500' : 'border-2 border-red-500'} ${animateActivation ? 'scale-105 shadow-[0_0_0_8px_rgba(56,189,248,0.22)]' : ''}`}
			/>
		{/if}
		<div class="mt-4 flex justify-center">
			<button
				type="button"
				onclick={refreshQr}
				disabled={refreshing}
				class="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
			>
				{refreshing ? 'Refreshing…' : 'Refresh QR'}
			</button>
		</div>
		{#if error}<p class="mt-3 text-sm text-red-300">{error}</p>{/if}
	</div>
</section>
