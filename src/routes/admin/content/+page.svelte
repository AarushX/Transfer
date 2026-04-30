<script lang="ts">
	let { data } = $props();
	const teamsByGroup = $derived.by(() => {
		const groups = new Map<string, { name: string; teams: Array<any> }>();
		for (const team of data.teams as any[]) {
			const groupSlug = String(team.team_groups?.slug ?? 'other');
			const groupName = String(team.team_groups?.name ?? 'Other');
			const bucket = groups.get(groupSlug) ?? { name: groupName, teams: [] };
			bucket.teams.push(team);
			groups.set(groupSlug, bucket);
		}
		return Array.from(groups.entries()).map(([slug, value]) => ({ slug, ...value }));
	});
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">Content Management</h1>
	<form
		method="POST"
		action="?/createNode"
		class="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-2"
	>
		<input class="rounded bg-slate-800 px-2 py-2" name="title" placeholder="Title" required />
		<input class="rounded bg-slate-800 px-2 py-2" name="slug" placeholder="slug-value" required />
		<div class="space-y-2 md:col-span-2">
			<p class="text-sm text-slate-300">Team mapping</p>
			<div class="grid gap-2 md:grid-cols-2">
				{#each teamsByGroup as group (group.slug)}
					<div class="rounded border border-slate-800 bg-slate-900/50 p-2">
						<p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.name}</p>
						<div class="space-y-1">
							{#each group.teams as team (team.id)}
								<label class="inline-flex items-center gap-2 text-sm">
									<input type="checkbox" name="team_ids" value={team.id} />
									{team.name}
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
		<textarea
			class="rounded bg-slate-800 px-2 py-2 md:col-span-2"
			name="description"
			placeholder="Description"
		></textarea>
		<button
			class="rounded bg-yellow-400 px-4 py-2 font-semibold text-slate-900 md:col-span-2"
			type="submit">Create Node</button
		>
	</form>

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="mb-2 font-semibold">Existing Nodes</h2>
		<ul class="space-y-1 text-sm text-slate-300">
			{#each data.nodes as node}
				<li>{node.title} ({node.slug})</li>
			{/each}
		</ul>
	</div>
</section>
