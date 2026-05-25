<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ProficiencyBadge from '$lib/components/ProficiencyBadge.svelte';

	let { data, form } = $props();

	let selectedNodeId = $state('');
	const eligibleForSelected = $derived<Array<{ id: string; name: string }>>(
		selectedNodeId ? ((data.eligibleByNode as any)[selectedNodeId] ?? []) : []
	);
</script>

<section class="space-y-5">
	<PageHeader
		title="Course veterans"
		description="Grant members the ability to approve checkoffs for a specific course they've completed."
	/>

	{#if form?.error}
		<p
			class="rounded-xl border p-3 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded-xl border p-3 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}

	<GlassCard>
		<h2 class="mb-3 text-base font-semibold tracking-tight" style="color: var(--app-text);">
			Grant veteran status
		</h2>
		<form
			method="POST"
			action="?/grant"
			class="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
		>
			<label class="flex flex-col gap-1.5 text-xs" style="color: var(--app-text-muted);">
				<span class="eyebrow-label">Course</span>
				<select
					name="node_id"
					bind:value={selectedNodeId}
					required
					class="rounded-xl border bg-transparent px-3 py-2 text-sm"
					style="border-color: var(--app-glass-border); color: var(--app-input-text);"
				>
					<option value="">— select a course —</option>
					{#each data.nodes as n (n.id)}
						<option value={n.id}>
							{n.code ? n.code + ' · ' : ''}{n.title}
						</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1.5 text-xs" style="color: var(--app-text-muted);">
				<span class="eyebrow-label">Member (must have completed the course)</span>
				<select
					name="user_id"
					required
					disabled={!selectedNodeId}
					class="rounded-xl border bg-transparent px-3 py-2 text-sm"
					style="border-color: var(--app-glass-border); color: var(--app-input-text);"
				>
					<option value="">
						{selectedNodeId ? '— select a member —' : 'select a course first'}
					</option>
					{#each eligibleForSelected as m (m.id)}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			</label>
			<Button variant="primary" type="submit">Grant</Button>
		</form>
		{#if selectedNodeId && eligibleForSelected.length === 0}
			<p class="mt-2 text-xs" style="color: var(--app-warning);">
				No one has completed this course yet.
			</p>
		{/if}
	</GlassCard>

	<GlassCard>
		<h2 class="mb-3 text-base font-semibold tracking-tight" style="color: var(--app-text);">
			Current grants
		</h2>
		{#if data.grants.length === 0}
			<EmptyState
				title="No veterans yet"
				description="Grant a member veteran status above and they'll appear here."
			/>
		{:else}
			<div class="overflow-hidden rounded-xl border" style="border-color: var(--app-glass-border);">
				<table class="w-full text-sm">
					<thead style="background: var(--app-table-header-bg);">
						<tr>
							<th
								class="px-3 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Course</th
							>
							<th
								class="px-3 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Member</th
							>
							<th
								class="px-3 py-2 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Granted by</th
							>
							<th
								class="px-3 py-2 text-right text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Action</th
							>
						</tr>
					</thead>
					<tbody>
						{#each data.grants as g (g.node_id + ':' + g.user_id)}
							<tr
								class="border-t"
								style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);"
							>
								<td class="px-3 py-2.5">
									<div class="flex items-center gap-2">
										<ProficiencyBadge level={g.node_level} code={g.node_code} size="xs" />
										<span style="color: var(--app-text);">{g.node_title}</span>
									</div>
								</td>
								<td class="px-3 py-2.5" style="color: var(--app-text);">{g.grantee_name}</td>
								<td class="px-3 py-2.5 text-xs" style="color: var(--app-text-muted);">
									{g.grantor_name ?? '—'} · {new Date(g.granted_at).toLocaleDateString()}
								</td>
								<td class="px-3 py-2.5 text-right">
									<form method="POST" action="?/revoke" class="inline">
										<input type="hidden" name="node_id" value={g.node_id} />
										<input type="hidden" name="user_id" value={g.user_id} />
										<button
											type="submit"
											class="text-xs underline"
											style="color: var(--app-danger);"
										>
											Revoke
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</GlassCard>
</section>
