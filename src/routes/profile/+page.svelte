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
		<h2 class="text-base font-semibold" style="color: var(--app-text);">Team membership</h2>
		<p class="mb-3 text-xs" style="color: var(--app-text-muted);">
			Drives your default course grouping.
		</p>
		<div class="grid gap-2 md:grid-cols-2">
			{#each data.teamSubteams as team (team.id)}
				<label
					class="flex cursor-pointer items-center gap-2 rounded border p-3"
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
			<h2 class="text-base font-semibold" style="color: var(--app-text);">Mentor checkoff teams</h2>
			<p class="mb-3 text-xs" style="color: var(--app-text-muted);">
				Which teams to show in your mentor queue when filtering to "My teams".
			</p>
			<div class="grid gap-2 md:grid-cols-2">
				{#each data.teamSubteams as team (team.id)}
					<label
						class="flex cursor-pointer items-center gap-2 rounded border p-3"
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
</section>
