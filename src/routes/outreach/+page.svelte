<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	let { data, form } = $props();

	const mySignupSet = $derived(new Set(data.mySignups ?? []));

	const now = new Date();

	const isPastDeadline = (event: any) => {
		if (!event.signup_deadline) return false;
		return new Date(event.signup_deadline) < now;
	};

	const isFull = (event: any) => {
		if (!event.max_signups) return false;
		return event.signup_count >= event.max_signups;
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	};

	const formatTime = (timeStr: string | null) => {
		if (!timeStr) return '';
		const [h, m] = timeStr.split(':').map(Number);
		const period = h >= 12 ? 'PM' : 'AM';
		const hour = h % 12 || 12;
		return `${hour}:${String(m).padStart(2, '0')} ${period}`;
	};

	const statusColor = (status: string) => {
		if (status === 'verified') return 'var(--app-success)';
		if (status === 'rejected') return 'var(--app-danger)';
		return 'var(--app-warning)';
	};

	const statusLabel = (status: string) => {
		if (status === 'verified') return 'Verified';
		if (status === 'rejected') return 'Rejected';
		return 'Pending';
	};

	const upcomingEvents = $derived(
		(data.events ?? []).filter((e: any) => new Date(e.event_date + 'T23:59:59') >= now)
	);

	const pastEvents = $derived(
		(data.events ?? []).filter((e: any) => new Date(e.event_date + 'T23:59:59') < now)
	);

	const totalHours = $derived(
		(data.myHours ?? []).reduce((sum: number, h: any) => {
			if (h.verification_status === 'verified') return sum + Number(h.hours);
			return sum;
		}, 0)
	);

	const pendingHours = $derived(
		(data.myHours ?? []).reduce((sum: number, h: any) => {
			if (h.verification_status === 'pending') return sum + Number(h.hours);
			return sum;
		}, 0)
	);
</script>

<section class="space-y-6">
	<div class="fade-up">
		<a href="/dashboard" class="text-xs" style="color: var(--app-text-muted);">← Dashboard</a>
		<p class="eyebrow-label" style="margin-bottom: 4px; margin-top: 4px;">Community</p>
		<PageHeader
			title="Outreach"
			description={data.season ? data.season.label : 'Browse outreach events, sign up, and log your hours.'}
		/>
	</div>

	{#if !data.season}
		<p class="rounded border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">
			No active lettering season.
		</p>
	{:else}
		{#if form?.error}
			<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
		{:else if form?.ok}
			<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
		{/if}

		<!-- Hours Summary -->
		<div class="fade-up grid gap-3 sm:grid-cols-2" style="animation-delay: 0.05s;">
			<GlassCard compact>
				<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Verified Hours</p>
				<p class="mt-1 text-2xl font-bold" style="color: var(--app-success);">{totalHours}</p>
			</GlassCard>
			<GlassCard compact>
				<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Pending Hours</p>
				<p class="mt-1 text-2xl font-bold" style="color: var(--app-warning);">{pendingHours}</p>
			</GlassCard>
		</div>

		<!-- Upcoming Events -->
		<div class="fade-up space-y-3" style="animation-delay: 0.1s;">
			<p class="eyebrow-label">Events</p>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Upcoming Events</h2>
			{#if upcomingEvents.length === 0}
				<p class="rounded border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">
					No upcoming events this season.
				</p>
			{:else}
				<div class="grid gap-3 md:grid-cols-2">
					{#each upcomingEvents as event (event.id)}
						<GlassCard hover>
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="font-medium" style="color: var(--app-text);">{event.title}</h3>
									<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
										{formatDate(event.event_date)}
										{#if event.start_time}
											&middot; {formatTime(event.start_time)}{#if event.end_time} - {formatTime(event.end_time)}{/if}
										{/if}
									</p>
									{#if event.location}
										<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">{event.location}</p>
									{/if}
								</div>
								{#if event.max_signups}
									<span
										class="shrink-0 rounded px-2 py-0.5 text-xs"
										style="background: color-mix(in srgb, {isFull(event) ? 'var(--app-warning)' : 'var(--app-success)'} 20%, transparent); color: {isFull(event) ? 'var(--app-warning)' : 'var(--app-success)'};"
									>
										{event.signup_count}/{event.max_signups}
									</span>
								{/if}
							</div>

							{#if event.description}
								<p class="mt-2 text-sm" style="color: var(--app-text-muted);">{event.description}</p>
							{/if}

							{#if event.signup_deadline}
								<p class="mt-2 text-xs" style="color: var(--app-text-muted);">
									Signup deadline: {formatDate(event.signup_deadline)}
								</p>
							{/if}

							<div class="mt-3">
								{#if mySignupSet.has(String(event.id))}
									<div class="flex items-center gap-2">
										<span class="rounded px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 20%, transparent); color: var(--app-success);">
											Signed up
										</span>
										<form method="POST" action="?/cancelSignup">
											<input type="hidden" name="event_id" value={event.id} />
											<Button variant="danger" size="sm" type="submit">Cancel</Button>
										</form>
									</div>
								{:else if isPastDeadline(event)}
									<span class="text-xs" style="color: var(--app-text-muted);">Signup deadline passed</span>
								{:else if isFull(event)}
									<span class="text-xs" style="color: var(--app-warning);">Full</span>
								{:else}
									<form method="POST" action="?/signUp">
										<input type="hidden" name="event_id" value={event.id} />
										<Button variant="primary" size="sm" type="submit">Sign Up</Button>
									</form>
								{/if}
							</div>
						</GlassCard>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Past Events -->
		{#if pastEvents.length > 0}
			<div class="space-y-3">
				<h2 class="text-lg font-semibold" style="color: var(--app-text);">Past Events</h2>
				<div class="grid gap-3 md:grid-cols-2">
					{#each pastEvents as event (event.id)}
						<GlassCard>
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="font-medium" style="color: var(--app-text);">{event.title}</h3>
									<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
										{formatDate(event.event_date)}
										{#if event.location} &middot; {event.location}{/if}
									</p>
								</div>
							</div>
							{#if event.description}
								<p class="mt-2 text-sm" style="color: var(--app-text-muted);">{event.description}</p>
							{/if}
						</GlassCard>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Log Hours -->
		<div class="fade-up space-y-3" style="animation-delay: 0.15s;">
			<p class="eyebrow-label">Tracking</p>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Log Hours</h2>
			<GlassCard>
				<form method="POST" action="?/logHours" class="space-y-3">
					<input type="hidden" name="season_id" value={data.season.id} />

					<div>
						<label for="log-event" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">
							Event (optional)
						</label>
						<select
							id="log-event"
							name="event_id"
							class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						>
							<option value="">-- No specific event --</option>
							{#each data.events ?? [] as event}
								<option value={event.id}>{event.title} ({formatDate(event.event_date)})</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="log-hours" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">
							Hours
						</label>
						<input
							id="log-hours"
							type="number"
							name="hours"
							min="0.5"
							max="100"
							step="0.5"
							required
							class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							placeholder="e.g. 2.5"
						/>
					</div>

					<div>
						<label for="log-description" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">
							Description
						</label>
						<textarea
							id="log-description"
							name="description"
							required
							rows="3"
							class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
							placeholder="Describe what you did..."
						></textarea>
					</div>

					<Button variant="primary" size="sm" type="submit">Log Hours</Button>
				</form>
			</GlassCard>
		</div>

		<!-- My Hours -->
		<div class="fade-up space-y-3" style="animation-delay: 0.2s;">
			<p class="eyebrow-label">History</p>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">My Hours</h2>
			{#if (data.myHours ?? []).length === 0}
				<p class="rounded border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">
					No hours logged yet this season.
				</p>
			{:else}
				<GlassCard>
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead>
								<tr style="color: var(--app-text-muted);">
									<th class="pb-2 pr-3 text-xs font-medium uppercase tracking-wide">Date</th>
									<th class="pb-2 pr-3 text-xs font-medium uppercase tracking-wide">Hours</th>
									<th class="pb-2 pr-3 text-xs font-medium uppercase tracking-wide">Description</th>
									<th class="pb-2 pr-3 text-xs font-medium uppercase tracking-wide">Event</th>
									<th class="pb-2 text-xs font-medium uppercase tracking-wide">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each data.myHours ?? [] as entry (entry.id)}
									<tr class="border-t" style="border-color: var(--app-glass-border);">
										<td class="py-2 pr-3 text-xs" style="color: var(--app-text);">
											{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
										</td>
										<td class="py-2 pr-3 font-medium" style="color: var(--app-text);">
											{entry.hours}
										</td>
										<td class="py-2 pr-3 text-xs" style="color: var(--app-text-muted);">
											{entry.description}
										</td>
										<td class="py-2 pr-3 text-xs" style="color: var(--app-text-muted);">
											{entry.event_title ?? '--'}
										</td>
										<td class="py-2">
											<span
												class="rounded px-2 py-0.5 text-xs font-medium"
												style="background: color-mix(in srgb, {statusColor(entry.verification_status)} 20%, transparent); color: {statusColor(entry.verification_status)};"
											>
												{statusLabel(entry.verification_status)}
											</span>
											{#if entry.verification_status === 'rejected' && entry.rejection_reason}
												<p class="mt-1 text-xs" style="color: var(--app-danger);">{entry.rejection_reason}</p>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</GlassCard>
			{/if}
		</div>
	{/if}
</section>
