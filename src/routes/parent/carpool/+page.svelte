<script lang="ts">
	let { data, form } = $props();
	const selectedStudentId = $derived(String(data.selectedStudent?.id ?? ''));
	const dayById = $derived(new Map((data.days ?? []).map((d: any) => [String(d.id), d])));
	const rolesByDay = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const role of data.roles ?? []) {
			const key = String(role.day_id);
			const list = map.get(key) ?? [];
			list.push(role);
			map.set(key, list);
		}
		return map;
	});
	const signupsByRole = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const signup of data.signups ?? []) {
			const key = String(signup.role_id);
			const list = map.get(key) ?? [];
			list.push(signup);
			map.set(key, list);
		}
		return map;
	});
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parent Portal</p>
		<h1 class="text-2xl font-semibold">Carpool</h1>
	</header>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}
	<form method="GET" class="rounded-xl border border-slate-800 bg-slate-900 p-3">
		<label class="text-sm">
			<span class="mb-1 block text-slate-300">Student</span>
			<select
				name="student"
				class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"
				onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
			>
				{#each data.students as student}
					<option value={student.id} selected={student.id === selectedStudentId}>{student.full_name || student.email}</option>
				{/each}
			</select>
		</label>
	</form>

	{#if !data.selectedStudent}
		<p class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Link a student first in the parent portal home page.</p>
	{:else}
		{#each data.days as day}
			<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
				<h2 class="font-semibold">{day.label || day.day_date}</h2>
				{#each rolesByDay.get(String(day.id)) ?? [] as role}
					<div class="rounded border border-slate-700 bg-slate-950/40 p-3">
						<div class="mb-2 flex items-center justify-between gap-2">
							<p class="text-sm font-medium">{role.role_label}</p>
							<span class="text-xs text-slate-400">{(signupsByRole.get(String(role.id)) ?? []).length}/{role.slot_count}</span>
						</div>
						{#if (signupsByRole.get(String(role.id)) ?? []).some((row: any) => String(row.user_id) === selectedStudentId)}
							<form method="POST" action="?/cancelSignup">
								<input type="hidden" name="student_user_id" value={selectedStudentId} />
								<input type="hidden" name="signup_id" value={(signupsByRole.get(String(role.id)) ?? []).find((row: any) => String(row.user_id) === selectedStudentId)?.id} />
								<button class="rounded border border-slate-700 px-3 py-1.5 text-xs">Cancel for student</button>
							</form>
						{:else}
							<form method="POST" action="?/signUp" class="flex flex-wrap items-center gap-2">
								<input type="hidden" name="student_user_id" value={selectedStudentId} />
								<input type="hidden" name="role_id" value={role.id} />
								<input name="notes" class="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs" placeholder="Notes (optional)" />
								<button class="rounded bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-slate-900">Sign up student</button>
							</form>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	{/if}
</section>
