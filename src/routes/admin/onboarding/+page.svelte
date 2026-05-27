<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	let { data, form } = $props();

	type Step = {
		id: string;
		position: number;
		kind: 'welcome' | 'team_pick' | 'external_link' | 'content';
		title: string;
		body: string;
		link_url: string;
		requires_link_click: boolean;
		requires_checkbox: boolean;
		is_active: boolean;
		updated_at: string;
	};

	const steps = $derived((data.steps ?? []) as Step[]);
	let editingId = $state('');
	let showCreate = $state(false);
	let newKind = $state<'welcome' | 'team_pick' | 'external_link' | 'content'>('content');
	let newTitle = $state('');
</script>

<section class="space-y-5">
	<PageHeader
		title="Onboarding"
		description="Curate the steps every new member walks through. Drag — well, edit — the position number to reorder; preview the result with the button below."
	>
		<a
			href="/onboarding?preview=1"
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-lg border px-3 py-1.5 text-xs font-semibold"
			style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
		>
			Preview as user ↗
		</a>
		<Button variant="primary" size="sm" onclick={() => (showCreate = !showCreate)}>
			{showCreate ? 'Cancel' : '+ New step'}
		</Button>
	</PageHeader>

	{#if form?.error}
		<div
			class="rounded-xl border p-3 text-sm"
			style="background: color-mix(in srgb, var(--app-danger) 12%, transparent); border-color: color-mix(in srgb, var(--app-danger) 30%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);"
		>
			{form.error}
		</div>
	{/if}

	{#if showCreate}
		<div class="aurora-border">
			<div class="space-y-3 rounded-[17px] p-4" style="background: var(--app-surface);">
				<form method="POST" action="?/create" class="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
					<input
						class="rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="title"
						placeholder="Step title"
						required
						bind:value={newTitle}
					/>
					<select
						class="rounded-xl border px-3 py-2 text-sm"
						style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
						name="kind"
						bind:value={newKind}
					>
						<option value="welcome">Welcome</option>
						<option value="team_pick">Team pick</option>
						<option value="external_link">External link</option>
						<option value="content">Content</option>
					</select>
					<Button variant="primary" type="submit" size="sm">Add</Button>
				</form>
			</div>
		</div>
	{/if}

	<div class="space-y-3">
		{#each steps as step (step.id)}
			<div
				class="rounded-2xl border p-4"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				{#if editingId === step.id}
					<form method="POST" action="?/update" class="space-y-3">
						<input type="hidden" name="id" value={step.id} />
						<div class="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
							<input
								class="rounded-xl border px-3 py-2 text-sm font-semibold"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="title"
								value={step.title}
								required
							/>
							<input
								type="number"
								class="rounded-xl border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="position"
								value={step.position}
								min="1"
								step="1"
							/>
							<label class="flex items-center gap-2 text-xs" style="color: var(--app-text-muted);">
								<input type="checkbox" name="is_active" checked={step.is_active} />
								Active
							</label>
						</div>
						<textarea
							class="w-full rounded-xl border px-3 py-2 text-sm"
							style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
							name="body"
							rows="4"
							placeholder="Body text shown to the user.">{step.body}</textarea
						>
						{#if step.kind === 'external_link'}
							<input
								class="mono w-full rounded-xl border px-3 py-2 text-sm"
								style="background: var(--app-input-bg); color: var(--app-input-text); border-color: var(--app-glass-border);"
								name="link_url"
								value={step.link_url}
								placeholder="https://…"
							/>
							<div class="flex gap-4 text-xs" style="color: var(--app-text-muted);">
								<label class="flex items-center gap-2">
									<input
										type="checkbox"
										name="requires_link_click"
										checked={step.requires_link_click}
									/>
									Require the link to be clicked
								</label>
								<label class="flex items-center gap-2">
									<input
										type="checkbox"
										name="requires_checkbox"
										checked={step.requires_checkbox}
									/>
									Require a confirmation checkbox
								</label>
							</div>
						{:else}
							<input type="hidden" name="link_url" value={step.link_url} />
							<input
								type="hidden"
								name="requires_link_click"
								value={step.requires_link_click ? 'on' : ''}
							/>
							<input
								type="hidden"
								name="requires_checkbox"
								value={step.requires_checkbox ? 'on' : ''}
							/>
						{/if}
						<div class="flex justify-end gap-2">
							<Button variant="ghost" size="sm" onclick={() => (editingId = '')}>Cancel</Button>
							<Button variant="primary" type="submit" size="sm">Save</Button>
						</div>
					</form>
				{:else}
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex flex-wrap items-center gap-2">
								<span class="mono text-[10px]" style="color: var(--app-text-dim);"
									>#{step.position}</span
								>
								<span
									class="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
									style="border-color: var(--app-glass-border); color: var(--app-text-muted);"
									>{step.kind}</span
								>
								{#if !step.is_active}
									<span
										class="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
										style="border-color: color-mix(in srgb, var(--app-warning) 35%, transparent); background: color-mix(in srgb, var(--app-warning) 10%, transparent); color: var(--app-warning);"
									>
										Hidden
									</span>
								{/if}
							</div>
							<p class="text-sm font-semibold" style="color: var(--app-text);">{step.title}</p>
							{#if step.body}
								<p class="mt-1 line-clamp-2 text-xs" style="color: var(--app-text-muted);">
									{step.body}
								</p>
							{/if}
							{#if step.kind === 'external_link' && step.link_url}
								<p class="mono mt-1 truncate text-[11px]" style="color: var(--app-text-dim);">
									→ {step.link_url}
								</p>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-1.5">
							<Button variant="ghost" size="sm" onclick={() => (editingId = step.id)}>Edit</Button>
							<form
								method="POST"
								action="?/remove"
								onsubmit={(e) => {
									if (!confirm('Delete this step?')) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={step.id} />
								<Button variant="danger" size="sm" type="submit">Delete</Button>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm" style="color: var(--app-text-dim);">No steps yet.</p>
		{/each}
	</div>
</section>
