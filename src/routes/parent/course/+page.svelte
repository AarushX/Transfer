<script lang="ts">
	let { data, form } = $props();
	const app = $derived((data.application?.application_payload ?? {}) as Record<string, string>);
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parent Course</p>
		<h1 class="text-2xl font-semibold">WRT 2026-27 Parent Application Course</h1>
		<p class="text-sm text-slate-400">This is a parent-only course track with content, video, quiz checks, and a final application submission for admin approval.</p>
	</header>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	<form method="POST" action="?/submitForApproval" class="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="rounded border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold">Module 1 · Parent Letter & Expectations</p>
			<p class="mt-1 text-xs text-slate-400">Parental involvement is essential; participation is required for team acceptance and continued participation.</p>
			<label class="mt-3 block space-y-1 text-sm">
				<span>I&apos;ve read the introductory letter for parents.</span>
				<select name="intro_read" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">
					<option value="">Select</option>
					<option value="yes" selected={app.intro_read === 'yes'}>Yes</option>
					<option value="no" selected={app.intro_read === 'no'}>No</option>
				</select>
			</label>
		</div>

		<div class="rounded border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold">Video Block</p>
			<div class="mt-2 aspect-video overflow-hidden rounded border border-slate-700">
				<iframe
					class="h-full w-full"
					src="https://www.youtube.com/embed/dQw4w9WgXcQ"
					title="Parent orientation video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		</div>

		<div class="rounded border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold">Module 2 · Quick Quiz Checkpoints</p>
			<label class="mt-2 block space-y-1 text-sm">
				<span>Walton Robotics is a competitive team with significant parent volunteer expectations.</span>
				<select name="quiz_commitment" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">
					<option value="">Select</option>
					<option value="yes" selected={app.quiz_commitment === 'yes'}>Yes</option>
					<option value="no" selected={app.quiz_commitment === 'no'}>No</option>
				</select>
			</label>
			<label class="mt-2 block space-y-1 text-sm">
				<span>Students are expected to attend all competitions, including possible spring break overlap.</span>
				<select name="quiz_competitions" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">
					<option value="">Select</option>
					<option value="yes" selected={app.quiz_competitions === 'yes'}>Yes</option>
					<option value="no" selected={app.quiz_competitions === 'no'}>No</option>
				</select>
			</label>
		</div>

		<div class="rounded border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold">Video Block</p>
			<div class="mt-2 aspect-video overflow-hidden rounded border border-slate-700">
				<iframe
					class="h-full w-full"
					src="https://www.youtube.com/embed/ysz5S6PUM-U"
					title="Volunteer overview video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		</div>

		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm"><span>Student FIRST name</span><input name="student_first_name" required value={app.student_first_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Student LAST name</span><input name="student_last_name" required value={app.student_last_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Parent FIRST name</span><input name="parent_first_name" required value={app.parent_first_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Parent LAST name</span><input name="parent_last_name" required value={app.parent_last_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Parent relationship</span><input name="relationship" required value={data.application?.relationship ?? app.relationship ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Parent phone</span><input name="phone" required value={data.application?.phone ?? app.phone ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span>Parent email signature</span><input name="parent_signature_email" type="email" required value={app.parent_signature_email ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span>Student email signature</span><input name="student_signature_email" type="email" required value={app.student_signature_email ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
		</div>

		<div class="space-y-2 rounded border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold">Volunteer Commitments (choose at least 3 yes/maybe)</p>
			{#each [
				['volunteer_host_field_practice', 'Host 3 evenings of field practice for other teams'],
				['volunteer_field_build_12_hours', 'Participate in at least 12 hours of field build'],
				['volunteer_plan_team_travel', 'Plan team travel details'],
				['volunteer_chaperone_trip', 'Serve as a chaperone for an out of town trip'],
				['volunteer_transport_competitions', 'Provide transportation for two competitions'],
				['volunteer_team_mentor', 'Serve as a team mentor in your expertise area'],
				['volunteer_supervise_team_meetings', 'Supervise 3 evenings of team meetings'],
				['volunteer_outreach_activities', 'Take part in 3 outreach activities'],
				['volunteer_provide_food', 'Provide food/drinks on at least 3 occasions']
			] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center">
					<span>{label}</span>
					<select name={key} required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">
						<option value="">Select</option>
						<option value="yes" selected={app[key] === 'yes'}>Yes</option>
						<option value="no" selected={app[key] === 'no'}>No</option>
						<option value="maybe" selected={app[key] === 'maybe'}>Maybe - contact me</option>
					</select>
				</label>
			{/each}
		</div>

		<label class="block space-y-1 text-sm">
			<span>Skills / talents / equipment / relationships</span>
			<textarea name="skills_and_relationships" rows="4" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">{app.skills_and_relationships ?? ''}</textarea>
		</label>
		<label class="block space-y-1 text-sm">
			<span>Other ways you can help Walton Robotics</span>
			<textarea name="other_help_text" rows="3" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">{app.other_help_text ?? ''}</textarea>
		</label>
		<label class="block space-y-1 text-sm">
			<span>Additional notes</span>
			<textarea name="notes" rows="3" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">{data.application?.notes ?? ''}</textarea>
		</label>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-xs text-slate-400">Current status: {data.application?.status ?? 'not started'}</p>
			<div class="flex gap-2">
				<button formaction="?/saveDraft" class="rounded border border-slate-700 px-3 py-2 text-sm">Save draft</button>
				<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Submit for admin approval</button>
			</div>
		</div>
	</form>
</section>
