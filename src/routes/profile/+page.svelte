<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import { roleBadgeParts } from '$lib/roles';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data, form } = $props();
	const roleLabel = $derived(roleBadgeParts(data.profile).join(' · '));
	const successText = $derived.by(() => {
		if (!form?.ok) return '';
		return 'Profile updated.';
	});

	let fullName = $state('');
	let bio = $state('');
	let avatarUrl = $state('');
	$effect(() => {
		fullName = data.profile?.full_name ?? '';
		bio = data.profile?.bio ?? '';
		avatarUrl = data.profile?.avatar_url ?? '';
	});

	const refreshOnSuccess = () => {
		return async ({ result }: { result: { type: string } }) => {
			if (result.type === 'success') {
				await invalidateAll();
			}
		};
	};

	// Debug: session-export state. Only used when data.isAdmin is true.
	let debugRevealed = $state(false);
	let debugCopyState = $state<'idle' | 'copied' | 'error'>('idle');
	let debugExporting = $state(false);
	async function copyDebugPayload() {
		const value = (form as any)?.sessionPayload as string | undefined;
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			debugCopyState = 'copied';
			setTimeout(() => (debugCopyState = 'idle'), 1800);
		} catch {
			debugCopyState = 'error';
			setTimeout(() => (debugCopyState = 'idle'), 1800);
		}
	}
</script>

<section class="mx-auto max-w-3xl space-y-6">
	<header class="fade-up">
		<p class="eyebrow-label">Profile</p>
		<h1 class="gradient-text mt-1 text-3xl font-semibold tracking-tight">Your profile</h1>
		<p class="mt-2 text-sm" style="color: var(--app-text-muted);">
			How teammates and mentors see you across Transfer.
		</p>
	</header>

	{#if form?.error}
		<div
			class="fade-up rounded-2xl border p-3 text-sm"
			style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);"
		>
			{form.error}
		</div>
	{/if}
	{#if form?.ok}
		<div
			class="fade-up rounded-2xl border p-3 text-sm"
			style="background: color-mix(in srgb, var(--app-success) 15%, transparent); border-color: color-mix(in srgb, var(--app-success) 40%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);"
		>
			{successText}
		</div>
	{/if}

	<!-- Profile card with avatar aurora accent -->
	<div class="fade-up" style="animation-delay: 0.05s">
		<div
			class="overflow-hidden rounded-2xl border backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<div
				class="pointer-events-none absolute inset-0 rounded-2xl"
				style="background: var(--app-glass-shine);"
			></div>

			<!-- Avatar header with aurora accent -->
			<div
				class="relative flex items-center gap-4 border-b px-5 py-5"
				style="border-color: var(--app-glass-border);"
			>
				<div class="aurora-border rounded-full" style="border-radius: 9999px; padding: 2px;">
					<div style="border-radius: 9999px; overflow: hidden;">
						<Avatar
							name={fullName || data.profile?.email}
							email={data.profile?.email}
							url={avatarUrl}
							size="xl"
						/>
					</div>
				</div>
				<div class="min-w-0">
					<p class="truncate text-base font-semibold" style="color: var(--app-text);">
						{fullName || data.profile?.email}
					</p>
					<div class="mt-1 flex flex-wrap gap-1.5">
						{#each roleBadgeParts(data.profile) as role}
							<span
								class="chip-violet inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
								>{role}</span
							>
						{/each}
					</div>
					<p class="mt-1 truncate text-xs" style="color: var(--app-text-dim);">
						{data.profile?.email}
					</p>
				</div>
			</div>

			<!-- Profile form with glass inputs -->
			<form
				method="POST"
				action="?/save"
				use:enhance={refreshOnSuccess}
				class="relative space-y-4 p-5"
			>
				<label class="block space-y-1.5">
					<span class="eyebrow-label">Display name</span>
					<input
						name="full_name"
						required
						bind:value={fullName}
						class="block w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						placeholder="Your name"
					/>
				</label>

				<label class="block space-y-1.5">
					<span class="eyebrow-label">Avatar URL</span>
					<input
						name="avatar_url"
						bind:value={avatarUrl}
						type="url"
						class="block w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						placeholder="https://…"
					/>
					<span class="text-[11px]" style="color: var(--app-text-dim);">
						Optional. Leave blank to use initials. Square images look best.
					</span>
				</label>

				<label class="block space-y-1.5">
					<span class="eyebrow-label">Bio</span>
					<textarea
						name="bio"
						rows="4"
						maxlength="500"
						bind:value={bio}
						class="block w-full rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						placeholder="A short intro, interests, or what you're focusing on this season."
					></textarea>
				</label>

				<div class="flex justify-end">
					<Button variant="primary" type="submit">Save profile</Button>
				</div>
			</form>
		</div>
	</div>

	<!-- Team membership card -->
	<form
		method="POST"
		action="?/setPrimaryTeam"
		use:enhance={refreshOnSuccess}
		class="fade-up rounded-2xl border p-5 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); animation-delay: 0.1s;"
	>
		<div class="mb-3 flex items-baseline justify-between gap-3">
			<div>
				<h2 class="text-base font-semibold" style="color: var(--app-text);">Team membership</h2>
				<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
					Drives your default course grouping.
				</p>
			</div>
			<span
				class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
				style="border-color: color-mix(in srgb, var(--app-info) 40%, transparent); background: color-mix(in srgb, var(--app-info) 12%, transparent); color: var(--app-info);"
			>
				Choose one
			</span>
		</div>
		<div class="grid gap-2 md:grid-cols-2">
			{#each data.teamSubteams as team (team.id)}
				<label
					class="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition"
					style="border-color: var(--app-glass-border);"
				>
					<input
						type="radio"
						name="subteam_id"
						value={team.id}
						checked={data.profile?.subteam_id === team.id}
					/>
					<div>
						<p class="font-medium" style="color: var(--app-text);">{team.name}</p>
						<p class="text-xs" style="color: var(--app-text-muted);">{team.slug}</p>
					</div>
				</label>
			{/each}
		</div>
		<div class="mt-3 flex gap-2">
			<Button variant="primary" type="submit">Save primary team</Button>
		</div>
	</form>

	{#if data.profile?.is_mentor}
		<!-- Mentor checkoff teams card -->
		<form
			method="POST"
			action="?/saveMentorTeams"
			use:enhance={refreshOnSuccess}
			class="fade-up rounded-2xl border p-5"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); animation-delay: 0.15s;"
		>
			<div class="mb-3 flex items-baseline justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold" style="color: var(--app-text);">Mentor checkoff teams</h2>
					<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
						Which teams to show in your mentor queue when filtering to "My teams".
					</p>
				</div>
				<!-- Hint that distinguishes this card from the radio-based "Team
				     membership" card above (which uses the same card layout). -->
				<span
					class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
					style="border-color: color-mix(in srgb, var(--app-accent) 40%, transparent); background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-accent);"
				>
					Pick any
				</span>
			</div>
			<div class="grid gap-2 md:grid-cols-2">
				{#each data.teamSubteams as team (team.id)}
					<label
						class="mentor-team-tile flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition"
						style="border-color: var(--app-glass-border);"
					>
						<input
							type="checkbox"
							name="mentor_team_ids"
							value={team.id}
							checked={data.mentorSubteamIds.includes(team.id)}
						/>
						<div>
							<p class="font-medium" style="color: var(--app-text);">{team.name}</p>
							<p class="text-xs" style="color: var(--app-text-muted);">{team.slug}</p>
						</div>
					</label>
				{/each}
			</div>
			<Button variant="primary" type="submit" class="mt-3">Save mentor teams</Button>
		</form>
	{/if}

	<!-- Parent access glass card -->
	<div class="fade-up" style="animation-delay: 0.2s">
		<GlassCard>
			<p class="eyebrow-label">Parent Access</p>
			<p class="mt-2 text-sm" style="color: var(--app-text-muted);">
				Generate a temporary code so a parent can link to this account in the Parent Portal.
			</p>
			<form
				method="POST"
				action="?/generateParentLinkCode"
				use:enhance={refreshOnSuccess}
				class="mt-3"
			>
				<Button variant="primary" type="submit">Generate parent link code</Button>
			</form>
			{#if data.activeParentLinkCode}
				<div
					class="relative mt-4 overflow-hidden rounded-2xl border p-4 backdrop-blur-xl"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
				>
					<div
						class="pointer-events-none absolute inset-0 rounded-2xl"
						style="background: var(--app-glass-shine);"
					></div>
					<div class="relative">
						<p class="eyebrow-label">Active code (expires soon)</p>
						<p class="mono mt-2 text-2xl font-bold tracking-widest" style="color: var(--app-text);">
							{data.activeParentLinkCode.code}
						</p>
						<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
							Expires {new Date(data.activeParentLinkCode.expires_at).toLocaleString()}
						</p>
					</div>
				</div>
			{/if}
			<div class="mt-5 space-y-2">
				<p class="eyebrow-label">Linked parents</p>
				{#each data.parentLinks as link, i}
					<div
						class="fade-up relative flex items-center justify-between overflow-hidden rounded-2xl border p-3 backdrop-blur-xl"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); animation-delay: {0.05 *
							(i + 1)}s"
					>
						<div
							class="pointer-events-none absolute inset-0 rounded-2xl"
							style="background: var(--app-glass-shine);"
						></div>
						<div class="relative">
							<p class="text-sm font-medium" style="color: var(--app-text);">
								{link.parent?.full_name || link.parent?.email || 'Parent'}
							</p>
							<p class="text-xs" style="color: var(--app-text-dim);">{link.parent?.email}</p>
						</div>
						<form
							method="POST"
							action="?/revokeParentLink"
							use:enhance={refreshOnSuccess}
							class="relative"
						>
							<input type="hidden" name="link_id" value={link.id} />
							<Button variant="danger" size="sm" type="submit">Revoke</Button>
						</form>
					</div>
				{:else}
					<p class="text-sm" style="color: var(--app-text-dim);">No parent accounts linked yet.</p>
				{/each}
			</div>
		</GlassCard>
	</div>

	{#if data.isAdmin}
		<!-- ─── Debug (admin-only, collapsed by default) ───
		     Exports your own Supabase session cookies as a base64 blob so you
		     can paste them into a sandboxed/preview browser (the login page's
		     5-click import dialog) without round-tripping through DevTools.
		     The blob is effectively a password — treat it like one. -->
		<details class="fade-up debug-fold" style="animation-delay: 0.25s;">
			<summary class="debug-summary">
				<span>Debug</span>
				<span class="debug-summary-hint">Session export</span>
			</summary>

			<div
				class="mt-3 space-y-4 rounded-2xl border p-5"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<div>
					<h2 class="text-sm font-semibold" style="color: var(--app-text);">
						Export Supabase session
					</h2>
					<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
						Dumps the cookies on this request as a base64 blob. Paste it into the login page of a
						sandboxed browser (5 clicks on “Continue with Google” opens the import dialog) to sign
						in there as you, without going through Google again.
					</p>
					<p
						class="mt-2 rounded-lg border px-2.5 py-1.5 text-[11px]"
						style="border-color: color-mix(in srgb, var(--app-warning) 45%, transparent); background: color-mix(in srgb, var(--app-warning) 10%, transparent); color: color-mix(in srgb, var(--app-warning) 80%, white);"
					>
						Anyone holding this blob can act as your account until the tokens expire. Don't paste
						it into chat, screenshots, or anywhere persistent.
					</p>
				</div>

				<form
					method="POST"
					action="?/exportSession"
					use:enhance={() => {
						debugExporting = true;
						debugRevealed = false;
						return async ({ update }) => {
							await update({ reset: false });
							debugExporting = false;
						};
					}}
				>
					<Button variant="secondary" type="submit" size="sm" disabled={debugExporting}>
						{debugExporting ? 'Reading cookies…' : 'Export current session'}
					</Button>
				</form>

				{#if (form as any)?.error && !(form as any)?.sessionPayload}
					<p
						class="rounded-lg border px-2.5 py-1.5 text-xs"
						style="border-color: color-mix(in srgb, var(--app-danger) 45%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
					>
						{(form as any).error}
					</p>
				{/if}

				{#if (form as any)?.sessionPayload}
					<div class="space-y-2">
						<div class="flex items-center justify-between gap-2">
							<p class="text-[11px]" style="color: var(--app-text-dim);">
								Exported {(form as any).exportedAt
									? new Date((form as any).exportedAt).toLocaleTimeString()
									: 'just now'}
							</p>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => (debugRevealed = !debugRevealed)}
									class="rounded-md border px-2 py-0.5 text-[11px]"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);"
								>
									{debugRevealed ? 'Hide' : 'Reveal'}
								</button>
								<button
									type="button"
									onclick={copyDebugPayload}
									class="rounded-md border px-2 py-0.5 text-[11px]"
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);"
								>
									{debugCopyState === 'copied'
										? 'Copied!'
										: debugCopyState === 'error'
											? 'Copy failed'
											: 'Copy'}
								</button>
							</div>
						</div>
						<textarea
							readonly
							rows="4"
							class="mono w-full resize-none rounded-lg border px-2.5 py-1.5 text-[11px]"
							style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border); filter: {debugRevealed
								? 'none'
								: 'blur(5px)'}; transition: filter 0.18s ease;"
							value={(form as any).sessionPayload}
							onclick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
						></textarea>
					</div>
				{/if}
			</div>
		</details>
	{/if}
</section>

<style>
	.debug-fold > summary {
		list-style: none;
		cursor: pointer;
	}
	.debug-fold > summary::-webkit-details-marker {
		display: none;
	}
	.debug-summary {
		display: inline-flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--app-text-muted);
		padding: 0.25rem 0;
	}
	.debug-summary-hint {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: none;
		color: var(--app-text-dim);
	}
</style>
