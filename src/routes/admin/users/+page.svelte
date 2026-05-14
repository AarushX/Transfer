<script lang="ts">
	import GlassTable from '$lib/components/ui/GlassTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();

	const gi = "rounded-lg border px-2 py-1 backdrop-blur-sm";
	const gs = "background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);";
</script>

<section class="space-y-5">
	<div class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Administration</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">User Role Management</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Set base role, then toggle mentor and lead permissions.</p>
	</div>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{/if}

	<div class="fade-up" style="animation-delay: 0.05s;">
	<GlassTable>
		<thead>
			<tr>
				<th class="px-3 py-2">Name</th>
				<th class="px-3 py-2">Email</th>
				<th class="px-3 py-2">Access</th>
				<th class="px-3 py-2 text-right">Action</th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as u (u.id)}
				<tr>
					<td class="px-3 py-2" style="color: var(--app-text);">{u.full_name || '—'}</td>
					<td class="px-3 py-2" style="color: var(--app-text-muted);">{u.email}</td>
					<td class="px-3 py-2">
						<form method="POST" action="?/setRole" class="flex items-center gap-2">
							<input type="hidden" name="user_id" value={u.id} />
							<select class={gi} style={gs} name="base_role" value={u.base_role ?? 'member'}>
								<option value="member">member</option>
								<option value="admin">admin</option>
							</select>
							<label class="inline-flex items-center gap-1 text-xs" style="color: var(--app-text);">
								<input type="checkbox" name="is_mentor" checked={!!u.is_mentor || u.role === 'mentor'} />
								Mentor
							</label>
							<label class="inline-flex items-center gap-1 text-xs" style="color: var(--app-text);">
								<input type="checkbox" name="is_lead" checked={!!u.is_lead || u.role === 'student_lead'} />
								Lead
							</label>
							<Button variant="secondary" size="sm" type="submit">Save</Button>
						</form>
					</td>
					<td class="px-3 py-2 text-right text-xs" style="color: var(--app-text-muted);">{u.id}</td>
				</tr>
			{/each}
		</tbody>
	</GlassTable>
	</div>
</section>
