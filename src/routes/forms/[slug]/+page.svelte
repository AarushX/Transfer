<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();

	const statusChip = (status: string) => {
		switch (status?.toLowerCase()) {
			case 'approved': return 'chip-emerald';
			case 'rejected': return 'chip-rose';
			case 'pending': return 'chip-amber';
			default: return 'chip-violet';
		}
	};
</script>

<section class="space-y-6">
	<header class="fade-up">
		<a href="/forms" class="text-xs transition-colors" style="color: var(--app-text-dim);">← Forms</a>
		<h1 class="mt-1 text-3xl font-semibold tracking-tight gradient-text">{data.form.name}</h1>
		{#if data.form.description}
			<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">{data.form.description}</p>
		{/if}
	</header>

	{#if form?.error}
		<div class="fade-up rounded-2xl border p-3 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 12%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">
			{form.error}
		</div>
	{:else if form?.ok}
		<div class="fade-up rounded-2xl border p-3 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 40%, transparent); background: color-mix(in srgb, var(--app-success) 12%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">
			Form submitted.
		</div>
	{/if}

	<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 60ms;">
		<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
		<form method="POST" action="?/submitForm" class="relative space-y-4">
			<p class="eyebrow-label">Submit document</p>
			{#if data.form.template_drive_link}
				<a href={data.form.template_drive_link} target="_blank" rel="noreferrer" class="inline-flex rounded-full border px-3 py-1 text-xs font-medium chip-cyan transition-colors">
					Download template
				</a>
			{/if}
			<label class="flex flex-col gap-1.5 text-sm">
				<span style="color: var(--app-text);">Cloud link to your completed PDF (required)</span>
				<input
					type="url"
					class="rounded-xl px-3 py-2.5"
					style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
					name="cloud_link"
					placeholder="https://drive.google.com/file/d/.../view"
					required
				/>
			</label>
			<label class="flex flex-col gap-1.5 text-sm">
				<span style="color: var(--app-text);">Attached external doc links (optional, one per line)</span>
				<textarea
					class="rounded-xl px-3 py-2.5"
					style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
					rows="3"
					name="external_doc_links"
					placeholder="Paste signed Drive/Doc links here"
				></textarea>
			</label>
			<label class="flex flex-col gap-1.5 text-sm">
				<span style="color: var(--app-text);">Notes (optional)</span>
				<textarea class="rounded-xl px-3 py-2.5" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" rows="3" name="notes"></textarea>
			</label>
			<Button variant="primary" type="submit">Submit form</Button>
		</form>
	</div>

	{#if data.showSubmissions && (data.submissions ?? []).length > 0}
		<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 120ms;">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<div class="relative space-y-3">
				<div class="flex items-center justify-between">
					<p class="eyebrow-label">Your submissions</p>
					<span class="mono text-xs" style="color: var(--app-text-dim);">{data.submissions.length} total</span>
				</div>
				<div class="space-y-2">
					{#each data.submissions as submission, i (submission.id)}
						<div class="rounded-xl border p-3 transition-colors" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
							<div class="flex items-start justify-between gap-3">
								<span class="mono text-xs" style="color: var(--app-text-dim);">{new Date(submission.created_at).toLocaleString()}</span>
								<span class="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide {statusChip(submission.status)}">
									{submission.status}
								</span>
							</div>
							{#if submission.review_notes}
								<p class="mt-2 text-xs" style="color: var(--app-text-muted);">Review notes: {submission.review_notes}</p>
							{/if}
							{#if submission.cloud_link}
								<a class="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium chip-cyan transition-colors" href={submission.cloud_link} target="_blank" rel="noreferrer">Open submitted cloud link</a>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</section>
