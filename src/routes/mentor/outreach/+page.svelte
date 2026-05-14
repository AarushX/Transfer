<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let activeTab = $state<'outreach' | 'parent'>('outreach');
	let rejectingId = $state<string | null>(null);
	let rejectionReason = $state('');

	const eventsMap = $derived(
		new Map((data.outreachEvents ?? []).map((e: any) => [e.id, e.title]))
	);

	const pendingOutreach = $derived((data.outreachHours ?? []).filter((h: any) => h.verification_status === 'pending'));
	const resolvedOutreach = $derived((data.outreachHours ?? []).filter((h: any) => h.verification_status !== 'pending'));
	const pendingParent = $derived((data.parentVolunteerHours ?? []).filter((h: any) => h.verification_status === 'pending'));
	const resolvedParent = $derived((data.parentVolunteerHours ?? []).filter((h: any) => h.verification_status !== 'pending'));

	function startReject(id: string) {
		rejectingId = id;
		rejectionReason = '';
	}
	function cancelReject() {
		rejectingId = null;
		rejectionReason = '';
	}

	const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '';
</script>

<section class="space-y-5">
	<div class="fade-up">
		<a href="/mentor" class="text-xs" style="color: var(--app-text-muted);">&larr; Mentor home</a>
		<p class="eyebrow-label" style="margin-top: 4px; margin-bottom: 2px;">Mentor Panel</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Hours Verification</span></h1>
		{#if data.season}
			<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{data.season.label}</p>
		{/if}
	</div>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Updated successfully.</p>
	{/if}

	{#if !data.season}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">No active season found.</p>
		</GlassCard>
	{:else}
		<!-- Tabs -->
		<div class="flex gap-2">
			<button
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				style={activeTab === 'outreach'
					? 'background: var(--app-accent); color: var(--app-accent-text);'
					: 'background: var(--app-button-secondary-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-button-secondary-border);'}
				onclick={() => (activeTab = 'outreach')}
			>
				Outreach Hours
				{#if pendingOutreach.length > 0}
					<span class="ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold" style="background: var(--app-warning); color: #000;">{pendingOutreach.length}</span>
				{/if}
			</button>
			<button
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				style={activeTab === 'parent'
					? 'background: var(--app-accent); color: var(--app-accent-text);'
					: 'background: var(--app-button-secondary-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-button-secondary-border);'}
				onclick={() => (activeTab = 'parent')}
			>
				Parent Volunteer Hours
				{#if pendingParent.length > 0}
					<span class="ml-1 inline-flex items-center justify-center rounded-full px-1.5 text-xs font-bold" style="background: var(--app-warning); color: #000;">{pendingParent.length}</span>
				{/if}
			</button>
		</div>

		<!-- Outreach Hours Tab -->
		{#if activeTab === 'outreach'}
			{#if pendingOutreach.length === 0 && resolvedOutreach.length === 0}
				<GlassCard>
					<p class="text-sm" style="color: var(--app-text-muted);">No outreach hours submitted this season.</p>
				</GlassCard>
			{/if}

			{#if pendingOutreach.length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Pending Review ({pendingOutreach.length})</h2>
				<div class="space-y-3">
					{#each pendingOutreach as entry (entry.id)}
						<GlassCard>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="flex-1 space-y-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{entry.studentName}</p>
									<p class="text-xs" style="color: var(--app-text-muted);">
										{entry.hours} hour{entry.hours !== 1 ? 's' : ''}
										{#if entry.event_id && eventsMap.get(entry.event_id)}
											&middot; {eventsMap.get(entry.event_id)}
										{/if}
										&middot; {fmtDate(entry.created_at)}
									</p>
									{#if entry.description}
										<p class="text-xs" style="color: var(--app-text);">{entry.description}</p>
									{/if}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">pending</span>
								</div>
								<div class="flex flex-shrink-0 items-center gap-2">
									{#if rejectingId === entry.id}
										<form method="POST" action="?/rejectOutreachHours" class="flex items-center gap-2">
											<input type="hidden" name="hours_id" value={entry.id} />
											<input
												name="rejection_reason"
												bind:value={rejectionReason}
												placeholder="Reason (optional)"
												class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
												style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
											/>
											<Button variant="danger" size="sm" type="submit">Confirm</Button>
											<Button variant="ghost" size="sm" onclick={cancelReject}>Cancel</Button>
										</form>
									{:else}
										<form method="POST" action="?/verifyOutreachHours" class="inline">
											<input type="hidden" name="hours_id" value={entry.id} />
											<Button variant="primary" size="sm" type="submit">Verify</Button>
										</form>
										<Button variant="danger" size="sm" onclick={() => startReject(entry.id)}>Reject</Button>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

			{#if resolvedOutreach.length > 0}
				<h2 class="mt-4 text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Resolved ({resolvedOutreach.length})</h2>
				<div class="space-y-2">
					{#each resolvedOutreach as entry (entry.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="flex-1 space-y-0.5">
									<p class="text-sm font-medium" style="color: var(--app-text);">{entry.studentName}</p>
									<p class="text-xs" style="color: var(--app-text-muted);">
										{entry.hours} hour{entry.hours !== 1 ? 's' : ''}
										{#if entry.event_id && eventsMap.get(entry.event_id)}
											&middot; {eventsMap.get(entry.event_id)}
										{/if}
										&middot; {fmtDate(entry.created_at)}
									</p>
									{#if entry.description}
										<p class="text-xs" style="color: var(--app-text);">{entry.description}</p>
									{/if}
									{#if entry.rejection_reason}
										<p class="text-xs" style="color: var(--app-danger);">Reason: {entry.rejection_reason}</p>
									{/if}
								</div>
								{#if entry.verification_status === 'verified'}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">verified</span>
								{:else}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">rejected</span>
								{/if}
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- Parent Volunteer Hours Tab -->
		{#if activeTab === 'parent'}
			{#if pendingParent.length === 0 && resolvedParent.length === 0}
				<GlassCard>
					<p class="text-sm" style="color: var(--app-text-muted);">No parent volunteer hours submitted this season.</p>
				</GlassCard>
			{/if}

			{#if pendingParent.length > 0}
				<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Pending Review ({pendingParent.length})</h2>
				<div class="space-y-3">
					{#each pendingParent as entry (entry.id)}
						<GlassCard>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div class="flex-1 space-y-1">
									<p class="text-sm font-medium" style="color: var(--app-text);">{entry.parentName}</p>
									<p class="text-xs" style="color: var(--app-text-muted);">
										{entry.hours} hour{entry.hours !== 1 ? 's' : ''}
										&middot; Student: {entry.studentName}
										&middot; {fmtDate(entry.activity_date)}
									</p>
									{#if entry.description}
										<p class="text-xs" style="color: var(--app-text);">{entry.description}</p>
									{/if}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">pending</span>
								</div>
								<div class="flex flex-shrink-0 items-center gap-2">
									{#if rejectingId === entry.id}
										<form method="POST" action="?/rejectParentHours" class="flex items-center gap-2">
											<input type="hidden" name="hours_id" value={entry.id} />
											<input
												name="rejection_reason"
												bind:value={rejectionReason}
												placeholder="Reason (optional)"
												class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
												style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
											/>
											<Button variant="danger" size="sm" type="submit">Confirm</Button>
											<Button variant="ghost" size="sm" onclick={cancelReject}>Cancel</Button>
										</form>
									{:else}
										<form method="POST" action="?/verifyParentHours" class="inline">
											<input type="hidden" name="hours_id" value={entry.id} />
											<Button variant="primary" size="sm" type="submit">Verify</Button>
										</form>
										<Button variant="danger" size="sm" onclick={() => startReject(entry.id)}>Reject</Button>
									{/if}
								</div>
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}

			{#if resolvedParent.length > 0}
				<h2 class="mt-4 text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Resolved ({resolvedParent.length})</h2>
				<div class="space-y-2">
					{#each resolvedParent as entry (entry.id)}
						<GlassCard compact>
							<div class="flex items-center justify-between gap-3">
								<div class="flex-1 space-y-0.5">
									<p class="text-sm font-medium" style="color: var(--app-text);">{entry.parentName}</p>
									<p class="text-xs" style="color: var(--app-text-muted);">
										{entry.hours} hour{entry.hours !== 1 ? 's' : ''}
										&middot; Student: {entry.studentName}
										&middot; {fmtDate(entry.activity_date)}
									</p>
									{#if entry.description}
										<p class="text-xs" style="color: var(--app-text);">{entry.description}</p>
									{/if}
									{#if entry.rejection_reason}
										<p class="text-xs" style="color: var(--app-danger);">Reason: {entry.rejection_reason}</p>
									{/if}
								</div>
								{#if entry.verification_status === 'verified'}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">verified</span>
								{:else}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">rejected</span>
								{/if}
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</section>
