<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	const signupsForRole = (roleId: string) => (data.signups ?? []).filter((s: any) => s.role_id === roleId);
	const mySignupForRole = (roleId: string) => (data.signups ?? []).find((s: any) => s.role_id === roleId && s.user_id === data.me);
	const usedForRole = (role: any) =>
		role.signup_mode === 'capacity'
			? signupsForRole(role.id).reduce((sum: number, row: any) => sum + Number(row.capacity_count ?? 1), 0)
			: signupsForRole(role.id).length;
	const unitForRole = (role: any) => (role.signup_mode === 'capacity' ? 'capacity' : 'slots');
</script>

<section class="space-y-5">
	<div>
		<a href="/dashboard" class="text-xs" style="color: var(--app-text-muted);">← Dashboard</a>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Carpool Volunteering</h1>
		<p class="text-sm" style="color: var(--app-text-muted);">Sign up for day-specific transport and chaperone slots.</p>
	</div>

	{#if form?.error}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	{#each data.events as event (event.id)}
		<GlassCard>
			<div>
				<h2 class="text-lg font-semibold" style="color: var(--app-text);">{event.title}</h2>
				{#if event.description}<p class="text-sm" style="color: var(--app-text-muted);">{event.description}</p>{/if}
			</div>
			{#each (data.days ?? []).filter((d) => d.event_id === event.id) as day (day.id)}
				<div class="mt-3 space-y-2 rounded border p-3" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
					<p class="font-medium" style="color: var(--app-text);">{day.day_date} {day.label ? `- ${day.label}` : ''}</p>
					{#if day.notes}<p class="text-xs" style="color: var(--app-text-muted);">{day.notes}</p>{/if}
					<div class="grid gap-2 md:grid-cols-2">
						{#each (data.roles ?? []).filter((r) => r.day_id === day.id) as role (role.id)}
							<div class="rounded border p-2" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
								<p class="text-sm font-medium" style="color: var(--app-text);">{role.role_label}</p>
								{#if role.role_description}
									<p class="text-xs" style="color: var(--app-text-muted);">{role.role_description}</p>
								{/if}
								<p class="text-xs" style="color: var(--app-text-muted);">
									{usedForRole(role)}/{role.slot_count} {unitForRole(role)} filled
								</p>
								<div class="mt-1 space-y-1">
									{#each signupsForRole(role.id) as signup (signup.id)}
										<p class="text-xs" style="color: var(--app-text-muted);">
											{signup.user?.full_name || signup.user?.email || signup.user_id}
											{#if role.signup_mode === 'capacity'} · {signup.capacity_count} capacity{/if}
										</p>
									{/each}
								</div>
								{#if mySignupForRole(role.id)}
									<form method="POST" action="?/cancelSignup" class="mt-2">
										<input type="hidden" name="signup_id" value={mySignupForRole(role.id).id} />
										<Button variant="danger" size="sm">Cancel my slot</Button>
									</form>
								{:else if usedForRole(role) < role.slot_count}
									<form method="POST" action="?/signUp" class="mt-2 space-y-1">
										<input type="hidden" name="role_id" value={role.id} />
										{#if role.signup_mode === 'capacity'}
											<input
												type="number"
												min="1"
												max={Math.max(1, role.slot_count - usedForRole(role))}
												name="capacity_count"
												class="w-full rounded px-2 py-1 text-xs"
												style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
												placeholder="Capacity you can take"
												required
											/>
										{/if}
										<input name="notes" class="w-full rounded px-2 py-1 text-xs" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" placeholder="Optional notes" />
										<Button variant="primary" size="sm" type="submit">Sign up</Button>
									</form>
								{:else}
									<p class="mt-2 text-xs text-amber-200">Full</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</GlassCard>
	{:else}
		<p class="rounded border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">No carpool events published yet.</p>
	{/each}
</section>
