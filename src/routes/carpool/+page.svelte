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

<section class="space-y-6">
	<header class="fade-up">
		<a href="/dashboard" class="text-xs transition-colors" style="color: var(--app-text-dim);">← Dashboard</a>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight gradient-text">Carpool Volunteering</h1>
		<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">Sign up for day-specific transport and chaperone slots.</p>
	</header>

	{#if form?.error}
		<div class="fade-up rounded-2xl border p-3 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 12%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">
			{form.error}
		</div>
	{:else if form?.ok}
		<div class="fade-up rounded-2xl border p-3 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 40%, transparent); background: color-mix(in srgb, var(--app-success) 12%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">
			Saved.
		</div>
	{/if}

	{#each data.events as event, ei (event.id)}
		<div class="fade-up" style="animation-delay: {60 + ei * 60}ms;">
			<GlassCard>
				<div>
					<h2 class="text-lg font-semibold" style="color: var(--app-text);">{event.title}</h2>
					{#if event.description}<p class="mt-1 text-sm" style="color: var(--app-text-muted);">{event.description}</p>{/if}
				</div>
				{#each (data.days ?? []).filter((d) => d.event_id === event.id) as day (day.id)}
					<div class="mt-4 space-y-3 rounded-xl border p-3" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
						<div>
							<p class="font-medium" style="color: var(--app-text);">{day.day_date} {day.label ? `- ${day.label}` : ''}</p>
							{#if day.notes}<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">{day.notes}</p>{/if}
						</div>
						<div class="grid gap-2 md:grid-cols-2">
							{#each (data.roles ?? []).filter((r) => r.day_id === day.id) as role (role.id)}
								<div class="relative overflow-hidden rounded-xl border p-3" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
									<div class="pointer-events-none absolute inset-0 rounded-xl" style="background: var(--app-glass-shine);"></div>
									<div class="relative">
										<div class="flex items-start justify-between gap-2">
											<p class="text-sm font-medium" style="color: var(--app-text);">{role.role_label}</p>
											<span class="mono inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium {usedForRole(role) >= role.slot_count ? 'chip-amber' : 'chip-emerald'}">
												{usedForRole(role)}/{role.slot_count}
											</span>
										</div>
										{#if role.role_description}
											<p class="mt-0.5 text-xs" style="color: var(--app-text-dim);">{role.role_description}</p>
										{/if}
										<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
											{usedForRole(role)}/{role.slot_count} {unitForRole(role)} filled
										</p>
										<div class="mt-1.5 space-y-1">
											{#each signupsForRole(role.id) as signup (signup.id)}
												<p class="text-xs" style="color: var(--app-text-muted);">
													{signup.user?.full_name || signup.user?.email || signup.user_id}
													{#if role.signup_mode === 'capacity'} <span class="mono"> · {signup.capacity_count} capacity</span>{/if}
												</p>
											{/each}
										</div>
										{#if mySignupForRole(role.id)}
											<form method="POST" action="?/cancelSignup" class="mt-3">
												<input type="hidden" name="signup_id" value={mySignupForRole(role.id).id} />
												<Button variant="danger" size="sm">Cancel my slot</Button>
											</form>
										{:else if usedForRole(role) < role.slot_count}
											<form method="POST" action="?/signUp" class="mt-3 space-y-1.5">
												<input type="hidden" name="role_id" value={role.id} />
												{#if role.signup_mode === 'capacity'}
													<input
														type="number"
														min="1"
														max={Math.max(1, role.slot_count - usedForRole(role))}
														name="capacity_count"
														class="w-full rounded-xl px-3 py-1.5 text-xs"
														style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
														placeholder="Capacity you can take"
														required
													/>
												{/if}
												<input name="notes" class="w-full rounded-xl px-3 py-1.5 text-xs" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" placeholder="Optional notes" />
												<Button variant="primary" size="sm" type="submit">Sign up</Button>
											</form>
										{:else}
											<p class="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium chip-amber">Full</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</GlassCard>
		</div>
	{:else}
		<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 60ms;">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<p class="relative text-sm" style="color: var(--app-text-muted);">No carpool events published yet.</p>
		</div>
	{/each}
</section>
