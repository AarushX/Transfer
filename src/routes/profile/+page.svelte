<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import PassportQR from '$lib/components/PassportQR.svelte';
import { roleBadgeParts } from '$lib/roles';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();
	const roleLabel = $derived(roleBadgeParts(data.profile).join(' · '));
	const specialTitles = $derived((data.specialTitles ?? []) as string[]);
	const trackRanks = $derived((data.trackRanks ?? []) as any[]);
	const successText = $derived.by(() => {
		if (!form?.ok) return '';
		if (form?.section === 'primary') return 'Primary team updated.';
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
		<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Organization Structure</p>
		<form method="POST" action="?/setPrimaryTeam" use:enhance={refreshOnSuccess} class="mt-3">
			<p class="mb-2 text-sm font-medium">Primary main team</p>
			<p class="mb-3 text-xs text-slate-400">Used as your default context for dashboard/courses.</p>
			<div class="grid gap-2 md:grid-cols-2">
				{#each data.teamGroups as group}
					<label class="flex cursor-pointer items-center gap-2 rounded border border-slate-700 p-3 hover:bg-slate-800/60">
						<input
							type="radio"
							name="team_group_id"
							value={group.id}
							checked={data.primaryTeamGroupId === group.id}
							class="accent-yellow-400"
						/>
						<div>
							<p class="font-medium">{group.name}</p>
							<p class="text-xs text-slate-500">{group.slug}</p>
						</div>
					</label>
				{:else}
					<p class="text-sm text-slate-500 md:col-span-2">No team group memberships found yet.</p>
				{/each}
			</div>
			<div class="mt-3 flex gap-2">
				<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900" type="submit">
					Save primary main team
				</button>
				<button class="rounded border border-slate-700 px-4 py-2 text-sm" type="submit" name="team_group_id" value="">
					Clear
				</button>
			</div>
		</form>
		<div class="mt-5 border-t border-slate-700 pt-4">
			<p class="mb-2 text-sm font-medium">Current team memberships</p>
			<div class="space-y-2">
				{#each data.teamMemberships as membership}
					<div class="rounded border border-slate-700 bg-slate-950/40 p-3">
						<p class="text-sm font-medium text-slate-100">
							{membership.teamName}
							{#if data.primaryTeamGroupId === membership.teamGroupId}
								<span class="ml-2 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">Primary group</span>
							{/if}
						</p>
						<p class="text-xs text-slate-400">
							Main team: {membership.teamGroupName || membership.teamGroupSlug}
							{#if membership.categorySlug}
								· Category: {membership.categorySlug}
							{/if}
						</p>
					</div>
				{:else}
					<p class="text-sm text-slate-500">No memberships assigned yet.</p>
				{/each}
			</div>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div class="rounded-xl border border-slate-700 bg-slate-900 p-4">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Digital passport</p>
			<p class="mt-2 text-slate-300">{data.profile?.full_name || data.profile?.email}</p>
			<p class="mt-2 rounded bg-slate-800 px-2 py-1 text-sm">{data.progressSummary}</p>
			<p class="mt-2 text-sm text-yellow-300">Overall rank: {data.overallRank}</p>
			{#if data.rankSummary?.rank}
				<p class="mt-1 text-xs text-slate-300">
					{data.rankSummary.rank.medal_label} · {data.rankSummary.totalPoints} pts
				</p>
				<p class="text-xs text-slate-400">
					Courses {data.rankSummary.coursePoints} + Attendance {data.rankSummary.attendancePoints}
				</p>
			{/if}
			{#if specialTitles.length > 0}
				<p class="mt-1 text-xs text-emerald-200">Special: {specialTitles.join(' · ')}</p>
			{/if}
			<div class="mt-3 rounded bg-slate-900/50 p-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Track rank tiers</p>
				<ul class="mt-1 space-y-1 text-sm text-slate-300">
					{#each trackRanks as rank}
						<li>{rank.trackName}: {rank.tier} ({rank.count} completed)</li>
					{:else}
						<li class="text-slate-400">Complete courses to earn track tiers.</li>
					{/each}
				</ul>
			</div>
			<h2 class="mt-4 font-semibold">Badges</h2>
			<ul class="mt-2 list-disc pl-5 text-sm text-slate-300">
				{#each data.badges as badge}
					<li>{badge}</li>
				{/each}
			</ul>
		</div>
		<div class="rounded-xl border border-slate-700 bg-slate-900 p-4">
			<h2 class="mb-3 text-lg font-semibold">QR Identity</h2>
			<PassportQR qrDataUrl={data.qrDataUrl} />
		</div>
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
