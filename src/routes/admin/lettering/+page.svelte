<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();

	const gi = 'w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm';
	const gs =
		'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);';

	const predefinedCategories = [
		{ value: 'outreach_hours', label: 'Outreach Hours' },
		{ value: 'competition_hours', label: 'Competition Hours' },
		{ value: 'parent_volunteer_hours', label: 'Parent Volunteer Hours' },
		{ value: 'shop_hours', label: 'Shop Hours' }
	];

	let customCategory = $state('');
	let useCustomCategory = $state(false);

	const compTypes = ['regional', 'district', 'worlds', 'offseason', 'scrimmage', 'other'];

	const formatDate = (d: string | null) =>
		d ? new Date(d + 'T00:00:00').toLocaleDateString() : '—';
</script>

<section class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Lettering Management</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Manage lettering seasons, requirements, outreach events, and competitions.
		</p>
	</div>

	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{/if}
	{#if form?.ok}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Action completed successfully.
		</p>
	{/if}

	<!-- Seasons Section -->
	<GlassCard
		title="Seasons"
		subtitle="Create and manage lettering seasons. Only one season can be active at a time."
	>
		{#if data.seasons.length > 0}
			<div class="mb-4 space-y-2">
				{#each data.seasons as season (season.id)}
					<div
						class="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
						style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
					>
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium" style="color: var(--app-text);">{season.label}</span
							>
							{#if season.is_active}
								<span
									class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
									style="background: color-mix(in srgb, var(--app-success) 20%, transparent); color: var(--app-success);"
									>Active</span
								>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs" style="color: var(--app-text-muted);"
								>{formatDate(season.start_date)} – {formatDate(season.end_date)}</span
							>
							<form method="POST" action="?/toggleSeasonActive">
								<input type="hidden" name="season_id" value={season.id} />
								<input type="hidden" name="activate" value={season.is_active ? 'false' : 'true'} />
								<Button variant={season.is_active ? 'ghost' : 'primary'} size="sm" type="submit">
									{season.is_active ? 'Deactivate' : 'Activate'}
								</Button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="mb-4 text-sm" style="color: var(--app-text-muted);">No seasons created yet.</p>
		{/if}

		<form
			method="POST"
			action="?/createSeason"
			class="space-y-3 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">New Season</p>
			<div class="grid gap-3 md:grid-cols-3">
				<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
					Label
					<input class={gi} style={gs} name="label" required placeholder="e.g. 2025-2026" />
				</label>
				<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
					Start Date
					<input class={gi} style={gs} name="start_date" type="date" required />
				</label>
				<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
					End Date
					<input class={gi} style={gs} name="end_date" type="date" required />
				</label>
			</div>
			<div class="flex items-center justify-between">
				<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);">
					<input type="checkbox" name="is_active" />
					Set as active season
				</label>
				<Button variant="primary" size="sm" type="submit">Create Season</Button>
			</div>
		</form>
	</GlassCard>

	<!-- Requirements Section (Active Season) -->
	{#if data.activeSeasonId}
		<GlassCard
			title="Lettering Requirements"
			subtitle="Define the requirements for the active season."
		>
			{#if data.requirements.length > 0}
				<div class="mb-4 overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr style="border-bottom: 1px solid var(--app-glass-border);">
								<th
									class="px-3 py-2 text-left text-xs font-semibold"
									style="color: var(--app-text-muted);">Category</th
								>
								<th
									class="px-3 py-2 text-left text-xs font-semibold"
									style="color: var(--app-text-muted);">Label</th
								>
								<th
									class="px-3 py-2 text-right text-xs font-semibold"
									style="color: var(--app-text-muted);">Required Value</th
								>
								<th
									class="px-3 py-2 text-right text-xs font-semibold"
									style="color: var(--app-text-muted);">Order</th
								>
								<th
									class="px-3 py-2 text-right text-xs font-semibold"
									style="color: var(--app-text-muted);">Action</th
								>
							</tr>
						</thead>
						<tbody>
							{#each data.requirements as req (req.id)}
								<tr style="border-bottom: 1px solid var(--app-glass-border);">
									<td class="px-3 py-2" style="color: var(--app-text);">{req.category}</td>
									<td class="px-3 py-2" style="color: var(--app-text);">{req.label}</td>
									<td class="px-3 py-2 text-right" style="color: var(--app-text);"
										>{req.required_value}</td
									>
									<td class="px-3 py-2 text-right" style="color: var(--app-text-muted);"
										>{req.sort_order}</td
									>
									<td class="px-3 py-2 text-right">
										<form method="POST" action="?/deleteRequirement" class="inline">
											<input type="hidden" name="id" value={req.id} />
											<Button variant="danger" size="sm" type="submit">Delete</Button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="mb-4 text-sm" style="color: var(--app-text-muted);">
					No requirements defined for this season.
				</p>
			{/if}

			<form
				method="POST"
				action="?/upsertRequirement"
				class="space-y-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="text-sm font-semibold" style="color: var(--app-text);">
					Add / Update Requirement
				</p>
				<input type="hidden" name="season_id" value={data.activeSeasonId} />
				<div class="grid gap-3 md:grid-cols-2">
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Category
						{#if useCustomCategory}
							<input
								class={gi}
								style={gs}
								name="category"
								required
								bind:value={customCategory}
								placeholder="e.g. fundraising_hours"
							/>
						{:else}
							<select class={gi} style={gs} name="category" required>
								{#each predefinedCategories as cat}
									<option value={cat.value}>{cat.label}</option>
								{/each}
							</select>
						{/if}
						<label
							class="mt-1 inline-flex items-center gap-1.5 text-[11px]"
							style="color: var(--app-text-muted);"
						>
							<input type="checkbox" bind:checked={useCustomCategory} />
							Use custom category
						</label>
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Label
						<input class={gi} style={gs} name="label" required placeholder="Display name" />
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Required Value
						<input
							class={gi}
							style={gs}
							name="required_value"
							type="number"
							min="0"
							step="any"
							required
							placeholder="0"
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Sort Order
						<input class={gi} style={gs} name="sort_order" type="number" min="0" value="0" />
					</label>
				</div>
				<div class="flex justify-end">
					<Button variant="primary" size="sm" type="submit">Save Requirement</Button>
				</div>
			</form>
		</GlassCard>

		<!-- Outreach Events Section -->
		<GlassCard title="Outreach Events" subtitle="Manage outreach events for the active season.">
			{#if data.outreachEvents.length > 0}
				<div class="mb-4 space-y-2">
					{#each data.outreachEvents as evt (evt.id)}
						<div
							class="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
							style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
						>
							<div class="space-y-0.5">
								<p class="text-sm font-medium" style="color: var(--app-text);">{evt.title}</p>
								<p class="text-xs" style="color: var(--app-text-muted);">
									{formatDate(evt.event_date)}
									{#if evt.start_time}&nbsp;{evt.start_time}{/if}{#if evt.end_time}–{evt.end_time}{/if}
									{#if evt.location}&nbsp;&middot; {evt.location}{/if}
								</p>
								{#if evt.description}
									<p class="text-xs" style="color: var(--app-text-muted);">{evt.description}</p>
								{/if}
								{#if evt.max_signups}
									<p class="text-[11px]" style="color: var(--app-text-muted);">
										Max signups: {evt.max_signups}
									</p>
								{/if}
								{#if evt.signup_deadline}
									<p class="text-[11px]" style="color: var(--app-text-muted);">
										Signup deadline: {formatDate(evt.signup_deadline)}
									</p>
								{/if}
							</div>
							<form method="POST" action="?/deleteOutreachEvent">
								<input type="hidden" name="id" value={evt.id} />
								<Button variant="danger" size="sm" type="submit">Delete</Button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-4 text-sm" style="color: var(--app-text-muted);">
					No outreach events for this season.
				</p>
			{/if}

			<form
				method="POST"
				action="?/createOutreachEvent"
				class="space-y-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="text-sm font-semibold" style="color: var(--app-text);">New Outreach Event</p>
				<input type="hidden" name="season_id" value={data.activeSeasonId} />
				<div class="grid gap-3 md:grid-cols-2">
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Title
						<input class={gi} style={gs} name="title" required placeholder="Event title" />
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Location
						<input class={gi} style={gs} name="location" placeholder="Location" />
					</label>
					<label class="flex flex-col gap-1 text-xs md:col-span-2" style="color: var(--app-text);">
						Description
						<textarea
							class={gi}
							style={gs}
							name="description"
							rows="2"
							placeholder="Optional description"
						></textarea>
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Event Date
						<input class={gi} style={gs} name="event_date" type="date" required />
					</label>
					<div class="grid grid-cols-2 gap-3">
						<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
							Start Time
							<input class={gi} style={gs} name="start_time" type="time" />
						</label>
						<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
							End Time
							<input class={gi} style={gs} name="end_time" type="time" />
						</label>
					</div>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Max Signups
						<input
							class={gi}
							style={gs}
							name="max_signups"
							type="number"
							min="0"
							placeholder="Unlimited"
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Signup Deadline
						<input class={gi} style={gs} name="signup_deadline" type="date" />
					</label>
				</div>
				<div class="flex justify-end">
					<Button variant="primary" size="sm" type="submit">Create Event</Button>
				</div>
			</form>
		</GlassCard>

		<!-- Competitions Section -->
		<GlassCard title="Competitions" subtitle="Manage competition events for the active season.">
			{#if data.competitions.length > 0}
				<div class="mb-4 space-y-2">
					{#each data.competitions as comp (comp.id)}
						<div
							class="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2"
							style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
						>
							<div class="space-y-0.5">
								<div class="flex items-center gap-2">
									<p class="text-sm font-medium" style="color: var(--app-text);">{comp.name}</p>
									<span
										class="rounded-full px-2 py-0.5 text-[11px]"
										style="background: color-mix(in srgb, var(--app-accent) 20%, transparent); color: var(--app-accent);"
										>{comp.comp_type}</span
									>
								</div>
								<p class="text-xs" style="color: var(--app-text-muted);">
									{formatDate(comp.start_date)}{#if comp.end_date}
										– {formatDate(comp.end_date)}{/if}
									{#if comp.location}&nbsp;&middot; {comp.location}{/if}
								</p>
							</div>
							<form method="POST" action="?/deleteCompetition">
								<input type="hidden" name="id" value={comp.id} />
								<Button variant="danger" size="sm" type="submit">Delete</Button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="mb-4 text-sm" style="color: var(--app-text-muted);">
					No competitions for this season.
				</p>
			{/if}

			<form
				method="POST"
				action="?/createCompetition"
				class="space-y-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="text-sm font-semibold" style="color: var(--app-text);">New Competition</p>
				<input type="hidden" name="season_id" value={data.activeSeasonId} />
				<div class="grid gap-3 md:grid-cols-2">
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Name
						<input class={gi} style={gs} name="name" required placeholder="Competition name" />
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Location
						<input class={gi} style={gs} name="location" placeholder="Location" />
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Start Date
						<input class={gi} style={gs} name="start_date" type="date" required />
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						End Date
						<input class={gi} style={gs} name="end_date" type="date" />
					</label>
					<label class="flex flex-col gap-1 text-xs" style="color: var(--app-text);">
						Type
						<select class={gi} style={gs} name="comp_type">
							{#each compTypes as ct}
								<option value={ct}>{ct}</option>
							{/each}
						</select>
					</label>
				</div>
				<div class="flex justify-end">
					<Button variant="primary" size="sm" type="submit">Create Competition</Button>
				</div>
			</form>
		</GlassCard>
	{:else}
		<GlassCard title="Requirements, Events & Competitions">
			<p class="text-sm" style="color: var(--app-text-muted);">
				Activate a season above to manage its requirements, outreach events, and competitions.
			</p>
		</GlassCard>
	{/if}
</section>
