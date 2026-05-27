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

<section class="fade-up space-y-5">
	<div>
		<a
			href="/mentor/courses"
			class="eyebrow-label inline-flex items-center gap-1 no-underline"
			style="color: var(--app-text-dim); text-decoration: none;"
		>
			<span style="font-size: 14px;">&#8592;</span> All courses
		</a>
		<h1 class="gradient-text mt-1 text-2xl font-bold tracking-tight">New course</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Create the module shell. You'll add video, quiz, reading, and skills check blocks in the
			builder after saving.
		</p>
	</div>

	{#if form?.error}
		<div
			class="rounded-2xl border p-3 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</div>
	{/if}

	<div class="aurora-border">
		<form
			method="POST"
			class="glass-form-card grid gap-4 rounded-2xl p-5 backdrop-blur-xl md:grid-cols-2"
		>
			<label class="flex flex-col gap-1.5 text-sm md:col-span-2">
				<span class="eyebrow-label">Title</span>
				<input
					class="glass-input"
					name="title"
					value={v('title')}
					placeholder="Drill Press Basics"
					required
				/>
			</label>
			<label class="flex flex-col gap-1.5 text-sm">
				<span class="eyebrow-label">Slug</span>
				<input
					class="glass-input mono"
					name="slug"
					value={v('slug')}
					placeholder="drill-press-basics (auto from title if blank)"
				/>
			</label>
			<label class="flex flex-col gap-1.5 text-sm md:col-span-2">
				<span class="eyebrow-label">Description</span>
				<textarea class="glass-input" name="description" rows="3">{v('description')}</textarea>
			</label>
			<div class="flex justify-end gap-2 md:col-span-2">
				<Button variant="ghost" href="/mentor/courses">Cancel</Button>
				<Button variant="primary" type="submit">Create course</Button>
			</div>
		</form>
	</div>
</section>

<style>
	.glass-form-card {
		background: var(--app-glass-bg);
		border: none;
		box-shadow: var(--app-glass-shadow);
	}
	.glass-form-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: var(--app-glass-shine);
		pointer-events: none;
	}
	.glass-input {
		border-radius: 0.75rem;
		border: 1px solid var(--app-glass-border);
		background: var(--app-glass-bg);
		color: var(--app-input-text);
		padding: 0.5rem 0.75rem;
		backdrop-filter: blur(8px);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.glass-input:hover:not(:focus) {
		border-color: var(--app-glass-border-hover);
	}
	.glass-input:focus {
		outline: none;
		border-color: var(--app-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 15%, transparent);
	}
</style>
