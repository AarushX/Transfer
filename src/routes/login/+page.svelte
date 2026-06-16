<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();
	let showParentEmail = $state(false);

	// Hidden debug entry: rapid-click "Continue with Google" 5 times to open
	// an import dialog for a session blob exported from /admin. Normal users
	// click once and see a ~380ms delayed form submit (barely perceptible
	// before the cross-origin redirect to Google anyway).
	let googleFormEl = $state<HTMLFormElement | null>(null);
	let googleClicks = 0;
	let googleSubmitTimer: ReturnType<typeof setTimeout> | null = null;
	let showImportDialog = $state(false);
	let importPayload = $state('');

	function handleGoogleClick(e: MouseEvent) {
		e.preventDefault();
		googleClicks += 1;
		if (googleSubmitTimer) {
			clearTimeout(googleSubmitTimer);
			googleSubmitTimer = null;
		}
		if (googleClicks >= 5) {
			googleClicks = 0;
			showImportDialog = true;
			return;
		}
		googleSubmitTimer = setTimeout(() => {
			googleClicks = 0;
			googleSubmitTimer = null;
			googleFormEl?.requestSubmit();
		}, 380);
	}

	function closeImportDialog() {
		showImportDialog = false;
		importPayload = '';
	}

	function onDialogKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeImportDialog();
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center px-4">
	<div class="fade-up w-full max-w-md">
		<div class="aurora-border">
			<div
				class="relative space-y-5 overflow-hidden rounded-2xl border p-6 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			>
				<div
					class="pointer-events-none absolute inset-0 rounded-2xl"
					style="background: var(--app-glass-shine);"
				></div>

				<div class="relative space-y-1 text-center">
					<h1 class="gradient-text text-3xl font-bold tracking-tight">Transfer</h1>
					<p class="text-sm" style="color: var(--app-text-muted);">
						Students, mentors, admins, and parents all sign in here.
					</p>
				</div>

				{#if data?.error}
					<div
						class="relative rounded-xl border p-3 text-sm"
						style="background: color-mix(in srgb, var(--app-danger) 12%, transparent); border-color: color-mix(in srgb, var(--app-danger) 30%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);"
					>
						{data.error}
					</div>
				{:else if data?.success}
					<div
						class="relative rounded-xl border p-3 text-sm"
						style="background: color-mix(in srgb, var(--app-success) 12%, transparent); border-color: color-mix(in srgb, var(--app-success) 30%, transparent); color: color-mix(in srgb, var(--app-success) 70%, white);"
					>
						{data.success}
					</div>
				{/if}

				<form bind:this={googleFormEl} method="POST" action="/auth/google" class="relative">
					<Button
						variant="primary"
						type="submit"
						class="w-full"
						size="lg"
						onclick={handleGoogleClick}
					>
						<svg class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"
							><path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
							/><path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/><path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/><path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/></svg
						>
						Continue with Google
					</Button>
				</form>

				<div class="relative">
					<Button
						variant="secondary"
						class="w-full"
						onclick={() => (showParentEmail = !showParentEmail)}
					>
						{showParentEmail ? 'Hide Parent Login' : 'Login as Parent'}
					</Button>
				</div>

				{#if showParentEmail}
					<form
						method="POST"
						action="/auth/email"
						class="relative space-y-3 rounded-xl border p-4 backdrop-blur-xl"
						style="background: color-mix(in srgb, var(--app-surface) 40%, transparent); border-color: var(--app-glass-border);"
					>
						<p class="eyebrow-label">Parent / Guardian Email Login</p>
						<input
							type="email"
							name="email"
							required
							autocomplete="email"
							class="w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
							style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							placeholder="parent@example.com"
						/>
						<input
							type="password"
							name="password"
							required
							autocomplete="current-password"
							class="w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
							style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							placeholder="Password"
						/>
						<div class="grid grid-cols-2 gap-2">
							<button
								class="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all active:scale-[0.97]"
								style="background: var(--aurora); box-shadow: 0 4px 24px -6px color-mix(in srgb, var(--app-accent) 60%, transparent), inset 0 1px 0 0 color-mix(in srgb, white 25%, transparent);"
								type="submit"
								name="intent"
								value="login"
							>
								Parent Login
							</button>
							<button
								class="inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all active:scale-[0.97]"
								style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-button-secondary-text);"
								type="submit"
								name="intent"
								value="signup"
							>
								Create Account
							</button>
						</div>
					</form>
				{/if}

				<p class="relative text-center text-xs" style="color: var(--app-text-dim);">
					Email/password works only for parent/guardian accounts. Everyone else should use Google.
				</p>
			</div>
		</div>
	</div>
</div>

{#if showImportDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center px-4"
		style="background: color-mix(in srgb, var(--app-bg) 70%, transparent); backdrop-filter: blur(6px);"
		onclick={closeImportDialog}
		onkeydown={onDialogKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Import session"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-md rounded-2xl border p-5 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="mb-3 flex items-start justify-between gap-3">
				<div>
					<p class="eyebrow-label" style="margin-bottom: 4px;">Debug</p>
					<h2 class="text-base font-semibold" style="color: var(--app-text);">
						Import session blob
					</h2>
					<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
						Paste the base64 blob from <span class="mono">/admin → Debug → Export</span>. This sets
						Supabase auth cookies on this browser and reloads as that user.
					</p>
				</div>
				<button
					type="button"
					onclick={closeImportDialog}
					aria-label="Close"
					class="rounded-md p-1 text-xs"
					style="color: var(--app-text-muted);"
				>
					✕
				</button>
			</div>

			<form method="POST" action="/auth/debug-import" class="space-y-3">
				<textarea
					name="payload"
					bind:value={importPayload}
					required
					rows="5"
					autocomplete="off"
					spellcheck="false"
					placeholder="eyJ...session blob...=="
					class="mono w-full resize-none rounded-xl border px-3 py-2 text-[11px]"
					style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
				></textarea>
				<p
					class="rounded-lg border px-2.5 py-1.5 text-[11px]"
					style="border-color: color-mix(in srgb, var(--app-warning) 45%, transparent); background: color-mix(in srgb, var(--app-warning) 10%, transparent); color: color-mix(in srgb, var(--app-warning) 80%, white);"
				>
					Anyone you paste this from now controls your account. Only paste blobs you generated
					yourself, on this device.
				</p>
				<div class="flex items-center justify-end gap-2">
					<Button variant="ghost" size="sm" onclick={closeImportDialog}>Cancel</Button>
					<Button variant="primary" type="submit" size="sm">Import &amp; sign in</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
