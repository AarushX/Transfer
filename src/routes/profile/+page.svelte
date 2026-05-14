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
	<header>
		<p class="text-[11px] font-medium uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Profile</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight" style="color: var(--app-text);">Your profile</h1>
		<p class="mt-2 text-sm" style="color: var(--app-text-muted);">
			How teammates and mentors see you across Transfer.
		</p>
	</header>

	{#if form?.error}
		<div class="rounded-xl border p-3 text-sm" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">{form.error}</div>
	{/if}
	{#if form?.ok}
		<div class="rounded-xl border p-3 text-sm" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); border-color: color-mix(in srgb, var(--app-success) 40%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">
			{successText}
		</div>
	{/if}

	<div class="overflow-hidden rounded-xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		<div class="flex items-center gap-4 border-b px-5 py-4" style="background: var(--app-glass-bg-hover); border-color: var(--app-glass-border);">
			<Avatar
				name={fullName || data.profile?.email}
				email={data.profile?.email}
				url={avatarUrl}
				size="xl"
			/>
			<div class="min-w-0">
				<p class="truncate text-base font-semibold" style="color: var(--app-text);">{fullName || data.profile?.email}</p>
				<p class="truncate text-xs uppercase tracking-wider" style="color: var(--app-text-muted);">
					{roleLabel}
				</p>
				<p class="mt-1 truncate text-xs" style="color: var(--app-text-muted);">{data.profile?.email}</p>
			</div>
		</div>

		<form method="POST" action="?/save" use:enhance={refreshOnSuccess} class="space-y-4 p-5">
			<label class="block space-y-1">
				<span class="text-xs font-medium uppercase tracking-wider" style="color: var(--app-text-muted);">
					Display name
				</span>
				<input
					name="full_name"
					required
					bind:value={fullName}
					class="block w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					placeholder="Your name"
				/>
			</label>

			<label class="block space-y-1">
				<span class="text-xs font-medium uppercase tracking-wider" style="color: var(--app-text-muted);">
					Avatar URL
				</span>
				<input
					name="avatar_url"
					bind:value={avatarUrl}
					type="url"
					class="block w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					placeholder="https://…"
				/>
				<span class="text-[11px]" style="color: var(--app-text-muted);">
					Optional. Leave blank to use initials. Square images look best.
				</span>
			</label>

			<label class="block space-y-1">
				<span class="text-xs font-medium uppercase tracking-wider" style="color: var(--app-text-muted);">Bio</span>
				<textarea
					name="bio"
					rows="4"
					maxlength="500"
					bind:value={bio}
					class="block w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					placeholder="A short intro, interests, or what you're focusing on this season."
				></textarea>
			</label>

			<div class="flex justify-end">
				<Button variant="secondary" type="submit">
					Save profile
				</Button>
			</div>
		</form>
	</div>

	<GlassCard>
		<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Parent Access</p>
		<p class="mt-2 text-sm" style="color: var(--app-text-muted);">Generate a temporary code so a parent can link to this account in the Parent Portal.</p>
		<form method="POST" action="?/generateParentLinkCode" use:enhance={refreshOnSuccess} class="mt-3">
			<Button variant="primary" type="submit">Generate parent link code</Button>
		</form>
		{#if data.activeParentLinkCode}
			<div class="mt-3 rounded-xl border p-3" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
				<p class="text-xs" style="color: var(--app-text-muted);">Active code (expires soon)</p>
				<p class="mt-1 text-xl font-bold tracking-widest" style="color: var(--app-text);">{data.activeParentLinkCode.code}</p>
				<p class="text-xs" style="color: var(--app-text-muted);">Expires {new Date(data.activeParentLinkCode.expires_at).toLocaleString()}</p>
			</div>
		{/if}
		<div class="mt-4 space-y-2">
			<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Linked parents</p>
			{#each data.parentLinks as link}
				<div class="flex items-center justify-between rounded-xl border p-2 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<div>
						<p style="color: var(--app-text);">{link.parent?.full_name || link.parent?.email || 'Parent'}</p>
						<p class="text-xs" style="color: var(--app-text-muted);">{link.parent?.email}</p>
					</div>
					<form method="POST" action="?/revokeParentLink" use:enhance={refreshOnSuccess}>
						<input type="hidden" name="link_id" value={link.id} />
						<Button variant="danger" size="sm" type="submit">Revoke</Button>
					</form>
				</div>
			{:else}
				<p class="text-sm" style="color: var(--app-text-muted);">No parent accounts linked yet.</p>
			{/each}
		</div>
	</GlassCard>
</section>
