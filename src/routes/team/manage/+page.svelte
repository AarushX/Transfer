<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let showNewPage = $state(false);
	let editingPageId = $state('');
	let editingBlockId = $state('');

	const scopeLabel = (kind: string) =>
		kind === 'team_group' ? (data.teamGroup?.name ?? 'Team') : (data.subteam?.name ?? 'Subteam');

	const blockEditPayload = (block: any) => JSON.stringify(block.payload ?? {});
</script>

<section class="space-y-4">
	<header class="fade-up">
		<p class="eyebrow-label">Lead Tools</p>
		<h1 class="mt-1 text-2xl font-bold tracking-tight" style="color: var(--app-text);">Manage Team Pages</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			{#if data.teamGroup}Leading {data.teamGroup.name}{data.teamGroup.designator ? ` · ${data.teamGroup.designator}` : ''}{/if}
			{#if data.subteam}{#if data.teamGroup} &middot; {/if}Subteam lead of {data.subteam.name}{/if}
		</p>
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<div class="flex items-center justify-between">
		<p class="text-xs" style="color: var(--app-text-dim);">{(data.pages ?? []).length} page{(data.pages ?? []).length !== 1 ? 's' : ''}</p>
		<Button variant="primary" size="sm" onclick={() => { showNewPage = !showNewPage; }}>{showNewPage ? 'Cancel' : 'New Page'}</Button>
	</div>

	{#if showNewPage}
		<GlassCard title="Create a Page" subtitle="Pages show up as tabs on the Team Page.">
			<form method="POST" action="?/createPage" class="space-y-3">
				<div class="grid gap-3 sm:grid-cols-3">
					<div>
						<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Scope</label>
						<select name="scope_kind" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
							{#if data.teamGroup}<option value="team_group">{data.teamGroup.name} (team-wide)</option>{/if}
							{#if data.subteam}<option value="subteam">{data.subteam.name} (subteam)</option>{/if}
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Type</label>
						<select name="kind" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
							<option value="content">Content page</option>
							<option value="redirect">External redirect</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Title</label>
						<input type="text" name="title" required class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="e.g. Resources" />
					</div>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Redirect URL (only if Type = redirect)</label>
					<input type="url" name="redirect_url" class="w-full rounded-lg border px-3 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" placeholder="https://cad.onshape.com/..." />
				</div>
				<Button variant="primary" type="submit">Create Page</Button>
			</form>
		</GlassCard>
	{/if}

	{#each data.pages as p (p.id)}
		<GlassCard>
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					{#if editingPageId === p.id}
						<form method="POST" action="?/updatePage" class="space-y-2">
							<input type="hidden" name="id" value={p.id} />
							<input type="text" name="title" value={p.title} class="w-full rounded-lg border px-3 py-2 text-sm font-semibold" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							{#if p.kind === 'redirect'}
								<input type="url" name="redirect_url" value={p.redirect_url ?? ''} placeholder="Redirect URL" class="w-full rounded-lg border px-3 py-2 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
							{/if}
							<div class="flex gap-2">
								<Button variant="primary" size="sm" type="submit">Save</Button>
								<Button variant="ghost" size="sm" onclick={() => { editingPageId = ''; }}>Cancel</Button>
							</div>
						</form>
					{:else}
						<p class="text-sm font-bold" style="color: var(--app-text);">{p.title}</p>
						<p class="text-xs" style="color: var(--app-text-dim);">
							{p.kind === 'redirect' ? `Redirect → ${p.redirect_url}` : `${scopeLabel(p.scope_kind)} · /team/${p.slug}`}
						</p>
					{/if}
				</div>
				<div class="flex items-center gap-1.5 shrink-0">
					<Button variant="ghost" size="sm" onclick={() => { editingPageId = editingPageId === p.id ? '' : p.id; }}>Edit</Button>
					<form method="POST" action="?/deletePage" onsubmit={(e) => { if (!confirm('Delete this page?')) e.preventDefault(); }}>
						<input type="hidden" name="id" value={p.id} />
						<Button variant="danger" size="sm" type="submit">Delete</Button>
					</form>
				</div>
			</div>

			{#if p.kind === 'content'}
				<div class="mt-3 space-y-2">
					{#each p.blocks as block (block.id)}
						<div class="rounded-lg border p-2" style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);">
							{#if editingBlockId === block.id}
								<form method="POST" action="?/updateBlock" class="space-y-2">
									<input type="hidden" name="id" value={block.id} />
									<p class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">{block.kind}</p>
									{#if block.kind === 'heading'}
										<input type="text" placeholder="Heading text" value={block.payload?.text ?? ''} oninput={(e) => { const v = (e.target as HTMLInputElement).value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ text: v }); }} class="w-full rounded border px-2 py-1 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
									{:else if block.kind === 'text'}
										<textarea rows="3" placeholder="Body text" oninput={(e) => { const v = (e.target as HTMLTextAreaElement).value; (e.target as HTMLTextAreaElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ text: v }); }} class="w-full rounded border px-2 py-1 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">{block.payload?.text ?? ''}</textarea>
									{:else if block.kind === 'link'}
										<input type="url" placeholder="URL" value={block.payload?.url ?? ''} oninput={(e) => { const url = (e.target as HTMLInputElement).value; const label = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[data-field=label]')!.value; const desc = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[data-field=description]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, label, description: desc }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
										<input type="text" data-field="label" placeholder="Label" value={block.payload?.label ?? ''} oninput={(e) => { const label = (e.target as HTMLInputElement).value; const url = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[type=url]')!.value; const desc = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[data-field=description]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, label, description: desc }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
										<input type="text" data-field="description" placeholder="Description (optional)" value={block.payload?.description ?? ''} oninput={(e) => { const desc = (e.target as HTMLInputElement).value; const url = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[type=url]')!.value; const label = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[data-field=label]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, label, description: desc }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
									{:else if block.kind === 'image'}
										<input type="url" placeholder="Image URL" value={block.payload?.url ?? ''} oninput={(e) => { const url = (e.target as HTMLInputElement).value; const alt = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[data-field=alt]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, alt }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
										<input type="text" data-field="alt" placeholder="Alt text" value={block.payload?.alt ?? ''} oninput={(e) => { const alt = (e.target as HTMLInputElement).value; const url = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[type=url]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, alt }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
									{:else if block.kind === 'embed'}
										<input type="url" placeholder="Embed URL (YouTube, Onshape, etc.)" value={block.payload?.url ?? ''} oninput={(e) => { const url = (e.target as HTMLInputElement).value; const title = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[data-field=title]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, title }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
										<input type="text" data-field="title" placeholder="Title (optional)" value={block.payload?.title ?? ''} oninput={(e) => { const title = (e.target as HTMLInputElement).value; const url = (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[type=url]')!.value; (e.target as HTMLInputElement).form!.querySelector<HTMLInputElement>('input[name=payload]')!.value = JSON.stringify({ url, title }); }} class="w-full rounded border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />
									{/if}
									<input type="hidden" name="payload" value={blockEditPayload(block)} />
									<div class="flex items-center gap-2">
										<Button variant="primary" size="sm" type="submit">Save</Button>
										<Button variant="ghost" size="sm" onclick={() => { editingBlockId = ''; }}>Cancel</Button>
									</div>
								</form>
							{:else}
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0 flex-1">
										<p class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--app-text-muted);">{block.kind}</p>
										{#if block.kind === 'heading'}<p class="text-sm font-bold" style="color: var(--app-text);">{block.payload?.text ?? '(empty)'}</p>
										{:else if block.kind === 'text'}<p class="text-xs truncate" style="color: var(--app-text);">{block.payload?.text ?? '(empty)'}</p>
										{:else if block.kind === 'link'}<p class="text-xs" style="color: var(--app-text);">{block.payload?.label ?? block.payload?.url ?? '(empty)'} → {block.payload?.url ?? ''}</p>
										{:else if block.kind === 'image'}<p class="text-xs truncate" style="color: var(--app-text);">Image: {block.payload?.url ?? '(empty)'}</p>
										{:else if block.kind === 'embed'}<p class="text-xs truncate" style="color: var(--app-text);">Embed: {block.payload?.url ?? '(empty)'}</p>
										{:else if block.kind === 'divider'}<p class="text-xs" style="color: var(--app-text-dim);">— divider —</p>
										{/if}
									</div>
									<div class="flex items-center gap-1 shrink-0">
										<form method="POST" action="?/moveBlock" style="display: inline;"><input type="hidden" name="id" value={block.id} /><input type="hidden" name="direction" value="up" /><Button variant="ghost" size="sm" type="submit">↑</Button></form>
										<form method="POST" action="?/moveBlock" style="display: inline;"><input type="hidden" name="id" value={block.id} /><input type="hidden" name="direction" value="down" /><Button variant="ghost" size="sm" type="submit">↓</Button></form>
										<Button variant="ghost" size="sm" onclick={() => { editingBlockId = block.id; }}>Edit</Button>
										<form method="POST" action="?/deleteBlock" onsubmit={(e) => { if (!confirm('Delete?')) e.preventDefault(); }}><input type="hidden" name="id" value={block.id} /><Button variant="danger" size="sm" type="submit">×</Button></form>
									</div>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Add block buttons -->
					<div class="flex flex-wrap items-center gap-1.5 pt-1">
						<span class="text-[10px] uppercase tracking-wider" style="color: var(--app-text-dim);">Add:</span>
						{#each ['heading', 'text', 'link', 'image', 'embed', 'divider'] as kind}
							<form method="POST" action="?/addBlock" style="display: inline;">
								<input type="hidden" name="page_id" value={p.id} />
								<input type="hidden" name="kind" value={kind} />
								<Button variant="ghost" size="sm" type="submit">+ {kind}</Button>
							</form>
						{/each}
					</div>
				</div>
			{/if}
		</GlassCard>
	{/each}
</section>
