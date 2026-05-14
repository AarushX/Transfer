<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import SkillTree from '$lib/components/SkillTree.svelte';
	let { data } = $props();

	const statusLabel = (s: string) =>
		s === 'completed' ? 'Done'
		: s === 'in_progress' ? 'In progress'
		: s === 'quiz_pending' ? 'Quiz pending'
		: s === 'awaiting_checkoff' ? 'Awaiting checkoff'
		: s === 'available' ? 'Start'
		: 'Locked';

	const statusColor = (s: string) =>
		s === 'completed' ? 'var(--app-success)'
		: s === 'in_progress' || s === 'quiz_pending' || s === 'awaiting_checkoff' ? 'var(--app-warning)'
		: s === 'available' ? 'var(--app-accent)'
		: 'var(--app-text-dim)';

	const switchTeam = (tgId: string) => {
		const u = new URL(page.url);
		u.searchParams.set('team', tgId);
		goto(u.pathname + '?' + u.searchParams.toString(), { keepFocus: true });
	};

	const teamGroupPages = $derived((data.leadPages ?? []).filter((p: any) => p.scope_kind === 'team_group'));
	const subteamPages = $derived((data.leadPages ?? []).filter((p: any) => p.scope_kind === 'subteam'));

	const pctComplete = $derived(
		data.totalCount > 0 ? Math.round((data.completedCount / data.totalCount) * 100) : 0
	);
</script>

<section class="space-y-4">
	{#if (data.myTeamGroups ?? []).length === 0}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">You haven't been assigned to a team yet. Visit <a href="/onboarding" class="underline" style="color: var(--app-accent);">Onboarding</a> to pick your team.</p>
		</GlassCard>
	{:else}
		<!-- Chips bar -->
		<div class="fade-up flex flex-wrap items-center gap-2">
			{#each data.myTeamGroups as tg (tg.id)}
				{@const isActive = tg.id === data.selectedTeamGroupId}
				<button
					type="button"
					onclick={() => switchTeam(tg.id)}
					class="rounded-full border px-4 py-1.5 text-sm font-medium transition-all"
					style={isActive
						? `background: ${tg.color_hex || 'var(--app-accent)'}; border-color: transparent; color: white;`
						: `background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);`}
				>
					{tg.name}{tg.designator ? ` · ${tg.designator}` : ''}
				</button>
			{/each}
		</div>

		<!-- Lead-managed page tabs (team-level first, then subteam) -->
		{#if teamGroupPages.length > 0 || subteamPages.length > 0}
			<div class="fade-up flex flex-wrap items-center gap-1.5" style="animation-delay: 0.05s;">
				<a href={page.url.pathname + page.url.search} class="rounded-lg px-3 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);">Team Page</a>
				{#each teamGroupPages as p (p.id)}
					{#if p.kind === 'redirect'}
						<a href={p.redirect_url} target="_blank" rel="noopener" class="rounded-lg border px-3 py-1 text-xs font-medium" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">{p.title} ↗</a>
					{:else}
						<a href={`/team/${p.slug}?team=${data.selectedTeamGroupId}`} class="rounded-lg border px-3 py-1 text-xs font-medium" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">{p.title}</a>
					{/if}
				{/each}
				{#if subteamPages.length > 0}
					<span class="text-[10px]" style="color: var(--app-text-dim);">·</span>
					{#each subteamPages as p (p.id)}
						{#if p.kind === 'redirect'}
							<a href={p.redirect_url} target="_blank" rel="noopener" class="rounded-lg border px-3 py-1 text-xs font-medium" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">{p.title} ↗</a>
						{:else}
							<a href={`/team/${p.slug}?team=${data.selectedTeamGroupId}`} class="rounded-lg border px-3 py-1 text-xs font-medium" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">{p.title}</a>
						{/if}
					{/each}
				{/if}
			</div>
		{/if}

		<!-- 1/3 + 2/3 grid -->
		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
			<!-- LEFT: courses as nested task list -->
			<div class="space-y-3">
				<GlassCard compact>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs uppercase tracking-wider" style="color: var(--app-text-muted);">Progress</p>
							<p class="mt-0.5 text-lg font-bold" style="color: var(--app-text);">{data.completedCount} / {data.totalCount}</p>
						</div>
						<div class="text-right">
							<p class="text-xs" style="color: var(--app-text-dim);">{pctComplete}%</p>
						</div>
					</div>
					<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
						<div class="h-full rounded-full transition-all" style="width: {pctComplete}%; background: var(--app-accent);"></div>
					</div>
				</GlassCard>

				<div class="rounded-2xl border" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<p class="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style="border-color: var(--app-glass-border); color: var(--app-text-muted);">Courses</p>
					<ul class="max-h-[60vh] overflow-y-auto">
						{#each data.courses as course (course.id)}
							<li>
								<a
									href={`/learn/${course.slug}`}
									class="flex items-center gap-2 border-b px-4 py-2.5 transition-colors hover:bg-white/5"
									style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
								>
									<span class="grid h-4 w-4 shrink-0 place-items-center rounded-full border" style="border-color: {statusColor(course.status)}; background: {course.status === 'completed' ? statusColor(course.status) : 'transparent'};">
										{#if course.status === 'completed'}
											<svg viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-2.5 w-2.5"><path d="M3 8l3 3 7-7" /></svg>
										{/if}
									</span>
									<span class="flex-1 truncate text-sm" style="color: var(--app-text);">{course.title}</span>
									<span class="shrink-0 text-[10px] font-medium uppercase tracking-wider" style="color: {statusColor(course.status)};">{statusLabel(course.status)}</span>
								</a>
							</li>
						{/each}
						{#if data.courses.length === 0}
							<li class="px-4 py-6 text-center text-xs" style="color: var(--app-text-dim);">No courses for this team yet.</li>
						{/if}
					</ul>
				</div>
			</div>

			<!-- RIGHT: rank + graph -->
			<div class="space-y-3">
				<div class="grid gap-3 sm:grid-cols-3">
					<GlassCard compact>
						<p class="text-xs uppercase tracking-wider" style="color: var(--app-text-muted);">RR</p>
						<p class="mt-0.5 text-xl font-bold" style="color: var(--app-accent);">{data.rrTotal}</p>
					</GlassCard>
					<GlassCard compact>
						<p class="text-xs uppercase tracking-wider" style="color: var(--app-text-muted);">Segments</p>
						<p class="mt-0.5 text-xl font-bold" style="color: var(--app-text);">{data.segmentCompletions}</p>
					</GlassCard>
					<GlassCard compact>
						<p class="text-xs uppercase tracking-wider" style="color: var(--app-text-muted);">Shop Hours</p>
						<p class="mt-0.5 text-xl font-bold" style="color: var(--app-text);">{Math.floor(data.totalHours)}</p>
					</GlassCard>
				</div>

				<div class="rounded-2xl border overflow-hidden" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<p class="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style="border-color: var(--app-glass-border); color: var(--app-text-muted);">Skill Graph</p>
					<SkillTree nodes={data.nodes} statuses={data.nodeStatuses} prerequisites={data.nodePrereqs} />
				</div>
			</div>
		</div>
	{/if}
</section>
