<script lang="ts">
	import type { Subteam, TeamGroup } from './types';

	type Props = {
		teamGroups: TeamGroup[];
		subteamsForSelectedTeam: Subteam[];
		selectedTeamId: string;
		selectedSubteamId: string;
		onTeamChange: (id: string) => void;
		onSubteamChange: (id: string) => void;
	};

	let {
		teamGroups,
		subteamsForSelectedTeam,
		selectedTeamId,
		selectedSubteamId,
		onTeamChange,
		onSubteamChange
	}: Props = $props();
</script>

<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
	<div class="mb-2 flex items-center justify-between text-xs text-slate-400">
		<p>Scope selector</p>
		<p>{subteamsForSelectedTeam.length} linked subteams</p>
	</div>
	<div class="grid gap-3 md:grid-cols-2">
		<label class="space-y-1 text-sm">
			<span class="text-xs uppercase tracking-wide text-slate-400">Selected Main Team</span>
			<select
				class="w-full rounded bg-slate-800 px-2 py-2"
				value={selectedTeamId}
				onchange={(event) => onTeamChange((event.currentTarget as HTMLSelectElement).value)}
			>
				<option value="">Select main team</option>
				{#each teamGroups as team}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
		</label>
		<label class="space-y-1 text-sm">
			<span class="text-xs uppercase tracking-wide text-slate-400">Selected Subteam</span>
			<select
				class="w-full rounded bg-slate-800 px-2 py-2"
				value={selectedSubteamId}
				onchange={(event) => onSubteamChange((event.currentTarget as HTMLSelectElement).value)}
			>
				<option value="">Select subteam</option>
				{#each subteamsForSelectedTeam as subteam}
					<option value={subteam.id}>{subteam.name}</option>
				{/each}
			</select>
		</label>
	</div>
	<p class="mt-2 text-xs text-slate-500">Switch context here before editing forms or mappings below.</p>
</div>
