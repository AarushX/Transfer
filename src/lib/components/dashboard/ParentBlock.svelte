<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form }: { data: any; form: any } = $props();
</script>

<!-- Parent linking card -->
<div class="fade-up rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Linking</p>
			<p class="text-sm" style="color: var(--app-text-muted);">
				Enter the student-generated link code from their profile to connect accounts.
			</p>
		</div>
	</div>
	{#if form?.error}
		<p class="mt-2 rounded-xl border p-2 text-sm" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">
			{form.error}
		</p>
	{:else if form?.ok && form?.section === 'parent-link'}
		<p class="mt-2 rounded-xl border p-2 text-sm" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); border-color: color-mix(in srgb, var(--app-success) 40%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">
			Student linked successfully.
		</p>
	{/if}
	<form method="POST" action="?/linkStudentByCode" class="mt-3 flex flex-wrap items-center gap-2">
		<input
			name="code"
			required
			class="rounded-xl border px-3 py-2 text-sm uppercase backdrop-blur-sm"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
			placeholder="AB12CD34"
		/>
		<Button variant="primary" size="sm" type="submit">Link student</Button>
	</form>
	<div class="mt-3 space-y-1">
		<p class="eyebrow-label">Linked students</p>
		{#each data.linkedStudents ?? [] as student}
			<p class="text-sm" style="color: var(--app-text-muted);">{student.full_name || student.email}</p>
		{:else}
			<p class="text-sm" style="color: var(--app-text-dim, var(--app-text-muted));">No linked students yet.</p>
		{/each}
	</div>
</div>
