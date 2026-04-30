<script lang="ts">
	import type { Category, Subteam, TeamGroup } from './types';

	type Props = {
		teamGroups: TeamGroup[];
		categories: Category[];
		selectedSubteam: Subteam | null;
		linkedGroupIdsBySubteam: Map<string, Set<string>>;
		selectedTeamId: string;
	};

	let { teamGroups, categories, selectedSubteam, linkedGroupIdsBySubteam, selectedTeamId }: Props = $props();
</script>

<div class="grid gap-4 xl:grid-cols-3">
	<form method="POST" action="?/createSubteam" class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="font-semibold">Create Subteam</h2>
		<select class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="team_group_id" value={selectedTeamId} required>
			<option value="">Primary main team</option>
			{#each teamGroups as team}
				<option value={team.id}>{team.name}</option>
			{/each}
		</select>
		<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_name" placeholder="Subteam name" required />
		<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_slug" placeholder="Slug (optional)" />
		<select class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_category_slug" required>
			<option value="">Subteam category</option>
			{#each categories as category}
				<option value={category.slug}>{category.name}</option>
			{/each}
		</select>
		<label class="flex items-center gap-2 text-xs text-slate-400">
			<span>Color</span>
			<input
				type="color"
				name="subteam_color_hex"
				value="#334155"
				class="h-8 w-10 rounded border border-slate-700 bg-slate-800 p-1"
			/>
		</label>
		<div class="max-h-24 overflow-auto rounded border border-slate-800 bg-slate-950/40 p-2 text-xs">
			<p class="mb-1 text-slate-400">Also link to:</p>
			{#each teamGroups as team}
				<label class="flex items-center gap-2 py-0.5">
					<input type="checkbox" name="linked_team_group_ids" value={team.id} />{team.name}
				</label>
			{/each}
		</div>
		<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Create subteam</button>
	</form>

	{#if selectedSubteam}
		<form method="POST" action="?/updateSubteam" class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="font-semibold">Edit Subteam</h2>
			<input type="hidden" name="subteam_id" value={selectedSubteam.id} />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_name" value={selectedSubteam.name} required />
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_slug" value={selectedSubteam.slug} required />
			<select class="w-full rounded bg-slate-800 px-2 py-2 text-sm" name="subteam_category_slug" value={selectedSubteam.category_slug ?? ''} required>
				<option value="">Subteam category</option>
				{#each categories as category}
					<option value={category.slug}>{category.name}</option>
				{/each}
			</select>
			<label class="flex items-center gap-2 text-xs text-slate-400">
				<span>Color</span>
				<input
					type="color"
					name="subteam_color_hex"
					value={selectedSubteam.color_hex}
					class="h-8 w-10 rounded border border-slate-700 bg-slate-800 p-1"
				/>
			</label>
			<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" type="number" name="subteam_sort_order" value={selectedSubteam.sort_order} />
			<div class="max-h-24 overflow-auto rounded border border-slate-800 bg-slate-950/40 p-2 text-xs">
				<p class="mb-1 text-slate-400">Linked main teams:</p>
				{#each teamGroups as team}
					<label class="flex items-center gap-2 py-0.5">
						<input
							type="checkbox"
							name="linked_team_group_ids"
							value={team.id}
							checked={linkedGroupIdsBySubteam.get(String(selectedSubteam.id))?.has(String(team.id)) ?? false}
						/>
						{team.name}
					</label>
				{/each}
			</div>
			<button class="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">Save</button>
		</form>
	{:else}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Select a subteam to edit.</div>
	{/if}

	{#if selectedSubteam}
		<form method="POST" action="?/deleteSubteam" class="rounded-xl border border-red-900/60 bg-red-950/20 p-4">
			<input type="hidden" name="subteam_id" value={selectedSubteam.id} />
			<p class="text-sm text-red-200">Delete subteam</p>
			<p class="mt-1 text-xs text-red-300/80">This removes subteam assignments and mappings that depend on it.</p>
			<button class="mt-3 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500">Delete subteam</button>
		</form>
	{:else}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Select a subteam to delete.</div>
	{/if}
</div>
