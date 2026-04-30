<script lang="ts">
	let { data, form } = $props();
	let selectedTeamGroupId = $state(String(data.current?.team_group_id ?? ''));
	const filteredSubteams = $derived(
		(data.subteams as any[]).filter((subteam) => String(subteam.team_group_id) === selectedTeamGroupId)
	);
</script>

<section class="mx-auto max-w-xl space-y-4">
	<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
		<h1 class="text-2xl font-semibold">Onboarding</h1>
		<p class="text-sm text-slate-400">Choose your team and subteam to unlock your required courses.</p>
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}

	<form method="POST" action="?/save" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Team</span>
			<select
				class="rounded bg-slate-800 px-2 py-2"
				name="team_group_id"
				bind:value={selectedTeamGroupId}
				required
			>
				<option value="">Select team</option>
				{#each data.teams as team}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Subteam</span>
			<select class="rounded bg-slate-800 px-2 py-2" name="team_id" required>
				<option value="">Select subteam</option>
				{#each filteredSubteams as subteam}
					<option value={subteam.id}>{subteam.name}</option>
				{/each}
			</select>
		</label>
		<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Continue</button>
	</form>
</section>
