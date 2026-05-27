<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';

	type CatalogCourse = {
		nodeId: string;
		title: string;
		slug: string;
		code: string | null;
		proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | null;
		description: string;
		subteamIds: string[];
		teamGroupIds: string[];
		status: string;
		isRequired: boolean;
		href: string;
	};

	let { data } = $props();

	type Team = { id: string; name: string; color_hex: string; team_group_id: string };

	const teamsById = $derived(new Map(((data.teams ?? []) as Team[]).map((t) => [String(t.id), t])));
	const teamGroupsById = $derived(
		new Map(
			((data.teamGroups ?? []) as Array<{ id: string; name: string; color_hex: string }>).map(
				(g) => [String(g.id), g]
			)
		)
	);

	const catalog = $derived((data.catalog ?? []) as CatalogCourse[]);

	const completed = $derived(catalog.filter((c) => c.status === 'completed'));
	const required = $derived(catalog.filter((c) => c.isRequired && c.status !== 'completed'));
	const available = $derived(catalog.filter((c) => !c.isRequired && c.status !== 'completed'));

	const LEVEL_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
	function sortCourses(list: CatalogCourse[]): CatalogCourse[] {
		return [...list].sort((a, b) => {
			const la = a.proficiencyLevel ? LEVEL_ORDER[a.proficiencyLevel] : 99;
			const lb = b.proficiencyLevel ? LEVEL_ORDER[b.proficiencyLevel] : 99;
			if (la !== lb) return la - lb;
			return (a.code ?? a.title).localeCompare(b.code ?? b.title);
		});
	}

	function subteamChips(course: CatalogCourse) {
		const chips: Array<{ label: string; color: string }> = [];
		for (const id of course.subteamIds) {
			const team = teamsById.get(id);
			if (team) chips.push({ label: team.name, color: team.color_hex || '#475569' });
		}
		for (const id of course.teamGroupIds) {
			const group = teamGroupsById.get(id);
			if (group)
				chips.push({ label: `${group.name} · all subteams`, color: group.color_hex || '#475569' });
		}
		return chips;
	}

	function statusLabel(status: string) {
		switch (status) {
			case 'completed':
				return 'Completed';
			case 'video_pending':
				return 'Watch video';
			case 'quiz_pending':
				return 'Take quiz';
			case 'mentor_checkoff_pending':
				return 'Awaiting checkoff';
			case 'available':
				return 'Start';
			default:
				return 'Locked';
		}
	}
</script>

<section class="space-y-6">
	<PageHeader
		title="Coursework"
		description="Every course offered to your team and subteams. Required ones come first; everything else is browsable."
	/>

	{#if catalog.length === 0}
		<EmptyState
			title="No courses available yet"
			description="Once your team is set in onboarding, the catalog will populate."
		/>
	{:else}
		{#snippet courseCard(course: CatalogCourse)}
			{@const chips = subteamChips(course)}
			{@const isLocked = course.status === 'locked'}
			<a
				href={course.href}
				class="cw-card group flex flex-col rounded-2xl border p-4 transition duration-150"
				style="border-color: var(--app-glass-border); background: var(--app-glass-bg); opacity: {isLocked
					? 0.62
					: 1};"
				aria-disabled={isLocked}
			>
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-1.5">
							{#if course.proficiencyLevel}
								<ProficiencyBadge level={course.proficiencyLevel} code={course.code} size="xs" />
							{:else if course.code}
								<span class="mono text-[10px]" style="color: var(--app-text-dim);"
									>{course.code}</span
								>
							{/if}
						</div>
						<p class="mt-1.5 truncate text-sm font-semibold" style="color: var(--app-text);">
							{course.title}
						</p>
					</div>
					<span
						class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
						style={course.status === 'completed'
							? 'background: color-mix(in srgb, var(--app-success) 14%, transparent); color: var(--app-success); border: 1px solid color-mix(in srgb, var(--app-success) 32%, transparent);'
							: isLocked
								? 'background: color-mix(in srgb, var(--app-text-dim) 8%, transparent); color: var(--app-text-dim); border: 1px solid var(--app-glass-border);'
								: 'background: color-mix(in srgb, var(--app-accent) 14%, transparent); color: var(--app-accent); border: 1px solid color-mix(in srgb, var(--app-accent) 32%, transparent);'}
					>
						{statusLabel(course.status)}
					</span>
				</div>

				{#if course.description}
					<p
						class="mt-2 line-clamp-2 text-[12px] leading-snug"
						style="color: var(--app-text-muted);"
					>
						{course.description}
					</p>
				{/if}

				{#if chips.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each chips as chip}
							<span
								class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
								style="border-color: color-mix(in srgb, {chip.color} 50%, transparent); background: color-mix(in srgb, {chip.color} 12%, transparent); color: color-mix(in srgb, {chip.color} 70%, white);"
							>
								<span class="h-1.5 w-1.5 rounded-full" style="background: {chip.color};"></span>
								{chip.label}
							</span>
						{/each}
					</div>
				{/if}
			</a>
		{/snippet}

		{#snippet section(title: string, list: CatalogCourse[], emptyMsg: string, accent: string)}
			<div class="space-y-3">
				<div class="flex items-center gap-2">
					<span class="h-1.5 w-1.5 rounded-full" style="background: {accent};"></span>
					<h2 class="text-sm font-bold tracking-wider uppercase" style="color: var(--app-text);">
						{title}
					</h2>
					<span class="mono text-[11px]" style="color: var(--app-text-dim);">{list.length}</span>
				</div>
				{#if list.length === 0}
					<p class="text-sm" style="color: var(--app-text-dim);">{emptyMsg}</p>
				{:else}
					<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{#each sortCourses(list) as course (course.nodeId)}
							{@render courseCard(course)}
						{/each}
					</div>
				{/if}
			</div>
		{/snippet}

		{@render section(
			'Required for you',
			required,
			'Nothing required right now.',
			'var(--app-accent)'
		)}
		{@render section(
			'Available to browse',
			available,
			'No optional courses available.',
			'var(--app-info)'
		)}
		{@render section(
			'Completed',
			completed,
			'Nothing finished yet — go knock one out.',
			'var(--app-success)'
		)}
	{/if}
</section>

<style>
	.cw-card:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-glass-border)) !important;
		box-shadow: 0 8px 24px -16px rgba(0, 0, 0, 0.4);
	}
</style>
