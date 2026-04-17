<script lang="ts">
	let { data } = $props();

	let qrDataUrl = $state<string>('');
	let error = $state('');
	let manualRefreshing = $state(false);
	let isActive = $state<boolean>(false);
	let animateActivation = $state(false);
	let previousActive = $state(false);
	let pollingHandle: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		qrDataUrl = String(data.qrDataUrl ?? '');
		isActive = Boolean(data.isActive);
		if (!previousActive && isActive) {
			animateActivation = true;
			setTimeout(() => (animateActivation = false), 1400);
		}
		previousActive = isActive;
	});

	const refreshQr = async (showManualLoading = false) => {
		if (showManualLoading) manualRefreshing = true;
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
			if (showManualLoading) manualRefreshing = false;
		}
	};

	const restartPolling = () => {
		if (pollingHandle) clearInterval(pollingHandle);
		const ms = isActive ? 15_000 : 4_000;
		pollingHandle = setInterval(() => {
			void refreshQr();
		}, ms);
	};

	$effect(() => {
		void refreshQr();
		restartPolling();
		const onVisible = () => {
			if (!document.hidden) void refreshQr();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			if (pollingHandle) clearInterval(pollingHandle);
			pollingHandle = null;
		};
	});
</script>

<section class="fixed inset-0 flex items-center justify-center bg-slate-950 p-6">
	<div class="w-full max-w-xl text-center">
		<p class={`mb-4 text-xs font-semibold uppercase tracking-[0.24em] ${isActive ? 'text-sky-300' : 'text-red-300'}`}>
			{isActive ? 'Attendance Active' : 'Attendance Inactive'}
		</p>
		{#if qrDataUrl}
			<div
				class={`mx-auto aspect-square w-[min(86vw,34rem)] rounded-3xl border-2 bg-white p-5 transition-all duration-500 ${
					isActive ? 'border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.28)]' : 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
				} ${animateActivation ? 'scale-[1.03] shadow-[0_0_0_12px_rgba(56,189,248,0.22)]' : ''}`}
			>
				<img
					src={qrDataUrl}
					alt="Attendance QR code"
					class="h-full w-full rounded-2xl object-contain"
				/>
			</div>
		{/if}
		<div class="mt-5 flex items-center justify-center gap-3">
			<button
				type="button"
				onclick={() => refreshQr(true)}
				disabled={manualRefreshing}
				class="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
			>
				{manualRefreshing ? 'Refreshing' : 'Refresh'}
			</button>
			<span class="text-xs text-slate-500">4:30am day boundary</span>
		</div>
		{#if error}<p class="mt-3 text-sm text-red-300">{error}</p>{/if}
	</div>
</section>
