<script lang="ts">
	import type { TeamGroup } from './types';

	type Props = {
		selectedTeam: TeamGroup | null;
	};

	let { selectedTeam }: Props = $props();
</script>

<div class="grid gap-4 xl:grid-cols-3">
	<form method="POST" action="?/createTeam" class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="font-semibold">Create Main Team</h2>
		<input
			class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
			name="team_name"
			placeholder="Main team name (e.g. FTC 1002)"
			required
		/>
		<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_slug" placeholder="Slug (optional)" />
		<label class="flex items-center gap-2 text-xs text-slate-400">
			<span>Color</span>
			<input
				type="color"
				name="team_color_hex"
				value="#475569"
				class="h-8 w-10 rounded border border-slate-700 bg-slate-800 p-1"
			/>
		</label>
		<input
			class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
			type="number"
			name="team_sort_order"
			placeholder="Sort order"
		/>
		<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Create main team</button>
	</form>

	{#if selectedTeam}
		<form method="POST" action="?/updateTeam" class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Edit Main Team</h2>
			<input type="hidden" name="team_group_id" value={selectedTeam.id} />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_name" value={selectedTeam.name} required />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_slug" value={selectedTeam.slug} required />
			<label class="flex items-center gap-2 text-xs text-slate-400">
				<span>Color</span>
				<input
					type="color"
					name="team_color_hex"
					value={selectedTeam.color_hex}
					class="h-8 w-10 rounded border border-slate-700 bg-slate-800 p-1"
				/>
			</label>
			<input
				class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
				type="number"
				name="team_sort_order"
				value={selectedTeam.sort_order}
			/>
			<button class="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">Save</button>
		</form>
	{:else}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Select a main team to edit.</div>
	{/if}

	{#if selectedTeam}
		<form method="POST" action="?/deleteTeam" class="rounded-xl border border-red-900/60 bg-red-950/20 p-4">
			<input type="hidden" name="team_group_id" value={selectedTeam.id} />
			<p class="text-sm text-red-200">Delete main team</p>
			<p class="mt-1 text-xs text-red-300/80">Only available when no primary subteams belong to it.</p>
			<button class="mt-3 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500">Delete main team</button>
		</form>
	{:else}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Select a main team to delete.</div>
	{/if}
</div>
