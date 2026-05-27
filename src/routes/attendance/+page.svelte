<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import { env as publicEnv } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	let { data } = $props();

	let studentQrDataUrl = $state<string>('');
	let mentorQrDataUrl = $state<string>('');
	let error = $state('');
	let isActive = $state<boolean>(false);
	let currentBucket = $state('');
	let guestName = $state('');
	let guestReason = $state('');
	let guestMessage = $state('');
	let guestError = $state('');
	let guestSaving = $state(false);
	let showPwaHelpDialog = $state(false);
	let pwaHelpTimer: ReturnType<typeof setTimeout> | null = null;
	let statePollingHandle: ReturnType<typeof setInterval> | null = null;
	const PUBLIC_SUPABASE_URL = publicEnv.PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
	const PUBLIC_SUPABASE_ANON_KEY = publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key';
	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

	const applyActiveState = (nextActive: boolean) => {
		isActive = nextActive;
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

	const submitGuestSignIn = async () => {
		if (!guestName.trim() || guestSaving) return;
		guestSaving = true;
		guestError = '';
		guestMessage = '';
		try {
			const res = await fetch('/api/attendance/public/guest', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ guestName: guestName.trim(), reason: guestReason.trim() || null })
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				guestError = body?.error ?? 'Could not record guest sign-in.';
				return;
			}
			guestMessage = 'Guest sign-in recorded.';
			guestName = '';
			guestReason = '';
		} catch {
			guestError = 'Network error. Try again.';
		} finally {
			guestSaving = false;
		}
	};

	const openPwaHelpDialog = () => {
		showPwaHelpDialog = true;
		if (pwaHelpTimer) clearTimeout(pwaHelpTimer);
		pwaHelpTimer = setTimeout(() => {
			showPwaHelpDialog = false;
			pwaHelpTimer = null;
		}, 60_000);
	};

	const closePwaHelpDialog = () => {
		showPwaHelpDialog = false;
		if (pwaHelpTimer) {
			clearTimeout(pwaHelpTimer);
			pwaHelpTimer = null;
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
			if (pwaHelpTimer) clearTimeout(pwaHelpTimer);
			statePollingHandle = null;
			pwaHelpTimer = null;
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

<section
	class="flex min-h-dvh flex-col overflow-y-auto px-6 py-0"
	style="background: var(--app-surface);"
>
	<div class="pt-5">
		<div
			class="mx-auto max-w-4xl text-center [&_h1]:text-center [&_header]:justify-center [&_p]:text-center"
		>
			<PageHeader title="Attendance Kiosk" />
		</div>
	</div>
	<div class="flex items-center justify-center py-2">
		<div class="w-full max-w-6xl text-center">
			{#key `${isActive}-${currentBucket}`}
				{#if !isActive}
					{#if studentQrDataUrl}
						<div
							in:fly={{ y: 20, duration: 260 }}
							out:fade={{ duration: 180 }}
							class="mx-auto aspect-square w-[min(56vw,30rem)] rounded-3xl border-[14px] border-red-500 bg-white p-6 shadow-[0_0_48px_rgba(239,68,68,0.36)]"
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
						in:fly={{ y: -20, duration: 280 }}
						out:fade={{ duration: 180 }}
						class="grid gap-8 md:grid-cols-2"
					>
						<div class="text-center">
							<p class="mb-3 text-3xl font-black tracking-[0.2em] text-sky-100 uppercase">
								Student
							</p>
							{#if studentQrDataUrl}
								<div
									class="mx-auto aspect-square w-[min(52vw,24rem)] rounded-3xl border-2 border-sky-500 bg-white p-4 shadow-[0_0_30px_rgba(14,165,233,0.26)]"
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
							<p class="mb-3 text-2xl font-black tracking-[0.2em] text-sky-100 uppercase">Mentor</p>
							{#if mentorQrDataUrl}
								<div
									class="mx-auto aspect-square w-[min(52vw,24rem)] rounded-3xl border-2 border-sky-500 bg-white p-4 shadow-[0_0_30px_rgba(14,165,233,0.26)]"
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
				{/if}
			{/key}
		</div>
	</div>
	<div class="mt-auto">
		<div
			class="mx-auto mt-2 max-w-4xl rounded-lg border px-4 py-3 text-center text-sm"
			style="border-color: color-mix(in srgb, var(--app-info) 40%, transparent); background: color-mix(in srgb, var(--app-info) 12%, transparent); color: color-mix(in srgb, var(--app-info) 80%, white);"
		>
			Scan the top attendance QR codes using the Transfer app at
			<span class="font-semibold">transfer.circuitrunners.com/scan</span>.
		</div>
		{#if error}
			<div class="pb-2">
				<p class="mt-3 text-sm text-red-300">{error}</p>
			</div>
		{/if}
		<div class="mx-auto mt-2 mb-3 w-full max-w-6xl">
			<div
				class="rounded-xl border p-3"
				style="border-color: color-mix(in srgb, var(--app-warning) 40%, transparent); background: color-mix(in srgb, var(--app-warning) 10%, transparent);"
			>
				<div class="flex flex-wrap items-center justify-center gap-4 text-center">
					{#if data.installPwaQrDataUrl}
						<div class="mx-auto flex flex-col items-center gap-2">
							<button
								class="rounded px-2.5 py-1 text-center text-[11px] font-semibold tracking-wide uppercase"
								style="background: var(--app-info); color: var(--app-accent-text);"
								onclick={openPwaHelpDialog}
							>
								Install App Help
							</button>
							<div class="rounded-lg bg-white p-2">
								<img
									src={data.installPwaQrDataUrl}
									alt="QR code for Transfer scan app"
									class="h-28 w-28 object-contain"
								/>
							</div>
						</div>
					{/if}
					<div class="mx-auto w-full max-w-2xl">
						<div
							class="mt-3 rounded-lg border p-3"
							style="border-color: color-mix(in srgb, var(--app-warning) 30%, transparent); background: var(--app-surface-alt);"
						>
							<p
								class="text-xs font-semibold tracking-wide uppercase"
								style="color: color-mix(in srgb, var(--app-warning) 80%, white);"
							>
								Sign In As Guest
							</p>
							<p
								class="mt-1 text-[11px]"
								style="color: color-mix(in srgb, var(--app-warning) 70%, white);"
							>
								Students, only use this in emergencies where you can&apos;t access the app.
							</p>
							<div class="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
								<input
									class="rounded px-3 py-2 text-center text-sm"
									style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
									placeholder="Your name"
									bind:value={guestName}
									maxlength="120"
								/>
								<input
									class="rounded px-3 py-2 text-center text-sm"
									style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
									placeholder="Reason (optional)"
									bind:value={guestReason}
									maxlength="300"
								/>
								<button
									class="rounded px-3 py-2 text-sm font-semibold disabled:opacity-60"
									style="background: var(--app-warning); color: var(--app-accent-text);"
									disabled={!guestName.trim() || guestSaving}
									onclick={submitGuestSignIn}
								>
									{guestSaving ? 'Saving...' : 'Record'}
								</button>
							</div>
							{#if guestMessage}<p class="mt-2 text-xs text-emerald-300">{guestMessage}</p>{/if}
							{#if guestError}<p class="mt-2 text-xs text-red-300">{guestError}</p>{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	{#if showPwaHelpDialog}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center p-4"
			style="background: var(--app-overlay-scrim);"
			onclick={closePwaHelpDialog}
		>
			<div
				class="w-full max-w-lg rounded-xl border p-4 text-left backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
				onclick={(event) => event.stopPropagation()}
			>
				<div class="flex items-start justify-between gap-3">
					<p class="text-sm font-semibold" style="color: var(--app-text);">
						Add Transfer App to Home Screen
					</p>
					<button
						class="rounded border px-2 py-1 text-xs"
						style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
						onclick={closePwaHelpDialog}>Close</button
					>
				</div>
				<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
					This help box closes automatically after 1 minute.
				</p>
				<div class="mt-3 grid gap-3 md:grid-cols-2">
					<div
						class="rounded border p-3"
						style="background: var(--app-surface-alt); border-color: var(--app-glass-border);"
					>
						<p
							class="text-xs font-semibold tracking-wide uppercase"
							style="color: var(--app-text-muted);"
						>
							iPhone / iPad
						</p>
						<ol class="mt-2 list-decimal space-y-1 pl-4 text-xs" style="color: var(--app-text);">
							<li>Open the link in Safari.</li>
							<li>Tap the Share button.</li>
							<li>Select Add to Home Screen.</li>
							<li>Tap Add.</li>
						</ol>
					</div>
					<div
						class="rounded border p-3"
						style="background: var(--app-surface-alt); border-color: var(--app-glass-border);"
					>
						<p
							class="text-xs font-semibold tracking-wide uppercase"
							style="color: var(--app-text-muted);"
						>
							Android
						</p>
						<ol class="mt-2 list-decimal space-y-1 pl-4 text-xs" style="color: var(--app-text);">
							<li>Open the link in Chrome.</li>
							<li>Tap the menu (three dots).</li>
							<li>Choose Install app or Add to Home screen.</li>
							<li>Confirm install.</li>
						</ol>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>
