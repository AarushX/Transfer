<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
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
		: s === 'awaiting_checkoff' ? 'Awaiting checkoff'
		: s === 'available' ? 'Available'
		: 'Locked';

	const statusColor = (s: string) =>
		s === 'completed' ? 'var(--app-success)'
		: s === 'in_progress' || s === 'quiz_pending' || s === 'awaiting_checkoff' ? 'var(--app-warning)'
		: s === 'available' ? 'var(--app-accent)'
		: 'var(--app-text-dim)';

	const completed = $derived((data.courses ?? []).filter((c: any) => c.status === 'completed').length);
	const total = $derived((data.courses ?? []).length);
	const inProgress = $derived((data.courses ?? []).filter((c: any) => ['in_progress', 'quiz_pending', 'awaiting_checkoff'].includes(c.status)));
	const pct = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);
</script>

<section class="space-y-6">
	{#if !data.teamGroup}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">You haven't been assigned to a team yet. Visit <a href="/onboarding" class="underline" style="color: var(--app-accent);">Onboarding</a> to pick your team.</p>
		</GlassCard>
	{:else}
		<header class="fade-up">
			<p class="eyebrow-label" style="margin-bottom: 4px;">{data.teamGroup.designator ?? 'Team'}</p>
			<h1 class="text-2xl font-bold tracking-tight" style="color: var(--app-text);">
				<span class="gradient-text">{data.teamGroup.name}</span>
			</h1>
		</header>

		<!-- ═══════════ COURSES AT TOP — MODERN UI ═══════════ -->
		<div class="fade-up space-y-3" style="animation-delay: 0.05s;">
			<div class="flex items-end justify-between">
				<div>
					<p class="text-xs uppercase tracking-[0.18em]" style="color: var(--app-text-muted);">Coursework</p>
					<p class="mt-0.5 text-lg font-bold" style="color: var(--app-text);">
						{completed} <span class="text-sm font-medium" style="color: var(--app-text-muted);">/ {total} completed</span>
					</p>
				</div>
				<div class="text-right">
					<p class="text-2xl font-bold" style="color: {pct === 100 ? 'var(--app-success)' : 'var(--app-accent)'};">{pct}%</p>
				</div>
			</div>
			<div class="h-1.5 w-full overflow-hidden rounded-full" style="background: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
				<div class="h-full rounded-full transition-all" style="width: {pct}%; background: linear-gradient(90deg, var(--app-accent), var(--app-info));"></div>
			</div>

			{#if inProgress.length > 0}
				<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
					{#each inProgress as c (c.id)}
						<a href={`/learn/${c.slug}`} class="group flex w-48 shrink-0 flex-col gap-1.5 rounded-xl border p-3 transition-all hover:scale-[1.02]"
							style="background: linear-gradient(135deg, color-mix(in srgb, var(--app-warning) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-warning) 35%, var(--app-glass-border));">
							<span class="inline-block w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style="background: color-mix(in srgb, var(--app-warning) 18%, transparent); color: var(--app-warning);">{statusLabel(c.status)}</span>
							<p class="text-sm font-semibold leading-tight" style="color: var(--app-text);">{c.title}</p>
							<p class="mt-auto text-[10px] font-medium" style="color: var(--app-accent);">Continue →</p>
						</a>
					{/each}
				</div>
			{/if}

			<div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
				{#each data.courses as c (c.id)}
					<a href={`/learn/${c.slug}`} class="group relative overflow-hidden rounded-xl border p-3 transition-all hover:translate-y-[-1px]"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
						<div class="flex items-start justify-between gap-2">
							<p class="flex-1 text-sm font-medium leading-tight" style="color: var(--app-text);">{c.title}</p>
							<span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border" style="border-color: {statusColor(c.status)}; background: {c.status === 'completed' ? statusColor(c.status) : 'transparent'};">
								{#if c.status === 'completed'}
									<svg viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M3 8l3 3 7-7" /></svg>
								{/if}
							</span>
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
		<div class="fade-up" style="animation-delay: 0.1s;">
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
			<div class="fade-up" style="animation-delay: 0.15s;">
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
