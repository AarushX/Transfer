<script lang="ts">
	let { data, form } = $props();
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parent Portal</p>
		<h1 class="text-2xl font-semibold">{data.form.name}</h1>
		<p class="text-sm text-slate-400">Submitting for {data.selectedStudent.full_name || data.selectedStudent.email}</p>
	</header>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Submitted.</p>
	{/if}
	<form method="POST" action="?/submitForm" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<input type="hidden" name="student_user_id" value={data.selectedStudent.id} />
		<label class="block space-y-1 text-sm">
			<span class="text-slate-300">Cloud link</span>
			<input name="cloud_link" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" placeholder="https://drive.google.com/..." />
		</label>
		<label class="block space-y-1 text-sm">
			<span class="text-slate-300">External links (one per line)</span>
			<textarea name="external_doc_links" rows="3" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"></textarea>
		</label>
		<label class="block space-y-1 text-sm">
			<span class="text-slate-300">Notes</span>
			<textarea name="notes" rows="3" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"></textarea>
		</label>
		<div class="flex items-center gap-2">
			<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Submit for student</button>
			<a href={`/parent/forms?student=${data.selectedStudent.id}`} class="rounded border border-slate-700 px-3 py-2 text-sm">Back</a>
		</div>
	</form>
	{#if data.showSubmissions}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="mb-2 font-semibold">Submission History</h2>
			<ul class="space-y-2 text-sm">
				{#each data.submissions as submission}
					<li class="rounded border border-slate-700 bg-slate-950/40 p-2">
						<div class="flex items-center justify-between gap-2">
							<span>{submission.status}</span>
							<span class="text-xs text-slate-400">{new Date(submission.created_at).toLocaleString()}</span>
						</div>
					</li>
				{:else}
					<li class="text-slate-500">No submissions yet.</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
