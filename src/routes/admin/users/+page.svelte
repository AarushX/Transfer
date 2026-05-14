<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let search = $state('');
	const filtered = $derived(
		(data.users ?? []).filter((u: any) =>
			!search.trim() ||
			(u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
			(u.email ?? '').toLowerCase().includes(search.toLowerCase())
		)
	);
</script>

<section class="space-y-4">
	<header class="fade-up">
		<p class="eyebrow-label">Admin</p>
		<h1 class="mt-1 text-2xl font-bold tracking-tight" style="color: var(--app-text);">Users & Leadership</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Assign team leads and subteam leads. Leaders can create pages on their team's Team Page.</p>
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<input type="search" bind:value={search} placeholder="Search by name or email..." class="w-full rounded-xl border px-4 py-2 text-sm" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);" />

	<div class="space-y-2">
		{#each filtered as u (u.id)}
			<GlassCard compact>
				<form method="POST" action="?/updateLeadership" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
					<input type="hidden" name="user_id" value={u.id} />
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium" style="color: var(--app-text);">{u.full_name || u.email}</p>
						<p class="text-xs" style="color: var(--app-text-dim);">{u.email}</p>
						<div class="mt-1 flex flex-wrap gap-1">
							{#if u.role === 'admin' || u.base_role === 'admin'}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">admin</span>{/if}
							{#if u.is_mentor}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);">mentor</span>{/if}
							{#if u.is_lead}<span class="rounded-full px-2 py-0.5 text-[10px]" style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);">lead</span>{/if}
						</div>
					</div>
					<div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
						<div>
							<label class="text-[10px]" style="color: var(--app-text-muted);">Lead of team</label>
							<select name="lead_team_group_id" class="w-full rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
								<option value="">— none —</option>
								{#each data.teamGroups as tg (tg.id)}<option value={tg.id} selected={u.lead_team_group_id === tg.id}>{tg.name}{tg.designator ? ` · ${tg.designator}` : ''}</option>{/each}
							</select>
						</div>
						<div>
							<label class="text-[10px]" style="color: var(--app-text-muted);">Lead of subteam</label>
							<select name="lead_subteam_id" class="w-full rounded-lg border px-2 py-1 text-xs" style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
								<option value="">— none —</option>
								{#each data.subteams as st (st.id)}<option value={st.id} selected={u.lead_subteam_id === st.id}>{st.name}</option>{/each}
							</select>
						</div>
						<Button variant="secondary" size="sm" type="submit">Save</Button>
					</div>
				</form>
			</GlassCard>
		{/each}
		{#if filtered.length === 0}
			<GlassCard><p class="text-sm" style="color: var(--app-text-muted);">No users match your search.</p></GlassCard>
		{/if}
	</div>
</section>
