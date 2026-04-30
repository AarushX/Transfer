<script lang="ts">
	let { data, form } = $props();
	const formTypeById = new Map((data.formTypes ?? []).map((t: any) => [String(t.id), t]));
</script>

<section class="space-y-4">
	<div>
		<h1 class="text-2xl font-semibold">Forms</h1>
		<p class="text-sm text-slate-400">Upload and manage your submitted forms.</p>
	</div>

	<div class="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
		<h2 class="mb-2 text-lg font-semibold">Surveys</h2>
		<div class="space-y-2">
			{#each data.surveys as survey (survey.id)}
				<a
					href={`/surveys/${survey.slug}`}
					class="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm hover:border-slate-500"
				>
					<div class="min-w-0">
						<p class="truncate font-medium">{survey.title}</p>
						{#if survey.description}
							<p class="truncate text-xs text-slate-400">{survey.description}</p>
						{/if}
					</div>
					<div class="text-right text-xs">
						{#if survey.submittedAt}
							<p class="text-emerald-300">Submitted</p>
						{:else if survey.canOpen}
							<p class="text-yellow-300">Open</p>
						{:else}
							<p class="text-slate-400">
								Locked ({survey.missingCount} prereq{survey.missingCount === 1 ? '' : 's'})
							</p>
						{/if}
					</div>
				</a>
			{:else}
				<p class="text-sm text-slate-400">No surveys available right now.</p>
			{/each}
		</div>
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Form submitted.</p>
	{/if}

	<form method="POST" action="?/submitForm" enctype="multipart/form-data" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span>Form type</span>
			<select name="form_type_id" class="rounded bg-slate-800 px-2 py-2" required>
				<option value="">Select a form...</option>
				{#each data.formTypes as type (type.id)}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Notes (optional)</span>
			<textarea name="notes" rows="3" class="rounded bg-slate-800 px-2 py-2"></textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Upload file (max 10MB)</span>
			<input type="file" name="file" class="rounded bg-slate-800 px-2 py-2" required />
		</label>
		<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Submit form</button>
	</form>

	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="mb-2 text-lg font-semibold">My submissions</h2>
		<div class="space-y-2">
			{#each data.submissions as row (row.id)}
				<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="font-medium">{formTypeById.get(String(row.form_type_id))?.name || row.form_type_id}</p>
						<span class="rounded bg-slate-800 px-2 py-0.5 text-xs">{row.status}</span>
					</div>
					<p class="text-xs text-slate-400">Submitted {new Date(row.created_at).toLocaleString()}</p>
					<p class="text-sm">{row.file_name}</p>
					{#if row.notes}<p class="text-sm text-slate-300">{row.notes}</p>{/if}
					{#if row.review_notes}<p class="mt-1 text-xs text-sky-200">Review notes: {row.review_notes}</p>{/if}
				</div>
			{:else}
				<p class="text-sm text-slate-400">No submissions yet.</p>
			{/each}
		</div>
	</div>
</section>
