<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();
	const selectedStudentId = $derived(String(data.selectedStudent?.id ?? ''));
	const dayById = $derived(new Map((data.days ?? []).map((d: any) => [String(d.id), d])));
	const rolesByDay = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const role of data.roles ?? []) { const key = String(role.day_id); const list = map.get(key) ?? []; list.push(role); map.set(key, list); }
		return map;
	});
	const signupsByRole = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const signup of data.signups ?? []) { const key = String(signup.role_id); const list = map.get(key) ?? []; list.push(signup); map.set(key, list); }
		return map;
	});

	const gi = "rounded-lg border px-3 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide" style="color: var(--app-text-muted);">Parent Portal</p>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Carpool</h1>
	</header>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{/if}
	<form method="GET" class="rounded-xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<label class="text-sm">
			<span class="mb-1 block" style="color: var(--app-text);">Student</span>
			<select name="student" class={"w-full " + gi} style={gs} onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}>
				{#each data.students as student}
					<option value={student.id} selected={student.id === selectedStudentId}>{student.full_name || student.email}</option>
				{/each}
			</select>
		</label>
	</form>

	{#if !data.selectedStudent}
		<p class="rounded-xl border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">Link a student first in the parent portal home page.</p>
	{:else}
		{#each data.days as day}
			<GlassCard>
				<h2 class="font-semibold" style="color: var(--app-text);">{day.label || day.day_date}</h2>
				{#each rolesByDay.get(String(day.id)) ?? [] as role}
					<div class="mt-2 rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						<div class="mb-2 flex items-center justify-between gap-2">
							<p class="text-sm font-medium" style="color: var(--app-text);">{role.role_label}</p>
							<span class="text-xs" style="color: var(--app-text-muted);">{(signupsByRole.get(String(role.id)) ?? []).length}/{role.slot_count}</span>
						</div>
						{#if (signupsByRole.get(String(role.id)) ?? []).some((row: any) => String(row.user_id) === selectedStudentId)}
							<form method="POST" action="?/cancelSignup">
								<input type="hidden" name="student_user_id" value={selectedStudentId} />
								<input type="hidden" name="signup_id" value={(signupsByRole.get(String(role.id)) ?? []).find((row: any) => String(row.user_id) === selectedStudentId)?.id} />
								<Button variant="secondary" size="sm" type="submit">Cancel for student</Button>
							</form>
						{:else}
							<form method="POST" action="?/signUp" class="flex flex-wrap items-center gap-2">
								<input type="hidden" name="student_user_id" value={selectedStudentId} />
								<input type="hidden" name="role_id" value={role.id} />
								<input name="notes" class={gi + " text-xs"} style={gs} placeholder="Notes (optional)" />
								<Button variant="primary" size="sm" type="submit">Sign up student</Button>
							</form>
						{/if}
					</div>
				{/each}
			</GlassCard>
		{/each}
	{/if}
</section>
