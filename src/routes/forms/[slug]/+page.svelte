<script lang="ts">
	let { data, form } = $props();
</script>

<section class="space-y-5">
	<div>
		<a href="/forms" class="text-xs text-slate-400">← Forms</a>
		<h1 class="text-2xl font-semibold">{data.form.name}</h1>
		{#if data.form.description}
			<p class="text-sm text-slate-300">{data.form.description}</p>
		{/if}
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Form submitted.</p>
	{/if}

	<form method="POST" action="?/submitForm" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		{#if data.form.template_drive_link}
			<a href={data.form.template_drive_link} target="_blank" rel="noreferrer" class="inline-flex rounded border border-sky-700 px-2 py-1 text-xs text-sky-200">
				Download template
			</a>
		{/if}
		<label class="flex flex-col gap-1 text-sm">
			<span>Cloud link to your completed PDF (required)</span>
			<input
				type="url"
				class="rounded bg-slate-800 px-2 py-2"
				name="cloud_link"
				placeholder="https://drive.google.com/file/d/.../view"
				required
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Attached external doc links (optional, one per line)</span>
			<textarea
				class="rounded bg-slate-800 px-2 py-2"
				rows="3"
				name="external_doc_links"
				placeholder="Paste signed Drive/Doc links here"
			></textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Notes (optional)</span>
			<textarea class="rounded bg-slate-800 px-2 py-2" rows="3" name="notes"></textarea>
		</label>
		<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Submit form</button>
	</form>

	{#if data.showSubmissions && (data.submissions ?? []).length > 0}
		<div class="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold">Your submissions</p>
				<p class="text-xs text-slate-400">{data.submissions.length} total</p>
			</div>
			<div class="space-y-2">
				{#each data.submissions as submission (submission.id)}
					<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
						<div class="flex items-start justify-between gap-3">
							<p class="text-xs text-slate-400">{new Date(submission.created_at).toLocaleString()}</p>
							<span class="rounded bg-slate-800 px-2 py-0.5 text-xs uppercase">{submission.status}</span>
						</div>
						{#if submission.review_notes}
							<p class="mt-2 text-xs text-slate-300">Review notes: {submission.review_notes}</p>
						{/if}
						{#if submission.cloud_link}
							<a class="mt-2 inline-flex rounded border border-slate-700 px-2 py-1 text-xs text-sky-200" href={submission.cloud_link} target="_blank" rel="noreferrer">Open submitted cloud link</a>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
