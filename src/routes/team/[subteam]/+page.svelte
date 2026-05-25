<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import StatusDonut from '$lib/components/StatusDonut.svelte';
	import MiniSkillTree from '$lib/components/MiniSkillTree.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';
	let { data, form } = $props();

	let editingNotes = $state(false);
	let notesDraft = $state(data.notes ?? '');
	let entryDraft = $state('');
	let editingEntryId = $state<string | null>(null);
	let entryEditDraft = $state('');

	$effect(() => {
		notesDraft = data.notes ?? '';
	});

	const formatRelative = (iso: string) => {
		const ms = Date.now() - new Date(iso).getTime();
		if (ms < 60_000) return 'just now';
		if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
		if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
		const days = Math.floor(ms / 86_400_000);
		if (days < 7) return `${days}d ago`;
		return new Date(iso).toLocaleDateString();
	};
	const initialsFor = (name?: string | null, email?: string | null) => {
		const source = (name ?? email ?? '?').trim();
		const parts = source.split(/\s+/);
		const a = parts[0]?.[0] ?? '?';
		const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
		return (a + (b ?? '')).toUpperCase();
	};

	const statusLabel = (s: string) =>
		s === 'completed'
			? 'Done'
			: s === 'in_progress'
				? 'In progress'
				: s === 'quiz_pending'
					? 'Quiz pending'
					: s === 'video_pending'
						? 'Video pending'
						: s === 'awaiting_checkoff'
							? 'Awaiting checkoff'
							: s === 'mentor_checkoff_pending'
								? 'Awaiting mentor'
								: s === 'checkoff_needs_review'
									? 'Needs review'
									: s === 'checkoff_blocked'
										? 'Blocked'
										: s === 'available'
											? 'Available'
											: 'Locked';

	const statusColor = (s: string) =>
		s === 'completed'
			? 'var(--app-success)'
			: s === 'in_progress' || s === 'quiz_pending' || s === 'video_pending'
				? 'var(--app-info)'
				: s === 'awaiting_checkoff' || s === 'mentor_checkoff_pending'
					? 'var(--app-warning)'
					: s === 'checkoff_needs_review' || s === 'checkoff_blocked'
						? 'var(--app-danger)'
						: s === 'available'
							? 'var(--app-accent)'
							: 'var(--app-text-dim)';

	const total = $derived((data.courses ?? []).length);
	const inProgress = $derived(
		(data.courses ?? []).filter((c: any) =>
			['in_progress', 'video_pending', 'quiz_pending'].includes(c.status)
		)
	);
</script>

<section class="space-y-6">
	<!-- ═══════════ HEADER ═══════════ -->
	<header class="fade-up flex items-end justify-between">
		<div>
			<p class="eyebrow-label">
				<a href="/team" class="underline" style="color: var(--app-accent);"
					>{data.teamGroup?.name ?? 'Team'}</a
				> · Subteam
			</p>
			<h1 class="text-2xl font-bold tracking-tight">
				<span class="gradient-text"
					>{data.subteamCategory?.name ?? data.subteam?.name ?? 'Subteam'}</span
				>
			</h1>
			{#if !data.userIsOnSubteam}
				<p class="mt-1 text-xs" style="color: var(--app-warning);">
					You're viewing this subteam but not assigned to it.
				</p>
			{/if}
		</div>
		<a
			href={`/courses/map?scope=team:${data.subteam?.id ?? ''}`}
			class="rounded-lg border px-3 py-1.5 text-xs font-semibold"
			style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
			>Open full graph →</a
		>
	</header>

	<!-- ═══════════ DONUT + MINI SKILL MAP ROW ═══════════ -->
	<div class="fade-up grid gap-4 md:grid-cols-[1.6fr_1fr]" style="animation-delay: 0.05s;">
		<!-- Left: donut + legend -->
		<div
			class="flex items-center gap-4 rounded-2xl border p-5 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
		>
			<StatusDonut counts={data.statusCounts} size={130} />
			<div class="flex-1">
				<p class="eyebrow-label">Subteam progress</p>
				<div class="flex items-baseline gap-2">
					<span class="text-4xl font-bold tracking-tight" style="color: var(--app-text);"
						>{data.statusCounts.done}</span
					>
					<span class="text-sm" style="color: var(--app-text-muted);">of {total} done</span>
				</div>
				<p class="text-xs" style="color: var(--app-text-dim);">
					+{data.recentCompletions} this week
				</p>
				<ul class="mt-3 space-y-1 text-xs" style="color: var(--app-text-muted);">
					<li>
						<span
							class="mr-2 inline-block h-2 w-2 rounded-full"
							style="background: var(--app-success);"
						></span><strong>{data.statusCounts.done}</strong> done
					</li>
					<li>
						<span
							class="mr-2 inline-block h-2 w-2 rounded-full"
							style="background: var(--app-info);"
						></span><strong>{data.statusCounts.current}</strong> in progress
					</li>
					<li>
						<span
							class="mr-2 inline-block h-2 w-2 rounded-full"
							style="background: var(--app-warning);"
						></span><strong>{data.statusCounts.awaiting}</strong> awaiting mentor
					</li>
					<li>
						<span
							class="mr-2 inline-block h-2 w-2 rounded-full"
							style="background: var(--app-danger);"
						></span><strong>{data.statusCounts.blocked}</strong> blocked
					</li>
					<li>
						<span
							class="mr-2 inline-block h-2 w-2 rounded-full"
							style="background: var(--app-text-dim, var(--app-text-muted));"
						></span><strong>{data.statusCounts.locked}</strong> locked
					</li>
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
			<p class="text-xs tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
				Coursework
			</p>
		</div>

		{#if inProgress.length > 0}
			<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
				{#each inProgress as c (c.id)}
					<a
						href={`/learn/${c.slug}`}
						class="group flex w-48 shrink-0 flex-col gap-1.5 rounded-xl border p-3 transition-all hover:scale-[1.02]"
						style="background: linear-gradient(135deg, color-mix(in srgb, var(--app-info) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-info) 35%, var(--app-glass-border));"
					>
						<span
							class="inline-block w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
							style="background: color-mix(in srgb, var(--app-info) 18%, transparent); color: var(--app-info);"
							>{statusLabel(c.status)}</span
						>
						<p class="text-sm leading-tight font-semibold" style="color: var(--app-text);">
							{c.title}
						</p>
						<p class="mt-auto text-[10px] font-medium" style="color: var(--app-accent);">
							Continue →
						</p>
					</a>
				{/each}
			</div>
		{/if}

		<div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
			{#each data.courses as c (c.id)}
				{@const tone =
					c.status === 'completed'
						? 'done'
						: ['mentor_checkoff_pending', 'awaiting_checkoff'].includes(c.status)
							? 'awaiting'
							: ['checkoff_needs_review', 'checkoff_blocked'].includes(c.status)
								? 'blocked'
								: ['in_progress', 'video_pending', 'quiz_pending'].includes(c.status)
									? 'current'
									: c.status === 'available'
										? 'avail'
										: 'locked'}
				<a
					href={`/learn/${c.slug}`}
					class="block rounded-xl border p-3 transition-all hover:translate-y-[-1px]"
					style={tone === 'done'
						? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-success) 10%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-success) 35%, var(--app-glass-border));'
						: tone === 'current'
							? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-info) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-info) 40%, var(--app-glass-border));'
							: tone === 'awaiting'
								? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-warning) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-warning) 40%, var(--app-glass-border));'
								: tone === 'blocked'
									? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-danger) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-danger) 40%, var(--app-glass-border));'
									: tone === 'avail'
										? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 10%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-glass-border));'
										: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); opacity: .65;'}
				>
					<div class="flex items-start justify-between gap-2">
						<div class="flex min-w-0 flex-1 items-center gap-2">
							<div
								class="grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold"
								style={tone === 'done'
									? 'background: var(--app-success); color: var(--app-bg);'
									: tone === 'current'
										? 'background: var(--app-info); color: var(--app-bg);'
										: tone === 'awaiting'
											? 'background: var(--app-warning); color: var(--app-bg);'
											: tone === 'blocked'
												? 'background: var(--app-danger); color: var(--app-bg);'
												: tone === 'avail'
													? 'background: color-mix(in srgb, var(--app-accent) 30%, transparent); color: var(--app-accent);'
													: 'background: var(--app-glass-bg); color: var(--app-text-muted); border: 1px solid var(--app-glass-border);'}
							>
								{#if tone === 'done'}✓{:else if tone === 'awaiting'}!{:else if tone === 'blocked'}!{:else if tone === 'current'}·{:else if tone === 'avail'}→{:else}·{/if}
							</div>
							<p class="text-sm leading-tight font-medium" style="color: var(--app-text);">
								{c.title}
							</p>
						</div>
						<ProficiencyBadge level={c.proficiency_level} code={c.code} size="xs" />
					</div>
					<p
						class="mt-1.5 text-[10px] font-medium tracking-wider uppercase"
						style="color: {statusColor(c.status)};"
					>
						{statusLabel(c.status)}
					</p>
				</a>
			{/each}
		</div>
		{#if total === 0}
			<GlassCard
				><p class="text-sm" style="color: var(--app-text-muted);">
					No courses tied to this subteam yet.
				</p></GlassCard
			>
		{/if}
	</div>

	<!-- ═══════════ NOTES ═══════════ -->
	<div class="fade-up" style="animation-delay: 0.15s;">
		<div class="flex items-end justify-between">
			<div>
				<p class="text-xs tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
					Subteam Notes
				</p>
				<p class="text-xs" style="color: var(--app-text-dim);">
					{data.canEditNotes ? 'Editable by subteam leads' : 'Posted by subteam leads'}
				</p>
			</div>
			{#if data.canEditNotes && !editingNotes}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => {
						editingNotes = true;
						notesDraft = data.notes ?? '';
					}}>Edit</Button
				>
			{/if}
		</div>
		<div
			class="mt-2 rounded-2xl border p-4"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
		>
			{#if editingNotes}
				<form method="POST" action="?/saveNotes" class="space-y-2">
					<input type="hidden" name="team_group_id" value={data.teamGroup?.id} />
					<textarea
						name="body"
						bind:value={notesDraft}
						rows="8"
						placeholder="Notes for this subteam — links, meeting times, tooling, anything subteam members should see."
						class="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
						style="border-color: var(--app-glass-border); color: var(--app-input-text);"
					></textarea>
					<div class="flex items-center gap-2">
						<Button variant="primary" size="sm" type="submit">Save</Button>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								editingNotes = false;
								notesDraft = data.notes ?? '';
							}}>Cancel</Button
						>
					</div>
				</form>
			{:else if data.notes}
				<p class="text-sm whitespace-pre-wrap" style="color: var(--app-text);">{data.notes}</p>
			{:else}
				<p class="text-sm italic" style="color: var(--app-text-dim);">No notes yet.</p>
			{/if}
		</div>
	</div>

	<!-- ═══════════ NOTES TIMELINE ═══════════ -->
	<div class="fade-up" style="animation-delay: 0.18s;">
		<div>
			<p class="text-xs tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
				Timeline
			</p>
			<p class="text-xs" style="color: var(--app-text-dim);">
				A chronological record of subteam updates.
			</p>
		</div>

		{#if data.canPostNotesEntry}
			<form
				method="POST"
				action="?/postNotesEntry"
				class="mt-2 rounded-2xl border p-3"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<input type="hidden" name="team_group_id" value={data.teamGroup?.id} />
				<textarea
					name="body"
					bind:value={entryDraft}
					rows="2"
					placeholder="Post an update — what happened today, decisions, blockers, links."
					class="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
					style="border-color: var(--app-glass-border); color: var(--app-input-text);"
				></textarea>
				<div class="mt-2 flex items-center justify-end gap-2">
					<Button variant="primary" size="sm" type="submit" disabled={!entryDraft.trim()}
						>Post</Button
					>
				</div>
			</form>
		{/if}

		<ul class="mt-3 space-y-3">
			{#each data.notesEntries ?? [] as entry (entry.id)}
				<li
					class="rounded-2xl border p-3"
					style="background: color-mix(in srgb, var(--app-glass-bg) 70%, transparent); border-color: var(--app-glass-border);"
				>
					<div class="flex items-start gap-3">
						<div
							class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
							style="background: color-mix(in srgb, var(--app-accent) 22%, transparent); color: var(--app-text);"
							aria-hidden="true"
						>
							{initialsFor(entry.author?.full_name, entry.author?.email)}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
								<span class="text-sm font-medium" style="color: var(--app-text);">
									{entry.author?.full_name || entry.author?.email || 'Unknown'}
								</span>
								<span class="text-[11px]" style="color: var(--app-text-dim);">
									{formatRelative(entry.created_at)}{entry.edited_at ? ' · edited' : ''}
								</span>
							</div>
							{#if editingEntryId === entry.id}
								<form method="POST" action="?/editNotesEntry" class="mt-2 space-y-2">
									<input type="hidden" name="entry_id" value={entry.id} />
									<textarea
										name="body"
										bind:value={entryEditDraft}
										rows="3"
										class="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
										style="border-color: var(--app-glass-border); color: var(--app-input-text);"
									></textarea>
									<div class="flex items-center gap-2">
										<Button variant="primary" size="sm" type="submit">Save</Button>
										<Button
											variant="ghost"
											size="sm"
											onclick={() => {
												editingEntryId = null;
												entryEditDraft = '';
											}}
										>
											Cancel
										</Button>
									</div>
								</form>
							{:else}
								<p class="mt-1 text-sm whitespace-pre-wrap" style="color: var(--app-text);">
									{entry.body}
								</p>
								{#if entry.can_edit}
									<div class="mt-1.5 flex items-center gap-3 text-[11px]">
										<button
											type="button"
											class="underline"
											style="color: var(--app-text-muted);"
											onclick={() => {
												editingEntryId = entry.id;
												entryEditDraft = entry.body;
											}}
										>
											Edit
										</button>
										<form method="POST" action="?/deleteNotesEntry">
											<input type="hidden" name="entry_id" value={entry.id} />
											<button type="submit" class="underline" style="color: var(--app-danger);">
												Delete
											</button>
										</form>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				</li>
			{:else}
				<li
					class="rounded-2xl border p-3 text-sm italic"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-dim);"
				>
					No timeline posts yet.
				</li>
			{/each}
		</ul>
	</div>

	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}

	<!-- ═══════════ ROSTER ═══════════ -->
	{#if data.canViewRoster && data.roster && data.roster.length > 0}
		<div class="fade-up" style="animation-delay: 0.2s;">
			<div>
				<p class="text-xs tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
					Subteam Roster
				</p>
				<p class="text-xs" style="color: var(--app-text-dim);">
					{data.roster.length} member{data.roster.length !== 1 ? 's' : ''}
				</p>
			</div>
			<div
				class="mt-2 overflow-hidden rounded-2xl border"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<table class="w-full text-sm">
					<thead style="background: var(--app-table-header-bg);">
						<tr>
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Member</th
							>
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Level</th
							>
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Roles</th
							>
						</tr>
					</thead>
					<tbody>
						{#each data.roster as m (m.id)}
							<tr
								class="border-t"
								style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
							>
								<td class="px-4 py-2.5">
									<p class="text-sm font-medium" style="color: var(--app-text);">
										{m.full_name || m.email}
									</p>
									<p class="text-[11px]" style="color: var(--app-text-dim);">{m.email}</p>
								</td>
								<td class="px-4 py-2.5">
									<ProficiencyBadge level={m.proficiency_level} size="xs" />
								</td>
								<td class="px-4 py-2.5">
									<div class="flex flex-wrap gap-1">
										{#if m.role === 'admin' || m.base_role === 'admin'}<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);"
												>admin</span
											>{/if}
										{#if m.is_mentor}<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);"
												>mentor</span
											>{/if}
										{#if m.is_lead}<span
												class="rounded-full px-2 py-0.5 text-[10px]"
												style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);"
												>lead</span
											>{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>
