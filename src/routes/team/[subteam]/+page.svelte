<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import StatusDonut from '$lib/components/StatusDonut.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';
	let { data, form } = $props();

	type Resource = {
		id: string;
		team_id: string;
		title: string;
		url: string;
		description: string;
		image_url: string | null;
		position: number;
	};
	const resources = $derived((data.resources ?? []) as Resource[]);
	const teamAccent = $derived(String((data as any).teamGroup?.color_hex ?? '#475569'));

	let showAddResource = $state(false);
	let editingResourceId = $state<string | null>(null);

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
	<header class="fade-up">
		<p class="eyebrow-label">
			{data.teamGroup?.name ?? 'Team'} · Subteam
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
	</header>

	<!-- ═══════════ COURSES + FLOATING DONUT ═══════════
	     Donut floats top-right (where "Open full graph" used to be); the
	     course grid uses `grid-auto-flow: dense` so cards fill in to the left
	     of the donut on row 1, then flow full-width below as overflow. -->
	<div class="fade-up space-y-3" style="animation-delay: 0.05s;">
		<p class="text-xs tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
			Coursework
		</p>

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

		<div class="cw-grid">
			<!-- Floating progress donut: pinned to row 1 col -1 (top-right). With
			     grid-auto-flow: dense, the other course cards backfill into
			     row 1 cols 1..-2 first and then flow into rows 2+ full-width. -->
			<div class="cw-donut">
				<StatusDonut counts={data.statusCounts} size={96} />
			</div>

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

	<!-- ═══════════ PINBOARD ═══════════ -->
	<div class="fade-up" style="animation-delay: 0.15s;">
		<div class="flex items-end justify-between gap-3">
			<div>
				<p class="text-xs tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
					Resources
				</p>
				<p class="text-xs" style="color: var(--app-text-dim);">
					{data.canManageResources
						? 'Pin links the subteam needs — CAD files, strategy docs, trackers.'
						: 'Links curated by subteam leads.'}
				</p>
			</div>
			{#if data.canManageResources && data.userTeamId}
				<Button variant="primary" size="sm" onclick={() => (showAddResource = !showAddResource)}>
					{showAddResource ? 'Cancel' : '+ Add resource'}
				</Button>
			{/if}
		</div>

		{#if showAddResource && data.canManageResources && data.userTeamId}
			<form
				method="POST"
				action="?/createResource"
				class="mt-3 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<input type="hidden" name="team_id" value={data.userTeamId} />
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-1">
					<span class="eyebrow-label">Title</span>
					<input
						class="rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="title"
						required
						placeholder="Robot V1 OnShape"
					/>
				</label>
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-1">
					<span class="eyebrow-label">URL</span>
					<input
						class="mono rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="url"
						type="text"
						required
						placeholder="test.com or https://example.com"
					/>
				</label>
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
					<span class="eyebrow-label"
						>Description <span class="text-xs" style="color: var(--app-text-dim);">(optional)</span
						></span
					>
					<textarea
						class="rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="description"
						rows="2"
						placeholder="What this is for."
					></textarea>
				</label>
				<label class="flex flex-col gap-1.5 text-sm sm:col-span-2">
					<span class="eyebrow-label"
						>Image URL <span class="text-xs" style="color: var(--app-text-dim);">(optional)</span
						></span
					>
					<input
						class="mono rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="image_url"
						type="text"
						placeholder="test.com/cover.png or https://…"
					/>
				</label>
				<div class="flex justify-end sm:col-span-2">
					<Button variant="primary" type="submit" size="sm">Pin to board</Button>
				</div>
			</form>
		{/if}

		{#if resources.length === 0}
			<GlassCard>
				<p class="text-sm" style="color: var(--app-text-muted);">
					Nothing pinned here yet.{data.canManageResources
						? ' Use “Add resource” to drop a link in.'
						: ''}
				</p>
			</GlassCard>
		{:else}
			<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each resources as r (r.id)}
					{#if editingResourceId === r.id}
						<form
							method="POST"
							action="?/updateResource"
							class="space-y-2 rounded-2xl border p-3 sm:col-span-2 lg:col-span-3"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
						>
							<input type="hidden" name="id" value={r.id} />
							<div class="grid gap-2 sm:grid-cols-2">
								<input
									class="rounded-xl border px-3 py-2 text-sm"
									style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
									name="title"
									value={r.title}
									required
								/>
								<input
									class="mono rounded-xl border px-3 py-2 text-sm"
									style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
									name="url"
									type="text"
									value={r.url}
									required
								/>
							</div>
							<textarea
								class="w-full rounded-xl border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="description"
								rows="2">{r.description}</textarea
							>
							<input
								class="mono w-full rounded-xl border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="image_url"
								type="text"
								value={r.image_url ?? ''}
								placeholder="Image URL (optional)"
							/>
							<div class="flex justify-end gap-2">
								<Button variant="ghost" size="sm" onclick={() => (editingResourceId = null)}
									>Cancel</Button
								>
								<Button variant="primary" type="submit" size="sm">Save</Button>
							</div>
						</form>
					{:else}
						<div
							class="group relative flex flex-col overflow-hidden rounded-2xl border transition duration-150 hover:-translate-y-0.5"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
						>
							<a href={r.url} target="_blank" rel="noopener noreferrer" class="block">
								<div
									class="aspect-[16/9] w-full"
									style={r.image_url
										? `background-image: url(${r.image_url}); background-size: cover; background-position: center;`
										: `background: linear-gradient(135deg, color-mix(in srgb, ${teamAccent} 40%, transparent), color-mix(in srgb, ${teamAccent} 12%, transparent));`}
								>
									{#if !r.image_url}
										<div class="flex h-full items-center justify-center px-4 text-center">
											<span
												class="text-sm font-bold tracking-tight"
												style="color: color-mix(in srgb, {teamAccent} 70%, white); text-shadow: 0 2px 12px color-mix(in srgb, {teamAccent} 35%, transparent);"
											>
												{r.title}
											</span>
										</div>
									{/if}
								</div>
								<div class="p-3">
									<p class="text-sm font-semibold" style="color: var(--app-text);">
										{r.title}
									</p>
									{#if r.description}
										<p class="mt-1 line-clamp-2 text-xs" style="color: var(--app-text-muted);">
											{r.description}
										</p>
									{/if}
									<p class="mono mt-1.5 truncate text-[10px]" style="color: var(--app-text-dim);">
										{r.url.replace(/^https?:\/\//, '')}
									</p>
								</div>
							</a>
							{#if data.canManageResources}
								<div
									class="flex items-center justify-end gap-1.5 border-t px-3 py-1.5"
									style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);"
								>
									<button
										type="button"
										class="text-[11px]"
										style="color: var(--app-text-muted);"
										onclick={() => (editingResourceId = r.id)}
									>
										Edit
									</button>
									<form
										method="POST"
										action="?/deleteResource"
										onsubmit={(e) => {
											if (!confirm('Remove this resource?')) e.preventDefault();
										}}
									>
										<input type="hidden" name="id" value={r.id} />
										<button type="submit" class="text-[11px]" style="color: var(--app-danger);">
											Remove
										</button>
									</form>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
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

<style>
	/* Course grid with a floating progress donut anchored in the top-right.
	   grid-auto-flow: dense lets later cards backfill earlier empty cells,
	   so courses pack into row 1 to the left of the donut and then flow
	   full-width below it once row 1 is full. */
	.cw-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.5rem;
		grid-auto-flow: dense;
	}
	.cw-donut {
		grid-column: -2 / -1;
		grid-row: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: 1px solid var(--app-glass-border);
		border-radius: 1rem;
		background: var(--app-glass-bg);
	}
	@media (max-width: 640px) {
		.cw-donut {
			grid-column: 1 / -1;
			grid-row: auto;
		}
	}
</style>
