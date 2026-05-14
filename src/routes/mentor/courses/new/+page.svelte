<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	const selectableCategories = $derived(
		(data.trainingCategories as Array<any>).filter((c) => c.parent_id != null)
	);
	const v = (key: string, fallback: string | number = ''): string | number => {
		const values = form?.values as unknown as Record<string, string | number> | undefined;
		return values?.[key] ?? fallback;
	};
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
	<div>
		<a href="/mentor/courses" class="text-xs" style="color: var(--app-text-muted);">← All courses</a>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">New course</h1>
		<p class="text-sm" style="color: var(--app-text-muted);">
			Create the module shell. You'll add video, quiz, reading, and skills check blocks in the builder after
			saving.
		</p>
	</div>

	{#if form?.error}
		<div class="rounded-xl border p-3 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		class="grid gap-3 rounded-xl border p-4 backdrop-blur-xl md:grid-cols-2"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span style="color: var(--app-text);">Title</span>
			<input
				class="rounded-lg border px-2 py-2 backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				name="title"
				value={v('title')}
				placeholder="Drill Press Basics"
				required
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Slug</span>
			<input
				class="rounded-lg border px-2 py-2 backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				name="slug"
				value={v('slug')}
				placeholder="drill-press-basics (auto from title if blank)"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span style="color: var(--app-text);">Description</span>
			<textarea class="rounded-lg border px-2 py-2 backdrop-blur-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" name="description" rows="3"
				>{v('description')}</textarea
			>
		</label>
		<div class="flex justify-end gap-2 md:col-span-2">
			<Button variant="ghost" href="/mentor/courses">Cancel</Button>
			<Button variant="primary" type="submit">Create course</Button>
		</div>
	</form>
</section>
