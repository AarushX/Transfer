<script lang="ts">
	import { WORKFLOW_META } from '$lib/surveys/workflows';
	import Button from '$lib/components/ui/Button.svelte';
	import GlassTable from '$lib/components/ui/GlassTable.svelte';
	let { data, form } = $props();
	let showTemplatePanel = $state(false);
	let selectedTemplateId = $state((data.templates?.[0]?.id as string | undefined) ?? '');
	let newTitle = $state('');
	let newSlug = $state('');
	const selectedTemplate = $derived(
		(data.templates ?? []).find((t: any) => t.id === selectedTemplateId) ?? null
	);
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
	<div class="fade-up flex items-center justify-between">
		<div>
			<a href="/mentor" class="text-xs" style="color: var(--app-text-muted);">← Mentor home</a>
			<p class="eyebrow-label" style="margin-top: 4px; margin-bottom: 2px;">Mentor Panel</p>
			<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Surveys</span></h1>
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
				Separate from modules, with module prerequisites and visibility windows.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="primary" href="/mentor/surveys/new">+ New survey</Button>
			{#if (data.templates ?? []).length > 0}
				<Button variant="secondary" onclick={() => (showTemplatePanel = !showTemplatePanel)}
					>Use template</Button
				>
			{/if}
		</div>
	</div>
	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{/if}
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<form
			method="POST"
			action="?/createFromTemplate"
			class="grid gap-2 rounded-xl border p-3 md:grid-cols-4"
			style="border-color: var(--app-info); background: color-mix(in srgb, var(--app-info) 8%, transparent);"
		>
			<select
				name="template_id"
				class="rounded-lg border px-2 py-2 text-xs backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				bind:value={selectedTemplateId}
			>
				{#each data.templates as template (template.id)}
					<option value={template.id}>{template.name}</option>
				{/each}
			</select>
			<input
				name="title"
				class="rounded-lg border px-2 py-2 text-xs backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				bind:value={newTitle}
				placeholder="Survey title"
				required
			/>
			<input
				name="slug"
				class="rounded-lg border px-2 py-2 text-xs backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				bind:value={newSlug}
				placeholder="Slug (optional)"
			/>
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" type="submit">Create</Button>
				<Button variant="ghost" size="sm" onclick={() => (showTemplatePanel = false)}>Cancel</Button
				>
			</div>
		</form>
	{/if}

	<GlassTable>
		<thead>
			<tr>
				<th>Title</th>
				<th>Workflow</th>
				<th>Window</th>
				<th>Status</th>
				<th class="text-right">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.surveys as survey (survey.id)}
				<tr>
					<td>
						<p class="font-medium" style="color: var(--app-text);">{survey.title}</p>
						<p class="text-xs" style="color: var(--app-text-muted);">{survey.slug}</p>
					</td>
					<td class="text-xs" style="color: var(--app-text);">
						{workflowLabel(survey.workflowKind)}
					</td>
					<td class="text-xs" style="color: var(--app-text);">
						{survey.visible_from ? new Date(survey.visible_from).toLocaleString() : 'Any time'} to
						{survey.visible_until ? new Date(survey.visible_until).toLocaleString() : 'Any time'}
					</td>
					<td class="text-xs">
						<span
							class="rounded-lg px-2 py-0.5"
							style="background: var(--app-surface-alt); color: var(--app-text);"
						>
							{survey.is_active ? 'Active' : 'Inactive'}
						</span>
						{#if survey.show_when_inactive}
							<span
								class="ml-1 rounded-lg px-2 py-0.5"
								style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);"
							>
								Show while inactive
							</span>
						{/if}
					</td>
					<td class="text-right">
						<Button variant="secondary" size="sm" href={`/mentor/surveys/${survey.slug}`}
							>Edit</Button
						>
					</td>
				</tr>
			{:else}
				<tr
					><td colspan="5" class="px-3 py-6 text-center" style="color: var(--app-text-muted);"
						>No surveys yet.</td
					></tr
				>
			{/each}
		</tbody>
	</GlassTable>
</section>
