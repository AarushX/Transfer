<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	const gi = "w-full rounded-lg border px-3 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";
</script>

<section class="space-y-4">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Portal</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">{data.form.name}</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Submitting for {data.selectedStudent.full_name || data.selectedStudent.email}</p>
	</header>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Submitted.</p>
	{/if}
	<form method="POST" action="?/submitForm" class="fade-up space-y-3 rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;">
		<input type="hidden" name="student_user_id" value={data.selectedStudent.id} />
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Cloud link</span><input name="cloud_link" required class={gi} style={gs} placeholder="https://drive.google.com/..." /></label>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">External links (one per line)</span><textarea name="external_doc_links" rows="3" class={gi} style={gs}></textarea></label>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Notes</span><textarea name="notes" rows="3" class={gi} style={gs}></textarea></label>
		<div class="flex items-center gap-2">
			<Button variant="primary" type="submit">Submit for student</Button>
			<Button variant="ghost" href={`/parent/forms?student=${data.selectedStudent.id}`}>Back</Button>
		</div>
	</form>
	{#if data.showSubmissions}
		<GlassCard title="Submission History">
			<ul class="space-y-2 text-sm">
				{#each data.submissions as submission}
					<li class="rounded-lg border p-2" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						<div class="flex items-center justify-between gap-2">
							<span style="color: var(--app-text);">{submission.status}</span>
							<span class="text-xs" style="color: var(--app-text-muted);">{new Date(submission.created_at).toLocaleString()}</span>
						</div>
					</li>
				{:else}
					<li style="color: var(--app-text-muted);">No submissions yet.</li>
				{/each}
			</ul>
		</GlassCard>
	{/if}
</section>
