<script lang="ts">
	let { data, form } = $props();
	const status = $derived(String(data.application?.status ?? 'not_started'));
	const approved = $derived(status === 'approved');
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parent Portal</p>
		<h1 class="text-2xl font-semibold">Parent Dashboard</h1>
	</header>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}
	<div class="grid gap-4 md:grid-cols-3">
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="text-xs uppercase tracking-wide text-slate-500">Parent Course</p>
			<p class="mt-2 text-sm text-slate-300">WRT 2026-27 Parent Application Course</p>
			<p class="mt-2 text-xs text-slate-400">Status: {status.replace('_', ' ')}</p>
			<a href="/parent/course" class="mt-3 inline-block rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Open Course</a>
		</div>
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4 md:col-span-2">
			<p class="text-xs uppercase tracking-wide text-slate-500">Link Student Account</p>
			<p class="mt-2 text-sm text-slate-300">Available after admin approval.</p>
			<form method="POST" action="?/linkStudentByCode" class="mt-3 flex flex-wrap items-center gap-2">
				<input
					name="code"
					required={approved}
					disabled={!approved}
					class="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm uppercase disabled:opacity-50"
					placeholder="AB12CD34"
				/>
				<button disabled={!approved} class="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">
					Link student
				</button>
			</form>
			<ul class="mt-3 space-y-1 text-sm text-slate-300">
				{#each data.linkedStudents as student}
					<li>{student.full_name || student.email}</li>
				{:else}
					<li class="text-slate-500">No linked students yet.</li>
				{/each}
			</ul>
		</div>
	</div>
</section>
