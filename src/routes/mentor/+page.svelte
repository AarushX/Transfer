<script lang="ts">
	import CheckoffCard from '$lib/components/CheckoffCard.svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import { env as publicEnv } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	let { data } = $props();
	let queue = $state<any[]>([]);
	const PUBLIC_SUPABASE_URL = publicEnv.PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
	const PUBLIC_SUPABASE_ANON_KEY = publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key';

	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

	onMount(() => {
		queue = data.queue ?? [];
		const channel = supabase
			.channel('mentor-queue')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'certifications' },
				async () => {
					const res = await fetch('/mentor');
					if (res.ok) location.reload();
				}
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	});

	const onApprove = async (item: any, notes = '') => {
		await fetch('/api/mentor/checkoff', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ nodeId: item.node_id, userId: item.user_id, action: 'approve', notes })
		});
		queue = queue.filter((entry: any) => entry.id !== item.id);
	};

	const onReview = async (item: any, notes = '') => {
		await fetch('/api/mentor/checkoff', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ nodeId: item.node_id, userId: item.user_id, action: 'review', notes })
		});
		queue = queue.filter((entry: any) => entry.id !== item.id);
	};
</script>

<section class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-semibold">Pending Checkoffs</h1>
		<a
			href="/mentor/courses"
			class="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
			>Manage courses →</a
		>
	</div>
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-3">
		<form method="GET" class="flex flex-wrap items-center gap-2">
			<label for="scope" class="text-xs text-slate-400">Scope</label>
			<select id="scope" name="scope" class="rounded bg-slate-800 px-2 py-1.5 text-sm">
				<option value="mine" selected={data.scope === 'mine'}>My teams</option>
				<option value="all" selected={data.scope === 'all'}>All teams</option>
			</select>
			<select name="team" class="rounded bg-slate-800 px-2 py-1.5 text-sm">
				<option value="">All course teams</option>
				{#each data.subteams as team}
					<option value={team.id} selected={team.id === data.selectedTeamId}>{team.name}</option>
				{/each}
			</select>
			<button class="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600" type="submit"
				>Apply</button
			>
			<a href="/mentor" class="rounded border border-slate-700 px-3 py-1.5 text-sm">Reset</a>
			<a href="/teams" class="ml-auto text-xs text-yellow-300 underline">Edit team preferences</a>
		</form>
		{#if data.scope === 'mine' && data.mentorTeamIds?.length === 0}
			<p class="mt-2 text-xs text-amber-200">
				No mentor teams selected yet, so "My teams" currently shows all checkoffs.
			</p>
		{/if}
	</div>
	{#if !queue.length}
		<p class="text-slate-300">No students are waiting for checkoff.</p>
	{:else}
		<div class="grid gap-3 md:grid-cols-2">
			{#each queue as item}
				<CheckoffCard {item} {onApprove} {onReview} />
			{/each}
		</div>
	{/if}
</section>
