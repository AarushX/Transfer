<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import StatusDonut from '$lib/components/StatusDonut.svelte';
	import MiniSkillTree from '$lib/components/MiniSkillTree.svelte';
	let { data, form } = $props();

	let editingNotes = $state(false);
	let notesDraft = $state(data.notes ?? '');

	$effect(() => {
		notesDraft = data.notes ?? '';
	});

	const statusLabel = (s: string) =>
		s === 'completed' ? 'Done'
		: s === 'in_progress' ? 'In progress'
		: s === 'quiz_pending' ? 'Quiz pending'
		: s === 'video_pending' ? 'Video pending'
		: s === 'awaiting_checkoff' ? 'Awaiting checkoff'
		: s === 'mentor_checkoff_pending' ? 'Awaiting mentor'
		: s === 'checkoff_needs_review' ? 'Needs review'
		: s === 'checkoff_blocked' ? 'Blocked'
		: s === 'available' ? 'Available'
		: 'Locked';

	const statusColor = (s: string) =>
		s === 'completed' ? 'var(--app-success)'
		: s === 'in_progress' || s === 'quiz_pending' || s === 'video_pending' ? 'var(--app-info)'
		: s === 'awaiting_checkoff' || s === 'mentor_checkoff_pending' ? 'var(--app-warning)'
		: s === 'checkoff_needs_review' || s === 'checkoff_blocked' ? 'var(--app-danger)'
		: s === 'available' ? 'var(--app-accent)'
		: 'var(--app-text-dim)';

	const total = $derived((data.courses ?? []).length);
	const inProgress = $derived((data.courses ?? []).filter((c: any) => ['in_progress', 'video_pending', 'quiz_pending'].includes(c.status)));
</script>

<section class="space-y-6">
	{#if !data.teamGroup}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">You haven't been assigned to a team yet. Visit <a href="/onboarding" class="underline" style="color: var(--app-accent);">Onboarding</a> to pick your team.</p>
		</GlassCard>
	{:else}
		<!-- ═══════════ HEADER ═══════════ -->
		<header class="fade-up flex items-end justify-between">
			<div>
				<p class="eyebrow-label">{data.teamGroup.designator ?? 'Team'}</p>
				<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">{data.teamGroup.name}</span></h1>
			</div>
			<a href={`/courses/map?scope=teamgroup:${data.teamGroup.id}`} class="text-xs font-semibold rounded-lg border px-3 py-1.5" style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);">Open full graph →</a>
		</header>

		<!-- ═══════════ DONUT + MINI SKILL MAP ROW ═══════════ -->
		<div class="fade-up grid gap-4 md:grid-cols-[1.6fr_1fr]" style="animation-delay: 0.05s;">
			<!-- Left: donut + legend -->
			<div class="rounded-2xl border p-5 backdrop-blur-xl flex gap-4 items-center" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
				<StatusDonut counts={data.statusCounts} size={130} />
				<div class="flex-1">
					<p class="eyebrow-label">Subteam progress</p>
					<div class="flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight" style="color: var(--app-text);">{data.statusCounts.done}</span>
						<span class="text-sm" style="color: var(--app-text-muted);">of {total} done</span>
					</div>
					<p class="text-xs" style="color: var(--app-text-dim);">+{data.recentCompletions} this week</p>
					<ul class="mt-3 space-y-1 text-xs" style="color: var(--app-text-muted);">
						<li><span class="inline-block h-2 w-2 rounded-full mr-2" style="background: var(--app-success);"></span><strong>{data.statusCounts.done}</strong> done</li>
						<li><span class="inline-block h-2 w-2 rounded-full mr-2" style="background: var(--app-info);"></span><strong>{data.statusCounts.current}</strong> in progress</li>
						<li><span class="inline-block h-2 w-2 rounded-full mr-2" style="background: var(--app-warning);"></span><strong>{data.statusCounts.awaiting}</strong> awaiting mentor</li>
						<li><span class="inline-block h-2 w-2 rounded-full mr-2" style="background: var(--app-danger);"></span><strong>{data.statusCounts.blocked}</strong> blocked</li>
						<li><span class="inline-block h-2 w-2 rounded-full mr-2" style="background: var(--app-text-dim, var(--app-text-muted));"></span><strong>{data.statusCounts.locked}</strong> locked</li>
					</ul>
				</div>
			</div>
			<!-- Right: mini skill map -->
			<div>
				<MiniSkillTree
					nodes={data.graphNodes}
					statuses={data.userStatuses}
					prerequisites={data.graphPrereqs}
					scope={data.scopeNodeIds}
				/>
			</div>
		</div>

		<!-- ═══════════ COURSES — STATUS-TINTED CARDS ═══════════ -->
		<div class="fade-up space-y-3" style="animation-delay: 0.1s;">
			<div class="flex items-end justify-between">
				<p class="text-xs uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Coursework</p>
			</div>

			{#if inProgress.length > 0}
				<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
					{#each inProgress as c (c.id)}
						<a href={`/learn/${c.slug}`} class="group flex w-48 shrink-0 flex-col gap-1.5 rounded-xl border p-3 transition-all hover:scale-[1.02]"
							style="background: linear-gradient(135deg, color-mix(in srgb, var(--app-info) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-info) 35%, var(--app-glass-border));">
							<span class="inline-block w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style="background: color-mix(in srgb, var(--app-info) 18%, transparent); color: var(--app-info);">{statusLabel(c.status)}</span>
							<p class="text-sm font-semibold leading-tight" style="color: var(--app-text);">{c.title}</p>
							<p class="mt-auto text-[10px] font-medium" style="color: var(--app-accent);">Continue →</p>
						</a>
					{/each}
				</div>
			{/if}

			<div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
				{#each data.courses as c (c.id)}
					{@const tone =
						c.status === 'completed' ? 'done'
						: ['mentor_checkoff_pending','awaiting_checkoff'].includes(c.status) ? 'awaiting'
						: ['checkoff_needs_review','checkoff_blocked'].includes(c.status) ? 'blocked'
						: ['in_progress','video_pending','quiz_pending'].includes(c.status) ? 'current'
						: c.status === 'available' ? 'avail'
						: 'locked'}
					<a href={`/learn/${c.slug}`}
						class="block rounded-xl border p-3 transition-all hover:translate-y-[-1px]"
						style={
							tone === 'done' ? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-success) 10%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-success) 35%, var(--app-glass-border));'
							: tone === 'current' ? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-info) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-info) 40%, var(--app-glass-border));'
							: tone === 'awaiting' ? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-warning) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-warning) 40%, var(--app-glass-border));'
							: tone === 'blocked' ? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-danger) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-danger) 40%, var(--app-glass-border));'
							: tone === 'avail' ? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 10%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-glass-border));'
							: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); opacity: .65;'
						}>
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2 min-w-0 flex-1">
								<div class="h-5 w-5 rounded-full grid place-items-center text-xs font-bold shrink-0"
									style={
										tone === 'done' ? 'background: var(--app-success); color: var(--app-bg);'
										: tone === 'current' ? 'background: var(--app-info); color: var(--app-bg);'
										: tone === 'awaiting' ? 'background: var(--app-warning); color: var(--app-bg);'
										: tone === 'blocked' ? 'background: var(--app-danger); color: var(--app-bg);'
										: tone === 'avail' ? 'background: color-mix(in srgb, var(--app-accent) 30%, transparent); color: var(--app-accent);'
										: 'background: var(--app-glass-bg); color: var(--app-text-muted); border: 1px solid var(--app-glass-border);'
									}>
									{#if tone === 'done'}✓{:else if tone === 'awaiting'}!{:else if tone === 'blocked'}!{:else if tone === 'current'}·{:else if tone === 'avail'}→{:else}·{/if}
								</div>
								<p class="text-sm font-medium leading-tight" style="color: var(--app-text);">{c.title}</p>
							</div>
						</div>
						<p class="mt-1.5 text-[10px] font-medium uppercase tracking-wider" style="color: {statusColor(c.status)};">{statusLabel(c.status)}</p>
					</a>
				{/each}
			</div>
			{#if total === 0}
				<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">No courses assigned to this team yet.</p></GlassCard>
			{/if}
		</div>

		<!-- ═══════════ NOTES ═══════════ -->
		<div class="fade-up" style="animation-delay: 0.15s;">
			<div class="flex items-end justify-between">
				<div>
					<p class="text-xs uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Team Notes</p>
					<p class="text-xs" style="color: var(--app-text-dim);">{data.canEditNotes ? 'Visible to everyone · editable by team leads' : 'Posted by team leads'}</p>
				</div>
				{#if data.canEditNotes && !editingNotes}
					<Button variant="ghost" size="sm" onclick={() => { editingNotes = true; notesDraft = data.notes ?? ''; }}>Edit</Button>
				{/if}
			</div>
			<div class="mt-2 rounded-2xl border p-4" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
				{#if editingNotes}
					<form method="POST" action="?/saveNotes" class="space-y-2">
						<input type="hidden" name="team_group_id" value={data.teamGroup.id} />
						<textarea name="body" bind:value={notesDraft} rows="8" placeholder="Add team notes here — announcements, meeting times, links, anything the team should see." class="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style="border-color: var(--app-glass-border); color: var(--app-input-text);"></textarea>
						<div class="flex items-center gap-2">
							<Button variant="primary" size="sm" type="submit">Save</Button>
							<Button variant="ghost" size="sm" onclick={() => { editingNotes = false; notesDraft = data.notes ?? ''; }}>Cancel</Button>
						</div>
					</form>
				{:else if data.notes}
					<p class="text-sm whitespace-pre-wrap" style="color: var(--app-text);">{data.notes}</p>
				{:else}
					<p class="text-sm italic" style="color: var(--app-text-dim);">No notes yet.</p>
				{/if}
			</div>
		</div>

		{#if form?.error}
			<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
		{:else if form?.ok}
			<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
		{/if}

		<!-- ═══════════ ROSTER (lead-only) ═══════════ -->
		{#if data.roster && data.roster.length > 0}
			<div class="fade-up" style="animation-delay: 0.2s;">
				<div class="flex items-end justify-between">
					<div>
						<p class="text-xs uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Roster</p>
						<p class="text-xs" style="color: var(--app-text-dim);">{data.roster.length} member{data.roster.length !== 1 ? 's' : ''} · visible to team leads only</p>
					</div>
				</div>
				<div class="mt-2 overflow-hidden rounded-2xl border" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<table class="w-full text-sm">
						<thead style="background: var(--app-table-header-bg);">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style="color: var(--app-text-muted);">Member</th>
								<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style="color: var(--app-text-muted);">Subteams</th>
								<th class="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style="color: var(--app-text-muted);">Roles</th>
							</tr>
						</thead>
						<tbody>
							{#each data.roster as m (m.id)}
								<tr class="border-t" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
									<td class="px-4 py-2.5">
										<p class="text-sm font-medium" style="color: var(--app-text);">{m.full_name || m.email}</p>
										<p class="text-[11px]" style="color: var(--app-text-dim);">{m.email}</p>
									</td>
									<td class="px-4 py-2.5">
										<div class="flex flex-wrap gap-1">
											{#each m.categories as c}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-info) 12%, transparent); color: var(--app-info);">{c}</span>{/each}
										</div>
									</td>
									<td class="px-4 py-2.5">
										<div class="flex flex-wrap gap-1">
											{#if m.role === 'admin' || m.base_role === 'admin'}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">admin</span>{/if}
											{#if m.is_mentor}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);">mentor</span>{/if}
											{#if m.is_lead}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);">lead</span>{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</section>
