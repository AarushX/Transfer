<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
import { roleBadgeParts } from '$lib/roles';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

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
		<p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Profile</p>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight">Your profile</h1>
		<p class="mt-2 text-sm text-slate-400">
			How teammates and mentors see you across Transfer.
		</p>
	</header>

	{#if form?.error}
		<div class="rounded-md border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">{form.error}</div>
	{/if}
	{#if form?.ok}
		<div class="rounded-md border border-emerald-700 bg-emerald-900/30 p-3 text-sm text-emerald-200">
			{successText}
		</div>
	{/if}

	<div class="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-sm">
		<div class="flex items-center gap-4 border-b border-slate-700 bg-slate-800/60 px-5 py-4">
			<Avatar
				name={fullName || data.profile?.email}
				email={data.profile?.email}
				url={avatarUrl}
				size="xl"
			/>
			<div class="min-w-0">
				<p class="truncate text-base font-semibold">{fullName || data.profile?.email}</p>
				<p class="truncate text-xs uppercase tracking-wider text-slate-400">
					{roleLabel}
				</p>
				<p class="mt-1 truncate text-xs text-slate-400">{data.profile?.email}</p>
			</div>
		</div>

		<form method="POST" action="?/save" use:enhance={refreshOnSuccess} class="space-y-4 p-5">
			<label class="block space-y-1">
				<span class="text-xs font-medium uppercase tracking-wider text-slate-400">
					Display name
				</span>
				<input
					name="full_name"
					required
					bind:value={fullName}
					class="block w-full rounded-md border border-slate-600 bg-slate-800/40 px-3 py-2 text-sm"
					placeholder="Your name"
				/>
			</label>

			<label class="block space-y-1">
				<span class="text-xs font-medium uppercase tracking-wider text-slate-400">
					Avatar URL
				</span>
				<input
					name="avatar_url"
					bind:value={avatarUrl}
					type="url"
					class="block w-full rounded-md border border-slate-600 bg-slate-800/40 px-3 py-2 text-sm"
					placeholder="https://…"
				/>
				<span class="text-[11px] text-slate-400">
					Optional. Leave blank to use initials. Square images look best.
				</span>
			</label>

			<label class="block space-y-1">
				<span class="text-xs font-medium uppercase tracking-wider text-slate-400">Bio</span>
				<textarea
					name="bio"
					rows="4"
					maxlength="500"
					bind:value={bio}
					class="block w-full rounded-md border border-slate-600 bg-slate-800/40 px-3 py-2 text-sm"
					placeholder="A short intro, interests, or what you're focusing on this season."
				></textarea>
			</label>

			<div class="flex justify-end">
				<button
					class="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
				>
					Save profile
				</button>
			</div>
		</form>
	</div>

	<div class="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
		<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Parent Access</p>
		<p class="mt-2 text-sm text-slate-300">Generate a temporary code so a parent can link to this account in the Parent Portal.</p>
		<form method="POST" action="?/generateParentLinkCode" use:enhance={refreshOnSuccess} class="mt-3">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Generate parent link code</button>
		</form>
		{#if data.activeParentLinkCode}
			<div class="mt-3 rounded border border-slate-700 bg-slate-950/50 p-3">
				<p class="text-xs text-slate-400">Active code (expires soon)</p>
				<p class="mt-1 text-xl font-bold tracking-widest">{data.activeParentLinkCode.code}</p>
				<p class="text-xs text-slate-500">Expires {new Date(data.activeParentLinkCode.expires_at).toLocaleString()}</p>
			</div>
		{/if}
		<div class="mt-4 space-y-2">
			<p class="text-xs uppercase tracking-wide text-slate-500">Linked parents</p>
			{#each data.parentLinks as link}
				<div class="flex items-center justify-between rounded border border-slate-700 bg-slate-950/50 p-2 text-sm">
					<div>
						<p>{link.parent?.full_name || link.parent?.email || 'Parent'}</p>
						<p class="text-xs text-slate-500">{link.parent?.email}</p>
					</div>
					<form method="POST" action="?/revokeParentLink" use:enhance={refreshOnSuccess}>
						<input type="hidden" name="link_id" value={link.id} />
						<button class="rounded border border-red-600 px-2 py-1 text-xs text-red-200">Revoke</button>
					</form>
				</div>
			{:else}
				<p class="text-sm text-slate-500">No parent accounts linked yet.</p>
			{/each}
		</div>
	</div>
</section>
