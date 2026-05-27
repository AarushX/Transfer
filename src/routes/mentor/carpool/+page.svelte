<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	type RoleDraft = {
		label: string;
		slots: number;
		mode: 'slots' | 'capacity';
		description: string;
	};
	type DayDraft = { date: string; label: string; notes: string; roles: RoleDraft[] };
	let days = $state<DayDraft[]>([
		{
			date: '',
			label: 'Competition Day 1',
			notes: '',
			roles: [
				{
					label: 'Take There',
					slots: 2,
					mode: 'slots',
					description: 'Volunteer driver to take students to venue.'
				},
				{
					label: 'Bring Back',
					slots: 2,
					mode: 'slots',
					description: 'Volunteer driver to bring students home.'
				},
				{
					label: 'Chaperone',
					slots: 2,
					mode: 'slots',
					description: 'Adult chaperone for event supervision.'
				}
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
	const selectedTemplate = $derived(
		(data.templates ?? []).find((t: any) => t.id === selectedTemplateId) ?? null
	);
	const signupsForRole = (roleId: string) =>
		(data.signups ?? []).filter((s: any) => s.role_id === roleId);
	const roleStats = (role: any) => {
		const signups = signupsForRole(String(role.id));
		const used =
			role.signup_mode === 'capacity'
				? signups.reduce(
						(sum: number, row: any) => sum + Math.max(1, Number(row.capacity_count ?? 1) || 1),
						0
					)
				: signups.length;
		const total = Math.max(1, Number(role.slot_count ?? 1) || 1);
		return { used, total, remaining: Math.max(0, total - used), signups };
	};
	const selectedRole = $derived(
		(data.roles ?? []).find((r: any) => r.id === selectedRoleId) ?? null
	);
	const selectedRoleDay = $derived(
		selectedRole ? ((data.days ?? []).find((d: any) => d.id === selectedRole.day_id) ?? null) : null
	);
	const selectedRoleEvent = $derived(
		selectedRoleDay
			? ((data.events ?? []).find((e: any) => e.id === selectedRoleDay.event_id) ?? null)
			: null
	);
	const selectedRoleStats = $derived(selectedRole ? roleStats(selectedRole) : null);
	$effect(() => {
		if (!templateTitle && selectedTemplate) templateTitle = String(selectedTemplate.title ?? '');
	});

	const gi = 'rounded-lg border px-2 py-2 backdrop-blur-sm';
	const gs =
		'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);';
</script>

<section class="space-y-5">
	<div class="fade-up">
		<a href="/mentor" class="text-xs" style="color: var(--app-text-muted);">← Mentor home</a>
		<p class="eyebrow-label" style="margin-top: 4px; margin-bottom: 2px;">Mentor Panel</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">Carpool Event Setup</span>
		</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Create day-by-day slot-based volunteer signup events.
		</p>
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
	{#if showTemplatePanel && (data.templates ?? []).length > 0}
		<form
			method="POST"
			action="?/createFromTemplate"
			class="grid gap-2 rounded-xl border p-3 md:grid-cols-3"
			style="border-color: var(--app-info); background: color-mix(in srgb, var(--app-info) 8%, transparent);"
		>
			<select name="template_id" class={gi + ' text-xs'} style={gs} bind:value={selectedTemplateId}>
				{#each data.templates as template (template.id)}<option value={template.id}
						>{template.name}</option
					>{/each}
			</select>
			<input
				name="title"
				class={gi + ' text-xs'}
				style={gs}
				bind:value={templateTitle}
				placeholder="Event title"
				required
			/>
			<div class="flex gap-2">
				<Button variant="secondary" size="sm" type="submit">Create</Button>
				<Button variant="ghost" size="sm" onclick={() => (showTemplatePanel = false)}>Cancel</Button
				>
			</div>
		</form>
	{/if}

	<form
		method="POST"
		action="?/createEvent"
		class="fade-up space-y-3 rounded-2xl border p-5 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;"
	>
		<h2 class="text-lg font-semibold" style="color: var(--app-text);">Create Event</h2>
		{#if (data.templates ?? []).length > 0}
			<p class="text-xs" style="color: var(--app-text-muted);">
				{data.templates.length} saved template{data.templates.length === 1 ? '' : 's'} available.
			</p>
		{/if}
		<label class="flex flex-col gap-1 text-sm"
			><span style="color: var(--app-text);">Title</span><input
				name="title"
				class={gi}
				style={gs}
				required
			/></label
		>
		<label class="flex flex-col gap-1 text-sm"
			><span style="color: var(--app-text);">Description</span><textarea
				name="description"
				rows="2"
				class={gi}
				style={gs}
			></textarea></label
		>
		<label class="inline-flex items-center gap-2 text-sm" style="color: var(--app-text);"
			><input type="checkbox" name="is_active" checked /> Active</label
		>
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold" style="color: var(--app-text);">Days and roles</p>
				<Button variant="secondary" size="sm" onclick={addDay}>+ Day</Button>
			</div>
			{#each days as day, di (di)}
				<div
					class="space-y-2 rounded-lg border p-3"
					style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
				>
					<div class="grid gap-2 md:grid-cols-2">
						<label class="flex flex-col gap-1 text-xs"
							><span style="color: var(--app-text-muted);">Date</span><input
								type="date"
								class={gi + ' py-1'}
								style={gs}
								bind:value={day.date}
								required
							/></label
						>
						<label class="flex flex-col gap-1 text-xs"
							><span style="color: var(--app-text-muted);">Label</span><input
								class={gi + ' py-1'}
								style={gs}
								bind:value={day.label}
							/></label
						>
					</div>
					<label class="flex flex-col gap-1 text-xs"
						><span style="color: var(--app-text-muted);">Notes</span><input
							class={gi + ' py-1'}
							style={gs}
							bind:value={day.notes}
						/></label
					>
					<div class="space-y-1">
						<div class="flex items-center justify-between">
							<p class="text-xs" style="color: var(--app-text-muted);">Roles</p>
							<button
								type="button"
								class="rounded-lg border px-2 py-1 text-xs"
								style="border-color: var(--app-glass-border);"
								onclick={() => addRole(di)}>+ Add role</button
							>
						</div>
						{#each day.roles as role, ri (ri)}
							<div class="grid grid-cols-12 gap-2">
								<input
									class={'col-span-3 ' + gi + ' py-1 text-xs'}
									style={gs}
									bind:value={role.label}
									placeholder="Position label"
								/>
								<select
									class={'col-span-3 ' + gi + ' py-1 text-xs'}
									style={gs}
									bind:value={role.mode}
									><option value="slots">Slots</option><option value="capacity">Capacity</option
									></select
								>
								<input
									class={'col-span-2 ' + gi + ' py-1 text-xs'}
									style={gs}
									type="number"
									min="1"
									bind:value={role.slots}
								/>
								<input
									class={'col-span-3 ' + gi + ' py-1 text-xs'}
									style={gs}
									bind:value={role.description}
									placeholder="Description"
								/>
								<button
									type="button"
									class="col-span-1 rounded-lg border px-2 py-1 text-xs"
									style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); color: var(--app-danger);"
									onclick={() => removeRole(di, ri)}
									disabled={day.roles.length <= 1}>X</button
								>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<input type="hidden" name="days_json" value={daysJson} />
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="primary" type="submit">Create event</Button>
			{#if (data.templates ?? []).length > 0}
				<Button variant="secondary" onclick={() => (showTemplatePanel = !showTemplatePanel)}
					>Use template</Button
				>
			{/if}
			<Button
				variant="secondary"
				onclick={() => (showSaveExistingTemplatePanel = !showSaveExistingTemplatePanel)}
				>Save existing event as template</Button
			>
		</div>
		{#if showSaveExistingTemplatePanel}
			<form
				method="POST"
				action="?/saveTemplateFromEvent"
				class="grid gap-2 rounded-xl border p-3 md:grid-cols-3"
				style="border-color: var(--app-info); background: color-mix(in srgb, var(--app-info) 8%, transparent);"
			>
				<select
					name="event_id"
					class={gi + ' text-xs'}
					style={gs}
					bind:value={templateFromEventId}
					required
				>
					{#each data.events as event (event.id)}<option value={event.id}>{event.title}</option
						>{/each}
				</select>
				<input
					name="template_name"
					class={gi + ' text-xs'}
					style={gs}
					bind:value={existingTemplateName}
					placeholder="Template name"
					required
				/>
				<div class="flex gap-2">
					<Button variant="secondary" size="sm" type="submit">Save</Button>
					<Button variant="ghost" size="sm" onclick={() => (showSaveExistingTemplatePanel = false)}
						>Cancel</Button
					>
				</div>
			</form>
		{/if}
	</form>

	<GlassCard title="Existing Events">
		{#each data.events as event (event.id)}
			<div
				class="mb-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<form method="POST" action="?/updateEvent" class="space-y-2">
					<input type="hidden" name="event_id" value={event.id} />
					<input
						name="title"
						class={'w-full ' + gi + ' py-1 text-sm font-medium'}
						style={gs}
						value={event.title}
						required
					/>
					<textarea name="description" rows="2" class={'w-full ' + gi + ' py-1 text-sm'} style={gs}
						>{event.description ?? ''}</textarea
					>
					<div class="flex flex-wrap items-center gap-2">
						<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);"
							><input type="checkbox" name="is_active" checked={Boolean(event.is_active)} /> Active</label
						>
						<Button variant="secondary" size="sm" type="submit">Save event</Button>
						<button
							type="submit"
							formmethod="POST"
							formaction="?/deleteEvent"
							class="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
							style="background: color-mix(in srgb, var(--app-danger) 85%, transparent); color: white; border: 1px solid color-mix(in srgb, var(--app-danger) 50%, transparent);"
							>Delete event</button
						>
					</div>
				</form>
				<div class="mt-2 space-y-2">
					{#each (data.days ?? []).filter((d) => d.event_id === event.id) as day (day.id)}
						<div
							class="rounded-lg border p-2 text-sm"
							style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
						>
							<p class="font-medium" style="color: var(--app-text);">
								{day.day_date}
								{day.label ? `- ${day.label}` : ''}
							</p>
							<div class="mt-1 grid gap-1 md:grid-cols-2">
								{#each (data.roles ?? []).filter((r) => r.day_id === day.id) as role (role.id)}
									<button
										type="button"
										class="glass-role-btn rounded-lg border px-2 py-1 text-left text-xs"
										style="border-color: var(--app-glass-border);"
										onclick={() => (selectedRoleId = String(role.id))}
									>
										{role.role_label}
										{#if role.signup_mode === 'capacity'}
											({(data.signups ?? [])
												.filter((s) => s.role_id === role.id)
												.reduce(
													(sum, row) => sum + Number(row.capacity_count ?? 1),
													0
												)}/{role.slot_count} capacity)
										{:else}
											({(data.signups ?? []).filter((s) => s.role_id === role.id)
												.length}/{role.slot_count} slots)
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<p class="text-sm" style="color: var(--app-text-muted);">No carpool events yet.</p>
		{/each}
	</GlassCard>
	{#if selectedRole && selectedRoleStats}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center p-4"
			style="background-color: color-mix(in srgb, var(--app-overlay-scrim) 70%, transparent);"
			role="presentation"
			onclick={() => (selectedRoleId = null)}
		>
			<div
				class="w-full max-w-2xl rounded-xl border p-4 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
				role="dialog"
				aria-modal="true"
				aria-label="Role statistics"
				onclick={(event) => event.stopPropagation()}
			>
				<div class="mb-3 flex items-center justify-between gap-2">
					<div>
						<p class="text-xs" style="color: var(--app-text-muted);">
							{selectedRoleEvent?.title} · {selectedRoleDay?.day_date}
						</p>
						<h3 class="text-lg font-semibold" style="color: var(--app-text);">
							{selectedRole.role_label}
						</h3>
					</div>
					<Button variant="secondary" size="sm" onclick={() => (selectedRoleId = null)}
						>Close</Button
					>
				</div>
				{#if selectedRole.role_description}
					<p class="mb-3 text-sm" style="color: var(--app-text);">
						{selectedRole.role_description}
					</p>
				{/if}
				<div class="grid gap-2 md:grid-cols-3">
					{#each [['Mode', selectedRole.signup_mode], ['Used', selectedRoleStats.used], ['Remaining', selectedRoleStats.remaining]] as [label, value]}
						<div
							class="rounded-lg border p-2"
							style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
						>
							<p class="text-xs" style="color: var(--app-text-muted);">{label}</p>
							<p class="text-sm font-semibold capitalize" style="color: var(--app-text);">
								{value}
							</p>
						</div>
					{/each}
				</div>
				<div class="mt-3 space-y-2">
					<p class="text-sm font-semibold" style="color: var(--app-text);">Signups</p>
					{#each selectedRoleStats.signups as signup (signup.id)}
						<div
							class="rounded-lg border p-2 text-sm"
							style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
						>
							<p style="color: var(--app-text);">
								{signup.user?.full_name || signup.user?.email || signup.user_id}
							</p>
							<p class="text-xs" style="color: var(--app-text-muted);">
								{#if selectedRole.signup_mode === 'capacity'}Capacity: {signup.capacity_count}{:else}1
									slot{/if}
								· {new Date(signup.created_at).toLocaleString()}
							</p>
						</div>
					{:else}
						<p class="text-xs" style="color: var(--app-text-muted);">No signups yet.</p>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.glass-role-btn {
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.glass-role-btn:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
</style>
