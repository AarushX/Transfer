<script lang="ts">
	let { data } = $props();
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parent Portal</p>
		<h1 class="text-2xl font-semibold">Forms</h1>
	</header>
	<form method="GET" class="rounded-xl border border-slate-800 bg-slate-900 p-3">
		<label class="text-sm">
			<span class="mb-1 block text-slate-300">Student</span>
			<select name="student" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" onchange={(event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit()}>
				{#each data.students as student}
					<option value={student.id} selected={student.id === data.selectedStudent?.id}>{student.full_name || student.email}</option>
				{/each}
			</select>
		</label>
	</form>
	{#if !data.selectedStudent}
		<p class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Link a student first in the parent portal home page.</p>
	{:else}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="mb-2 text-sm text-slate-300">Managing forms for {data.selectedStudent.full_name || data.selectedStudent.email}</p>
			<ul class="space-y-2">
				{#each data.forms as form}
					<li class="rounded border border-slate-700 bg-slate-950/40 p-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-medium">{form.name}</p>
								<p class="text-xs text-slate-400">{form.description}</p>
							</div>
							<a class="rounded bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-slate-900" href={`/parent/forms/${form.slug}?student=${data.selectedStudent.id}`}>Open</a>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
