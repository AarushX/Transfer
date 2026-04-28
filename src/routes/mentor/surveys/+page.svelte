<script lang="ts">
	let { data } = $props();
</script>

<section class="space-y-5">
	<div class="flex items-center justify-between">
		<div>
			<a href="/mentor" class="text-xs text-slate-400">← Mentor home</a>
			<h1 class="text-2xl font-semibold">Surveys</h1>
			<p class="text-sm text-slate-400">
				Separate from modules, with module prerequisites and visibility windows.
			</p>
		</div>
		<a
			href="/mentor/surveys/new"
			class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300"
		>
			+ New survey
		</a>
	</div>

	<div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
		<table class="w-full text-sm">
			<thead class="bg-slate-800 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-3 py-2">Title</th>
					<th class="px-3 py-2">Window</th>
					<th class="px-3 py-2">Status</th>
					<th class="px-3 py-2 text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.surveys as survey (survey.id)}
					<tr class="border-t border-slate-800">
						<td class="px-3 py-2">
							<p class="font-medium">{survey.title}</p>
							<p class="text-xs text-slate-400">{survey.slug}</p>
						</td>
						<td class="px-3 py-2 text-xs text-slate-300">
							{survey.visible_from ? new Date(survey.visible_from).toLocaleString() : 'Any time'} to
							{survey.visible_until ? new Date(survey.visible_until).toLocaleString() : 'Any time'}
						</td>
						<td class="px-3 py-2 text-xs">
							<span class="rounded bg-slate-800 px-2 py-0.5">
								{survey.is_active ? 'Active' : 'Inactive'}
							</span>
							{#if survey.show_when_inactive}
								<span class="ml-1 rounded bg-sky-900/30 px-2 py-0.5 text-sky-200">
									Show while inactive
								</span>
							{/if}
						</td>
						<td class="px-3 py-2 text-right">
							<a
								href={`/mentor/surveys/${survey.slug}`}
								class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
								>Edit</a
							>
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">No surveys yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
