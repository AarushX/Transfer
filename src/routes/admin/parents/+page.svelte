<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
</script>

<section class="space-y-5">
	<div class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Administration</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Parent Application Approvals</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Approve parent onboarding course submissions before they can link students and access forms/carpool.</p>
	</div>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}
	<div class="fade-up space-y-3" style="animation-delay: 0.05s;">
		{#each data.applications as app}
			<div class="rounded-2xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<p class="font-semibold" style="color: var(--app-text);">{app.parent?.full_name || app.parent?.email || app.parent_user_id}</p>
						<p class="text-xs" style="color: var(--app-text-muted);">{app.parent?.email} · {app.relationship || '—'} · {app.phone || '—'}</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider" style="border-color: var(--app-glass-border); color: var(--app-text);">{app.status}</span>
					</div>
				</div>
				<div class="mt-3 rounded-lg border p-2" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
					<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Completed Parent Courses</p>
					{#each app.completedCourses as completion}
						<p class="mt-1 text-sm" style="color: var(--app-text);">
							{completion.nodes?.title || 'Parent Application'}
							<span class="text-xs" style="color: var(--app-text-muted);">
								· {completion.completed_at
									? new Date(completion.completed_at).toLocaleString()
									: completion.quiz_passed_at
										? `quiz passed ${new Date(completion.quiz_passed_at).toLocaleString()}`
										: completion.status}
								{#if completion.quiz_score != null}
									· score {completion.quiz_score}%
								{/if}
							</span>
						</p>
					{:else}
						<p class="mt-1 text-sm" style="color: var(--app-text-muted);">No completed parent-application course yet.</p>
					{/each}
				</div>
				<div class="mt-2 flex gap-2">
					<form method="POST" action="?/setStatus">
						<input type="hidden" name="id" value={app.id} />
						<input type="hidden" name="status" value="approved" />
						<Button variant="primary" size="sm" type="submit">Approve</Button>
					</form>
					<form method="POST" action="?/setStatus">
						<input type="hidden" name="id" value={app.id} />
						<input type="hidden" name="status" value="rejected" />
						<Button variant="danger" size="sm" type="submit">Reject</Button>
					</form>
					<form method="POST" action="?/setStatus">
						<input type="hidden" name="id" value={app.id} />
						<input type="hidden" name="status" value="submitted" />
						<Button variant="secondary" size="sm" type="submit">Mark Submitted</Button>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm" style="color: var(--app-text-muted);">No parent applications found.</p>
		{/each}
	</div>
</section>
