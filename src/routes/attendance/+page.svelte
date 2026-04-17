<script lang="ts">
	import { createBrowserClient } from '@supabase/ssr';
	import { env as publicEnv } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	let { data } = $props();

	let studentQrDataUrl = $state<string>('');
	let mentorQrDataUrl = $state<string>('');
	let error = $state('');
	let isActive = $state<boolean>(false);
	let currentBucket = $state('');
	let animateActivation = $state(false);
	let statePollingHandle: ReturnType<typeof setInterval> | null = null;
	const PUBLIC_SUPABASE_URL = publicEnv.PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
	const PUBLIC_SUPABASE_ANON_KEY = publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key';
	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

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

	const refreshQr = async () => {
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
		} catch {
			error = 'Could not refresh attendance QR.';
		}
	};

	$effect(() => {
		void refreshQr();
		if (statePollingHandle) clearInterval(statePollingHandle);
		statePollingHandle = setInterval(() => {
			void refreshQr();
		}, 4_000);
		const onVisible = () => {
			if (!document.hidden) void refreshQr();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			if (statePollingHandle) clearInterval(statePollingHandle);
			statePollingHandle = null;
		};
	});

	onMount(() => {
		const channel = supabase
			.channel('attendance-kiosk-live')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'attendance_display_sessions',
					filter: 'access_token=eq.public-attendance-display'
				},
				async () => {
					await refreshQr();
				}
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	});
</script>

<section class="fixed inset-0 flex flex-col bg-slate-950 px-6 py-0">
	<div class="flex flex-1 items-center justify-center">
		<div class="w-full max-w-6xl text-center">
			{#if !isActive}
				{#if studentQrDataUrl}
					<div
						class={`mx-auto aspect-square w-[min(92vw,50rem)] rounded-3xl bg-white p-6 transition-all duration-500 border-[14px] border-red-500 shadow-[0_0_48px_rgba(239,68,68,0.36)] ${
							animateActivation ? 'scale-[1.03]' : ''
						}`}
					>
						<img
							src={studentQrDataUrl}
							alt="Attendance activation QR code"
							class="h-full w-full rounded-2xl object-contain"
						/>
					</div>
				{/if}
			{:else}
				<div
					class={`grid gap-8 md:grid-cols-[1.4fr_1fr] ${animateActivation ? 'scale-[1.02]' : ''} transition-all duration-500`}
				>
					<div class="text-center">
						<p class="mb-3 text-3xl font-black uppercase tracking-[0.2em] text-sky-100">Student</p>
						{#if studentQrDataUrl}
							<div class="mx-auto aspect-square w-[min(60vw,30rem)] rounded-3xl border-2 border-sky-500 bg-white p-5 shadow-[0_0_36px_rgba(14,165,233,0.28)]">
								<img
									src={studentQrDataUrl}
									alt="Student attendance QR code"
									class="h-full w-full rounded-2xl object-contain"
								/>
							</div>
						{/if}
					</div>
					<div class="text-center">
						<p class="mb-3 text-2xl font-black uppercase tracking-[0.2em] text-sky-100">Mentor</p>
						{#if mentorQrDataUrl}
							<div class="mx-auto aspect-square w-[min(44vw,22rem)] rounded-3xl border-2 border-sky-500 bg-white p-4 shadow-[0_0_30px_rgba(14,165,233,0.26)]">
								<img
									src={mentorQrDataUrl}
									alt="Mentor attendance QR code"
									class="h-full w-full rounded-xl object-contain"
								/>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
	{#if error}
		<div class="pb-2">
			<p class="mt-3 text-sm text-red-300">{error}</p>
		</div>
	{/if}
</section>
