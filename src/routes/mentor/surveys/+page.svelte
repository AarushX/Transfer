<script lang="ts">
	import { WORKFLOW_META } from '$lib/surveys/workflows';
	let { data, form } = $props();
	let showTemplatePanel = $state(false);
	let selectedTemplateId = $state((data.templates?.[0]?.id as string | undefined) ?? '');
	let newTitle = $state('');
	let newSlug = $state('');
	const selectedTemplate = $derived((data.templates ?? []).find((t: any) => t.id === selectedTemplateId) ?? null);
	$effect(() => {
		if (!newTitle && selectedTemplate) newTitle = String(selectedTemplate.title ?? '');
	});
	const workflowLabel = (kind: string) => {
		if (kind === 'leadership' || kind === 'school' || kind === 'carpool') {
			return WORKFLOW_META[kind].label;
		}
		return 'Custom';
	};
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
		<div class="flex items-center gap-2">
			<a
				href="/mentor/surveys/new"
				class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-yellow-300"
			>
				+ New survey
			</a>
			{#if (data.templates ?? []).length > 0}
				<button
					type="button"
					class="rounded border border-sky-700 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/30"
					onclick={() => (showTemplatePanel = !showTemplatePanel)}
				>
					Use template
				</button>
			{/if}
		</div>
	</div>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<form method="POST" action="?/createFromTemplate" class="grid gap-2 rounded-xl border border-sky-800/70 bg-sky-950/20 p-3 md:grid-cols-4">
			<select name="template_id" class="rounded bg-slate-800 px-2 py-2 text-xs" bind:value={selectedTemplateId}>
				{#each data.templates as template (template.id)}
					<option value={template.id}>{template.name}</option>
				{/each}
			</select>
			<input name="title" class="rounded bg-slate-800 px-2 py-2 text-xs" bind:value={newTitle} placeholder="Survey title" required />
			<input name="slug" class="rounded bg-slate-800 px-2 py-2 text-xs" bind:value={newSlug} placeholder="Slug (optional)" />
			<div class="flex gap-2">
				<button class="rounded border border-sky-700 px-3 py-2 text-xs text-sky-200">Create</button>
				<button type="button" class="rounded border border-slate-700 px-3 py-2 text-xs" onclick={() => (showTemplatePanel = false)}>Cancel</button>
			</div>
		</form>
	{/if}

	<div class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
		<table class="w-full text-sm">
			<thead class="bg-slate-800 text-left text-xs uppercase text-slate-400">
				<tr>
					<th class="px-3 py-2">Title</th>
					<th class="px-3 py-2">Workflow</th>
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
							{workflowLabel(survey.workflowKind)}
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
					<tr><td colspan="5" class="px-3 py-6 text-center text-slate-400">No surveys yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
