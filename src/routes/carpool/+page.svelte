<script lang="ts">
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
		<a href="/dashboard" class="text-xs text-slate-400">← Dashboard</a>
		<h1 class="text-2xl font-semibold">Carpool Volunteering</h1>
		<p class="text-sm text-slate-400">Sign up for day-specific transport and chaperone slots.</p>
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	{#each data.events as event (event.id)}
		<article class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<div>
				<h2 class="text-lg font-semibold">{event.title}</h2>
				{#if event.description}<p class="text-sm text-slate-300">{event.description}</p>{/if}
			</div>
			{#each (data.days ?? []).filter((d) => d.event_id === event.id) as day (day.id)}
				<div class="space-y-2 rounded border border-slate-800 bg-slate-950/60 p-3">
					<p class="font-medium">{day.day_date} {day.label ? `- ${day.label}` : ''}</p>
					{#if day.notes}<p class="text-xs text-slate-400">{day.notes}</p>{/if}
					<div class="grid gap-2 md:grid-cols-2">
						{#each (data.roles ?? []).filter((r) => r.day_id === day.id) as role (role.id)}
							<div class="rounded border border-slate-800 bg-slate-900/60 p-2">
								<p class="text-sm font-medium">{role.role_label}</p>
								{#if role.role_description}
									<p class="text-xs text-slate-300">{role.role_description}</p>
								{/if}
								<p class="text-xs text-slate-400">
									{usedForRole(role)}/{role.slot_count} {unitForRole(role)} filled
								</p>
								<div class="mt-1 space-y-1">
									{#each signupsForRole(role.id) as signup (signup.id)}
										<p class="text-xs text-slate-300">
											{signup.user?.full_name || signup.user?.email || signup.user_id}
											{#if role.signup_mode === 'capacity'} · {signup.capacity_count} capacity{/if}
										</p>
									{/each}
								</div>
								{#if mySignupForRole(role.id)}
									<form method="POST" action="?/cancelSignup" class="mt-2">
										<input type="hidden" name="signup_id" value={mySignupForRole(role.id).id} />
										<button class="rounded border border-red-700 px-2 py-1 text-xs text-red-200">Cancel my slot</button>
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
												class="w-full rounded bg-slate-800 px-2 py-1 text-xs"
												placeholder="Capacity you can take"
												required
											/>
										{/if}
										<input name="notes" class="w-full rounded bg-slate-800 px-2 py-1 text-xs" placeholder="Optional notes" />
										<button class="rounded bg-yellow-400 px-2 py-1 text-xs font-semibold text-slate-900">Sign up</button>
									</form>
								{:else}
									<p class="mt-2 text-xs text-amber-200">Full</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</article>
	{:else}
		<p class="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">No carpool events published yet.</p>
	{/each}
</section>
