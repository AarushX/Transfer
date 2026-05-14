<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
</script>

<section class="space-y-5">
	<div>
		<a href="/forms" class="text-xs" style="color: var(--app-text-muted);">← Forms</a>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">{data.form.name}</h1>
		{#if data.form.description}
			<p class="text-sm" style="color: var(--app-text-muted);">{data.form.description}</p>
		{/if}
	</div>

	{#if form?.error}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Form submitted.</p>
	{/if}

	<form method="POST" action="?/submitForm" class="space-y-3 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		{#if data.form.template_drive_link}
			<a href={data.form.template_drive_link} target="_blank" rel="noreferrer" class="inline-flex rounded border px-2 py-1 text-xs" style="border-color: color-mix(in srgb, var(--app-info) 50%, transparent); color: color-mix(in srgb, var(--app-info) 80%, white);">
				Download template
			</a>
		{/if}
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Cloud link to your completed PDF (required)</span>
			<input
				type="url"
				class="rounded px-2 py-2"
				style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
				name="cloud_link"
				placeholder="https://drive.google.com/file/d/.../view"
				required
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Attached external doc links (optional, one per line)</span>
			<textarea
				class="rounded px-2 py-2"
				style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
				rows="3"
				name="external_doc_links"
				placeholder="Paste signed Drive/Doc links here"
			></textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Notes (optional)</span>
			<textarea class="rounded px-2 py-2" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" rows="3" name="notes"></textarea>
		</label>
		<Button variant="primary" type="submit">Submit form</Button>
	</form>

	{#if data.showSubmissions && (data.submissions ?? []).length > 0}
		<div class="space-y-2 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold" style="color: var(--app-text);">Your submissions</p>
				<p class="text-xs" style="color: var(--app-text-muted);">{data.submissions.length} total</p>
			</div>
			<div class="space-y-2">
				{#each data.submissions as submission (submission.id)}
					<div class="rounded border p-3" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
						<div class="flex items-start justify-between gap-3">
							<p class="text-xs" style="color: var(--app-text-muted);">{new Date(submission.created_at).toLocaleString()}</p>
							<span class="rounded px-2 py-0.5 text-xs uppercase" style="background: var(--app-surface-alt); color: var(--app-text);">{submission.status}</span>
						</div>
						{#if submission.review_notes}
							<p class="mt-2 text-xs" style="color: var(--app-text-muted);">Review notes: {submission.review_notes}</p>
						{/if}
						{#if submission.cloud_link}
							<a class="mt-2 inline-flex rounded border px-2 py-1 text-xs" style="border-color: var(--app-glass-border); color: var(--app-link);" href={submission.cloud_link} target="_blank" rel="noreferrer">Open submitted cloud link</a>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
