<script lang="ts">
	let { data, form } = $props();
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">Parent Application Approvals</h1>
	<p class="text-sm text-slate-400">Approve parent onboarding course submissions before they can link students and access forms/carpool.</p>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}
	<div class="space-y-3">
		{#each data.applications as app}
			<div class="rounded-xl border border-slate-800 bg-slate-900 p-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<p class="font-semibold">{app.parent?.full_name || app.parent?.email || app.parent_user_id}</p>
						<p class="text-xs text-slate-400">{app.parent?.email} · {app.relationship || '—'} · {app.phone || '—'}</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="rounded border border-slate-700 px-2 py-1 text-xs uppercase">{app.status}</span>
					</div>
				</div>
				<div class="mt-3 rounded border border-slate-800 bg-slate-950/40 p-2">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed Parent Courses</p>
					{#each app.completedCourses as completion}
						<p class="mt-1 text-sm text-slate-300">
							{completion.nodes?.title || 'Parent Application'}
							<span class="text-xs text-slate-500">
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
						<p class="mt-1 text-sm text-slate-500">No completed parent-application course yet.</p>
					{/each}
				</div>
				<div class="mt-2 flex gap-2">
					<form method="POST" action="?/setStatus">
						<input type="hidden" name="id" value={app.id} />
						<input type="hidden" name="status" value="approved" />
						<button class="rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-white">Approve</button>
					</form>
					<form method="POST" action="?/setStatus">
						<input type="hidden" name="id" value={app.id} />
						<input type="hidden" name="status" value="rejected" />
						<button class="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">Reject</button>
					</form>
					<form method="POST" action="?/setStatus">
						<input type="hidden" name="id" value={app.id} />
						<input type="hidden" name="status" value="submitted" />
						<button class="rounded border border-slate-700 px-2 py-1 text-xs">Mark Submitted</button>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm text-slate-500">No parent applications found.</p>
		{/each}
	</div>
</section>
