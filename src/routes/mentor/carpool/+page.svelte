<script lang="ts">
	let { data, form } = $props();

	type RoleDraft = { label: string; slots: number; mode: 'slots' | 'capacity'; description: string };
	type DayDraft = { date: string; label: string; notes: string; roles: RoleDraft[] };
	let days = $state<DayDraft[]>([
		{
			date: '',
			label: 'Competition Day 1',
			notes: '',
			roles: [
				{ label: 'Take There', slots: 2, mode: 'slots', description: 'Volunteer driver to take students to venue.' },
				{ label: 'Bring Back', slots: 2, mode: 'slots', description: 'Volunteer driver to bring students home.' },
				{ label: 'Chaperone', slots: 2, mode: 'slots', description: 'Adult chaperone for event supervision.' }
			]
		}
	]);
	const daysJson = $derived(JSON.stringify(days));
	const addDay = () => {
		days = [
			...days,
			{
				date: '',
				label: `Day ${days.length + 1}`,
				notes: '',
				roles: [{ label: 'Take There', slots: 1, mode: 'slots', description: '' }]
			}
		];
	};
	const addRole = (dayIndex: number) => {
		days[dayIndex].roles = [
			...days[dayIndex].roles,
			{ label: '', slots: 1, mode: 'slots', description: '' }
		];
	};
	const removeRole = (dayIndex: number, roleIndex: number) => {
		days[dayIndex].roles = days[dayIndex].roles.filter((_, idx) => idx !== roleIndex);
	};
	let showTemplatePanel = $state(false);
	let selectedTemplateId = $state((data.templates?.[0]?.id as string | undefined) ?? '');
	let templateTitle = $state('');
	let selectedRoleId = $state<string | null>(null);
	let showSaveExistingTemplatePanel = $state(false);
	let templateFromEventId = $state((data.events?.[0]?.id as string | undefined) ?? '');
	let existingTemplateName = $state('');
	const selectedTemplate = $derived((data.templates ?? []).find((t: any) => t.id === selectedTemplateId) ?? null);
	const signupsForRole = (roleId: string) => (data.signups ?? []).filter((s: any) => s.role_id === roleId);
	const roleStats = (role: any) => {
		const signups = signupsForRole(String(role.id));
		const used =
			role.signup_mode === 'capacity'
				? signups.reduce((sum: number, row: any) => sum + Math.max(1, Number(row.capacity_count ?? 1) || 1), 0)
				: signups.length;
		const total = Math.max(1, Number(role.slot_count ?? 1) || 1);
		return { used, total, remaining: Math.max(0, total - used), signups };
	};
	const selectedRole = $derived((data.roles ?? []).find((r: any) => r.id === selectedRoleId) ?? null);
	const selectedRoleDay = $derived(
		selectedRole ? (data.days ?? []).find((d: any) => d.id === selectedRole.day_id) ?? null : null
	);
	const selectedRoleEvent = $derived(
		selectedRoleDay ? (data.events ?? []).find((e: any) => e.id === selectedRoleDay.event_id) ?? null : null
	);
	const selectedRoleStats = $derived(selectedRole ? roleStats(selectedRole) : null);
	$effect(() => {
		if (!templateTitle && selectedTemplate) templateTitle = String(selectedTemplate.title ?? '');
	});
</script>

<section class="space-y-5">
	<div>
		<a href="/mentor" class="text-xs text-slate-400">← Mentor home</a>
		<h1 class="text-2xl font-semibold">Carpool Event Setup</h1>
		<p class="text-sm text-slate-400">Create day-by-day slot-based volunteer signup events.</p>
	</div>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<form method="POST" action="?/createFromTemplate" class="grid gap-2 rounded-xl border border-sky-800/70 bg-sky-950/20 p-3 md:grid-cols-3">
			<select name="template_id" class="rounded bg-slate-800 px-2 py-2 text-xs" bind:value={selectedTemplateId}>
				{#each data.templates as template (template.id)}
					<option value={template.id}>{template.name}</option>
				{/each}
			</select>
			<input name="title" class="rounded bg-slate-800 px-2 py-2 text-xs" bind:value={templateTitle} placeholder="Event title" required />
			<div class="flex gap-2">
				<button class="rounded border border-sky-700 px-3 py-2 text-xs text-sky-200">Create</button>
				<button type="button" class="rounded border border-slate-700 px-3 py-2 text-xs" onclick={() => (showTemplatePanel = false)}>Cancel</button>
			</div>
		</form>
	{/if}

	<form method="POST" action="?/createEvent" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="text-lg font-semibold">Create Event</h2>
		{#if (data.templates ?? []).length > 0}
			<p class="text-xs text-slate-400">
				{data.templates.length} saved template{data.templates.length === 1 ? '' : 's'} available.
			</p>
		{/if}
		<label class="flex flex-col gap-1 text-sm"><span>Title</span><input name="title" class="rounded bg-slate-800 px-2 py-2" required /></label>
		<label class="flex flex-col gap-1 text-sm"><span>Description</span><textarea name="description" rows="2" class="rounded bg-slate-800 px-2 py-2"></textarea></label>
		<label class="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" checked /> Active</label>
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold">Days and roles</p>
				<button type="button" class="rounded border border-slate-700 px-2 py-1 text-xs" onclick={addDay}>+ Day</button>
			</div>
			{#each days as day, di (di)}
				<div class="space-y-2 rounded border border-slate-800 bg-slate-950/60 p-3">
					<div class="grid gap-2 md:grid-cols-2">
						<label class="flex flex-col gap-1 text-xs"><span>Date</span><input type="date" class="rounded bg-slate-800 px-2 py-1" bind:value={day.date} required /></label>
						<label class="flex flex-col gap-1 text-xs"><span>Label</span><input class="rounded bg-slate-800 px-2 py-1" bind:value={day.label} /></label>
					</div>
					<label class="flex flex-col gap-1 text-xs"><span>Notes</span><input class="rounded bg-slate-800 px-2 py-1" bind:value={day.notes} /></label>
					<div class="space-y-1">
						<div class="flex items-center justify-between">
							<p class="text-xs text-slate-400">Roles</p>
							<button
								type="button"
								class="rounded border border-slate-700 px-2 py-1 text-xs"
								onclick={() => addRole(di)}
							>
								+ Add role
							</button>
						</div>
						{#each day.roles as role, ri (ri)}
							<div class="grid grid-cols-12 gap-2">
								<input class="col-span-3 rounded bg-slate-800 px-2 py-1 text-xs" bind:value={role.label} placeholder="Position label" />
								<select class="col-span-3 rounded bg-slate-800 px-2 py-1 text-xs" bind:value={role.mode}>
									<option value="slots">Slots</option>
									<option value="capacity">Capacity</option>
								</select>
								<input class="col-span-2 rounded bg-slate-800 px-2 py-1 text-xs" type="number" min="1" bind:value={role.slots} />
								<input class="col-span-3 rounded bg-slate-800 px-2 py-1 text-xs" bind:value={role.description} placeholder="Description" />
								<button
									type="button"
									class="col-span-1 rounded border border-red-700 px-2 py-1 text-xs text-red-200"
									onclick={() => removeRole(di, ri)}
									disabled={day.roles.length <= 1}
								>
									X
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<input type="hidden" name="days_json" value={daysJson} />
		<div class="flex flex-wrap items-center gap-2">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Create event</button>
			{#if (data.templates ?? []).length > 0}
				<button
					type="button"
					class="rounded border border-sky-700 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/30"
					onclick={() => (showTemplatePanel = !showTemplatePanel)}
				>
					Use template
				</button>
			{/if}
			<button
				type="button"
				class="rounded border border-sky-700 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900/30"
				onclick={() => (showSaveExistingTemplatePanel = !showSaveExistingTemplatePanel)}
			>
				Save existing event as template
			</button>
		</div>
		{#if showSaveExistingTemplatePanel}
			<form method="POST" action="?/saveTemplateFromEvent" class="grid gap-2 rounded-xl border border-sky-800/70 bg-sky-950/20 p-3 md:grid-cols-3">
				<select name="event_id" class="rounded bg-slate-800 px-2 py-2 text-xs" bind:value={templateFromEventId} required>
					{#each data.events as event (event.id)}
						<option value={event.id}>{event.title}</option>
					{/each}
				</select>
				<input
					name="template_name"
					class="rounded bg-slate-800 px-2 py-2 text-xs"
					bind:value={existingTemplateName}
					placeholder="Template name"
					required
				/>
				<div class="flex gap-2">
					<button class="rounded border border-sky-700 px-3 py-2 text-xs text-sky-200">Save</button>
					<button type="button" class="rounded border border-slate-700 px-3 py-2 text-xs" onclick={() => (showSaveExistingTemplatePanel = false)}>Cancel</button>
				</div>
			</form>
		{/if}
	</form>

	<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="text-lg font-semibold">Existing Events</h2>
		{#each data.events as event (event.id)}
			<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
				<form method="POST" action="?/updateEvent" class="space-y-2">
					<input type="hidden" name="event_id" value={event.id} />
					<input
						name="title"
						class="w-full rounded bg-slate-800 px-2 py-1 text-sm font-medium"
						value={event.title}
						required
					/>
					<textarea
						name="description"
						rows="2"
						class="w-full rounded bg-slate-800 px-2 py-1 text-sm"
					>{event.description ?? ''}</textarea>
					<div class="flex flex-wrap items-center gap-2">
						<label class="inline-flex items-center gap-2 text-xs">
							<input type="checkbox" name="is_active" checked={Boolean(event.is_active)} />
							Active
						</label>
						<button class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">Save event</button>
						<button
							formmethod="POST"
							formaction="?/deleteEvent"
							class="rounded border border-red-700 px-2 py-1 text-xs text-red-200"
						>
							Delete event
						</button>
					</div>
				</form>
				<div class="mt-2 space-y-2">
					{#each (data.days ?? []).filter((d) => d.event_id === event.id) as day (day.id)}
						<div class="rounded border border-slate-800 bg-slate-900/60 p-2 text-sm">
							<p class="font-medium">{day.day_date} {day.label ? `- ${day.label}` : ''}</p>
							<div class="mt-1 grid gap-1 md:grid-cols-2">
								{#each (data.roles ?? []).filter((r) => r.day_id === day.id) as role (role.id)}
									<button
										type="button"
										class="rounded border border-slate-800 px-2 py-1 text-left text-xs hover:border-sky-700 hover:bg-slate-800/70"
										onclick={() => (selectedRoleId = String(role.id))}
									>
										{role.role_label}
										{#if role.signup_mode === 'capacity'}
											({(data.signups ?? []).filter((s) => s.role_id === role.id).reduce((sum, row) => sum + Number(row.capacity_count ?? 1), 0)}/{role.slot_count} capacity)
										{:else}
											({(data.signups ?? []).filter((s) => s.role_id === role.id).length}/{role.slot_count} slots)
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<p class="text-sm text-slate-400">No carpool events yet.</p>
		{/each}
	</div>
	{#if selectedRole && selectedRoleStats}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onclick={() => (selectedRoleId = null)}
		>
			<div
				class="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-4"
				role="dialog"
				aria-modal="true"
				aria-label="Role statistics"
				onclick={(event) => event.stopPropagation()}
			>
				<div class="mb-3 flex items-center justify-between gap-2">
					<div>
						<p class="text-xs text-slate-400">{selectedRoleEvent?.title} · {selectedRoleDay?.day_date}</p>
						<h3 class="text-lg font-semibold">{selectedRole.role_label}</h3>
					</div>
					<button class="rounded border border-slate-700 px-2 py-1 text-xs" onclick={() => (selectedRoleId = null)}>Close</button>
				</div>
				{#if selectedRole.role_description}
					<p class="mb-3 text-sm text-slate-300">{selectedRole.role_description}</p>
				{/if}
				<div class="grid gap-2 md:grid-cols-3">
					<div class="rounded border border-slate-800 bg-slate-950/60 p-2">
						<p class="text-xs text-slate-400">Mode</p>
						<p class="text-sm font-semibold capitalize">{selectedRole.signup_mode}</p>
					</div>
					<div class="rounded border border-slate-800 bg-slate-950/60 p-2">
						<p class="text-xs text-slate-400">Used</p>
						<p class="text-sm font-semibold">{selectedRoleStats.used}</p>
					</div>
					<div class="rounded border border-slate-800 bg-slate-950/60 p-2">
						<p class="text-xs text-slate-400">Remaining</p>
						<p class="text-sm font-semibold">{selectedRoleStats.remaining}</p>
					</div>
				</div>
				<div class="mt-3 space-y-2">
					<p class="text-sm font-semibold">Signups</p>
					{#each selectedRoleStats.signups as signup (signup.id)}
						<div class="rounded border border-slate-800 bg-slate-950/60 p-2 text-sm">
							<p>{signup.user?.full_name || signup.user?.email || signup.user_id}</p>
							<p class="text-xs text-slate-400">
								{#if selectedRole.signup_mode === 'capacity'}Capacity: {signup.capacity_count}{:else}1 slot{/if}
								· {new Date(signup.created_at).toLocaleString()}
							</p>
						</div>
					{:else}
						<p class="text-xs text-slate-400">No signups yet.</p>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</section>
