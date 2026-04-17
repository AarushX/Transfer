<script lang="ts">
	let { data } = $props();

	let studentQrDataUrl = $state<string>('');
	let mentorQrDataUrl = $state<string>('');
	let error = $state('');
	let manualRefreshing = $state(false);
	let isActive = $state<boolean>(false);
	let currentBucket = $state('');
	let animateActivation = $state(false);
	let statePollingHandle: ReturnType<typeof setInterval> | null = null;

	const applyActiveState = (nextActive: boolean) => {
		const changedToActive = !isActive && nextActive;
		isActive = nextActive;
		if (changedToActive) {
			animateActivation = true;
			setTimeout(() => (animateActivation = false), 1400);
		}
	};

	$effect(() => {
		studentQrDataUrl = String(data.studentQrDataUrl ?? '');
		mentorQrDataUrl = String(data.mentorQrDataUrl ?? '');
		applyActiveState(Boolean(data.isActive));
		currentBucket = String(data.bucket ?? '');
	});

	const refreshQr = async (showManualLoading = false) => {
		if (showManualLoading) manualRefreshing = true;
		try {
			const res = await fetch(`/api/attendance/public/refresh?t=${Date.now()}`, {
				method: 'POST',
				cache: 'no-store'
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				error = body?.error ?? 'Could not refresh attendance QR.';
				return;
			}
			studentQrDataUrl = String(body?.studentQrDataUrl ?? '');
			mentorQrDataUrl = String(body?.mentorQrDataUrl ?? '');
			applyActiveState(Boolean(body?.isActive));
			currentBucket = String(body?.bucket ?? currentBucket);
			error = '';
		} finally {
			if (showManualLoading) manualRefreshing = false;
		}
	};

	const pollState = async () => {
		const res = await fetch(`/api/attendance/public/state?t=${Date.now()}`, {
			cache: 'no-store'
		});
		const body = await res.json().catch(() => null);
		if (!res.ok || !body) return;
		const nextActive = Boolean(body.isActive);
		const nextBucket = String(body.bucket ?? '');
		if (nextActive !== isActive || (nextActive && nextBucket && nextBucket !== currentBucket)) {
			await refreshQr();
		}
	};

	$effect(() => {
		void refreshQr();
		if (statePollingHandle) clearInterval(statePollingHandle);
		statePollingHandle = setInterval(() => {
			void pollState();
		}, 4_000);
		const onVisible = () => {
			if (!document.hidden) void pollState();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			if (statePollingHandle) clearInterval(statePollingHandle);
			statePollingHandle = null;
		};
	});
</script>

<section class="fixed inset-0 flex flex-col bg-slate-950 px-6 py-0">
	<div class="pt-2 text-center">
		<p class={`text-xs font-semibold uppercase tracking-[0.24em] ${isActive ? 'text-sky-300' : 'text-red-300'}`}>
			{isActive ? 'Attendance Active' : 'Attendance Inactive'}
		</p>
	</div>
	<div class="flex flex-1 items-center justify-center">
		<div class="w-full max-w-6xl text-center">
		<div class="grid gap-6 md:grid-cols-[2fr_1fr]">
			<div class="text-center">
				<p class="mb-3 text-4xl font-black uppercase tracking-[0.2em] text-slate-100">Students</p>
				{#if studentQrDataUrl}
					<div
						class={`mx-auto aspect-square w-[min(86vw,42rem)] rounded-3xl bg-white p-5 transition-all duration-500 ${
							isActive
								? 'border-2 border-sky-500 shadow-[0_0_40px_rgba(14,165,233,0.28)]'
								: 'border-[10px] border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.26)]'
						} ${animateActivation ? 'scale-[1.03] shadow-[0_0_0_12px_rgba(56,189,248,0.22)]' : ''}`}
					>
						<img
							src={studentQrDataUrl}
							alt="Student attendance QR code"
							class="h-full w-full rounded-2xl object-contain"
						/>
					</div>
				{/if}
			</div>
			<div class="text-center">
				<p class="mb-3 text-2xl font-black uppercase tracking-[0.2em] text-slate-100">Mentors</p>
				{#if mentorQrDataUrl}
					<div
						class={`mx-auto aspect-square w-[min(44vw,18rem)] rounded-3xl bg-white p-4 transition-all duration-500 ${
							isActive
								? 'border-2 border-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.26)]'
								: 'border-[8px] border-red-500 shadow-[0_0_34px_rgba(239,68,68,0.26)]'
						} ${animateActivation ? 'scale-[1.03]' : ''}`}
					>
						<img
							src={mentorQrDataUrl}
							alt="Mentor attendance QR code"
							class="h-full w-full rounded-xl object-contain"
						/>
					</div>
				{/if}
			</div>
		</div>
		</div>
	</div>
	<div class="pb-2">
		<div class="flex items-center justify-center gap-3">
			<button
				type="button"
				onclick={() => refreshQr(true)}
				disabled={manualRefreshing}
				class="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
			>
				{manualRefreshing ? 'Refreshing' : 'Refresh'}
			</button>
		</div>
		{#if error}<p class="mt-3 text-sm text-red-300">{error}</p>{/if}
	</div>
</section>
