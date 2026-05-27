<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let { data } = $props();
	let name = $state('');
	let description = $state('');
	let location = $state('');
	let requiredNodeIds = $state<string[]>([]);
	let error = $state('');
	let success = $state('');
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let editLocation = $state('');
	let editRequiredNodeIds = $state<string[]>([]);

	const toggleRequirement = (id: string, checked: boolean) => {
		if (checked) requiredNodeIds = Array.from(new Set([...requiredNodeIds, id]));
		else requiredNodeIds = requiredNodeIds.filter((x) => x !== id);
	};

	const createMachine = async () => {
		const res = await fetch('/api/machines/create', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, description, location, requiredNodeIds })
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			error = body?.error ?? 'Could not create machine.';
			return;
		}
		error = '';
		success = `Created ${body?.machine?.name ?? 'machine'}. Refresh to view QR card.`;
		name = '';
		description = '';
		location = '';
		requiredNodeIds = [];
	};

	const trainingName = (id: string) => data.courses.find((c: any) => c.id === id)?.title ?? id;
	const beginEdit = (m: any) => {
		editingId = m.id;
		editName = String(m.name ?? '');
		editDescription = String(m.description ?? '');
		editLocation = String(m.location ?? '');
		editRequiredNodeIds = Array.isArray(m.required_node_ids) ? m.required_node_ids.map(String) : [];
		error = '';
		success = '';
	};
	const cancelEdit = () => {
		editingId = null;
		editName = '';
		editDescription = '';
		editLocation = '';
		editRequiredNodeIds = [];
	};
	const toggleEditRequirement = (id: string, checked: boolean) => {
		if (checked) editRequiredNodeIds = Array.from(new Set([...editRequiredNodeIds, id]));
		else editRequiredNodeIds = editRequiredNodeIds.filter((x) => x !== id);
	};
	const saveMachine = async () => {
		if (!editingId) return;
		const res = await fetch('/api/machines/update', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				machineId: editingId,
				name: editName,
				description: editDescription,
				location: editLocation,
				requiredNodeIds: editRequiredNodeIds
			})
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			error = body?.error ?? 'Could not update machine.';
			return;
		}
		success = `Updated ${body?.machine?.name ?? 'machine'}.`;
		error = '';
		cancelEdit();
		await invalidateAll();
	};
	const deleteMachine = async (m: any) => {
		if (!confirm(`Delete ${m.name}? This cannot be undone.`)) return;
		const res = await fetch('/api/machines/delete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ machineId: m.id })
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			error = body?.error ?? 'Could not delete machine.';
			return;
		}
		success = `Deleted ${m.name}.`;
		error = '';
		if (editingId === m.id) cancelEdit();
		await invalidateAll();
	};

	const gi = 'rounded-lg border px-2 py-2 backdrop-blur-sm';
	const gs =
		'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);';
</script>

<section class="space-y-5">
	<div class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Mentor Panel</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">Machine Shop Admin</span>
		</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Create machine entries with required completed training and print QR codes for shop access.
		</p>
	</div>
	{#if error}<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{error}
		</p>{/if}
	{#if success}<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			{success}
		</p>{/if}

	<GlassCard title="Create machine">
		<div class="grid gap-3 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm"
				><span style="color: var(--app-text);">Name</span><input
					class={gi}
					style={gs}
					bind:value={name}
					placeholder="Bandsaw A"
				/></label
			>
			<label class="flex flex-col gap-1 text-sm"
				><span style="color: var(--app-text);">Location</span><input
					class={gi}
					style={gs}
					bind:value={location}
					placeholder="North wall bay"
				/></label
			>
			<label class="flex flex-col gap-1 text-sm md:col-span-2"
				><span style="color: var(--app-text);">Description</span><textarea
					class={gi}
					style={gs}
					rows="3"
					bind:value={description}
				></textarea></label
			>
			<div class="md:col-span-2">
				<p class="mb-1 text-sm" style="color: var(--app-text);">Required completed training</p>
				<div
					class="grid max-h-44 gap-1 overflow-y-auto rounded-lg border p-2 md:grid-cols-2"
					style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
				>
					{#each data.courses as c}
						<label class="flex items-center gap-2 text-sm" style="color: var(--app-text);">
							<input
								type="checkbox"
								checked={requiredNodeIds.includes(c.id)}
								onchange={(e) =>
									toggleRequirement(c.id, (e.currentTarget as HTMLInputElement).checked)}
							/>
							<span>{c.title}</span>
						</label>
					{/each}
				</div>
			</div>
			<div class="flex justify-end md:col-span-2">
				<Button variant="primary" onclick={createMachine}>Create machine</Button>
			</div>
		</div>
	</GlassCard>

	<div class="grid gap-3 md:grid-cols-2">
		{#each data.machines as m}
			<GlassCard>
				<div class="flex items-start justify-between gap-2">
					<div>
						<h3 class="font-semibold" style="color: var(--app-text);">{m.name}</h3>
						<p class="text-xs" style="color: var(--app-text-muted);">
							{m.location || 'No location set'}
						</p>
					</div>
					{#if m.qrDataUrl}
						<a
							href={m.qrDataUrl}
							download={`${m.name}-qr.png`}
							class="text-xs underline"
							style="color: var(--app-link);">Download QR</a
						>
					{/if}
				</div>
				<p class="mt-2 text-sm" style="color: var(--app-text);">
					{m.description || 'No description.'}
				</p>
				<p class="mt-2 text-xs" style="color: var(--app-text-muted);">
					Required: {Array.isArray(m.required_node_ids) && m.required_node_ids.length > 0
						? m.required_node_ids.map((id: string) => trainingName(id)).join(', ')
						: 'None'}
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<Button variant="secondary" size="sm" onclick={() => beginEdit(m)}>Edit</Button>
					<Button variant="danger" size="sm" onclick={() => deleteMachine(m)}>Delete</Button>
				</div>
				{#if editingId === m.id}
					<div
						class="mt-3 space-y-3 rounded-lg border p-3"
						style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
					>
						<p
							class="text-xs font-semibold tracking-wide uppercase"
							style="color: var(--app-text-muted);"
						>
							Edit machine
						</p>
						<div class="grid gap-3 md:grid-cols-2">
							<label class="flex flex-col gap-1 text-sm"
								><span style="color: var(--app-text);">Name</span><input
									class={gi}
									style={gs}
									bind:value={editName}
								/></label
							>
							<label class="flex flex-col gap-1 text-sm"
								><span style="color: var(--app-text);">Location</span><input
									class={gi}
									style={gs}
									bind:value={editLocation}
								/></label
							>
							<label class="flex flex-col gap-1 text-sm md:col-span-2"
								><span style="color: var(--app-text);">Description</span><textarea
									class={gi}
									style={gs}
									rows="3"
									bind:value={editDescription}
								></textarea></label
							>
							<div class="md:col-span-2">
								<p class="mb-1 text-sm" style="color: var(--app-text);">
									Required completed training
								</p>
								<div
									class="grid max-h-40 gap-1 overflow-y-auto rounded-lg border p-2 md:grid-cols-2"
									style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
								>
									{#each data.courses as c}
										<label class="flex items-center gap-2 text-sm" style="color: var(--app-text);">
											<input
												type="checkbox"
												checked={editRequiredNodeIds.includes(c.id)}
												onchange={(e) =>
													toggleEditRequirement(
														c.id,
														(e.currentTarget as HTMLInputElement).checked
													)}
											/>
											<span>{c.title}</span>
										</label>
									{/each}
								</div>
							</div>
							<div class="flex justify-end gap-2 md:col-span-2">
								<Button variant="ghost" onclick={cancelEdit}>Cancel</Button>
								<Button variant="primary" onclick={saveMachine}>Save changes</Button>
							</div>
						</div>
					</div>
				{/if}
				{#if m.qrDataUrl}
					<img
						src={m.qrDataUrl}
						alt={`${m.name} QR`}
						class="mt-3 w-40 rounded-lg p-2"
						style="background: var(--app-surface);"
					/>
				{/if}
			</GlassCard>
		{:else}
			<p style="color: var(--app-text-muted);">No machines created yet.</p>
		{/each}
	</div>

	<GlassCard title="Recent machine use scans">
		<ul class="space-y-2 text-sm">
			{#each data.usageEvents as evt}
				<li
					class="rounded-lg border p-2"
					style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
				>
					<span style="color: {evt.authorized ? 'var(--app-success)' : 'var(--app-danger)'};">
						{evt.authorized ? 'Authorized' : 'Denied'}
					</span>
					· {evt.user?.full_name || evt.user?.email || evt.user_id} · {evt.machine?.name ||
						evt.machine_id}
					· {new Date(evt.created_at).toLocaleString()}
				</li>
			{:else}
				<li style="color: var(--app-text-muted);">No usage events yet.</li>
			{/each}
		</ul>
	</GlassCard>
</section>
