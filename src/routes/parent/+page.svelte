<script lang="ts">
	let { data, form } = $props();
	const app = $derived((data.application?.application_payload ?? {}) as Record<string, string>);
	const approved = $derived(data.application?.status === 'approved');
</script>

<section class="space-y-6">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parent Portal</p>
		<h1 class="text-2xl font-semibold">WRT 2026-27 Parent Application Course</h1>
		<p class="text-sm text-slate-400">Complete this onboarding course application. Admin approval is required before linking students or using the parent portal.</p>
	</header>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-3 text-sm text-emerald-200">Saved.</p>
	{/if}

	<form method="POST" action="?/submitApplication" class="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
			<p class="font-semibold">Parental involvement is essential. Parent commitment is required for Walton Robotics participation.</p>
			<p class="mt-2 text-xs text-slate-400">Coach Heather Guiendon letter and expectations are included in this application course. You must review and acknowledge before submission.</p>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm">
				<span>I&apos;ve read the introductory letter</span>
				<select name="intro_read" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">
					<option value="">Select</option>
					<option value="yes" selected={app.intro_read === 'yes'}>Yes</option>
					<option value="no" selected={app.intro_read === 'no'}>No</option>
				</select>
			</label>
			<label class="space-y-1 text-sm">
				<span>Prospective interest meeting attendance</span>
				<select name="interest_meeting" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">
					<option value="">Select</option>
					<option value="yes" selected={app.interest_meeting === 'yes'}>Yes</option>
					<option value="no" selected={app.interest_meeting === 'no'}>No</option>
					<option value="na_returning" selected={app.interest_meeting === 'na_returning'}>Not Applicable (Returning Parent)</option>
				</select>
			</label>
			<label class="space-y-1 text-sm"><span>Student FIRST name</span><input name="student_first_name" required value={app.student_first_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Student LAST name</span><input name="student_last_name" required value={app.student_last_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Student grade in August</span><select name="student_grade_august" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"><option value="">Select</option><option value="9" selected={app.student_grade_august === '9'}>9</option><option value="10" selected={app.student_grade_august === '10'}>10</option><option value="11" selected={app.student_grade_august === '11'}>11</option><option value="12" selected={app.student_grade_august === '12'}>12</option></select></label>
			<label class="space-y-1 text-sm"><span>Team status</span><select name="team_status" required class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2"><option value="">Select</option><option value="rookie_2026_27" selected={app.team_status === 'rookie_2026_27'}>Rookie to Walton Robotics for 2026-27</option><option value="returning" selected={app.team_status === 'returning'}>Returning to Walton Robotics</option></select></label>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm"><span>Parent relationship</span><input name="relationship" required value={data.application?.relationship ?? app.relationship ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" placeholder="Parent / Guardian" /></label>
			<label class="space-y-1 text-sm"><span>Parent phone</span><input name="phone" required value={data.application?.phone ?? app.phone ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" placeholder="404.404.4040" /></label>
			<label class="space-y-1 text-sm"><span>Parent first name</span><input name="parent_first_name" required value={app.parent_first_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm"><span>Parent last name</span><input name="parent_last_name" required value={app.parent_last_name ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span>Parent email signature</span><input name="parent_signature_email" type="email" required value={app.parent_signature_email ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span>Student email signature</span><input name="student_signature_email" type="email" required value={app.student_signature_email ?? ''} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2" /></label>
		</div>
		<div class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold">Volunteer Choices (choose at least 3 Yes/Maybe)</p>
			{#each [
				['volunteer_host_field_practice', 'Host 3 evenings of field practice for other teams'],
				['volunteer_field_build_12_hours', 'Participate in at least 12 hours of field build'],
				['volunteer_plan_team_travel', 'Plan team travel details (transportation/meals/hotel)'],
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
			<span>Other ways you see yourself helping Walton Robotics</span>
			<textarea name="other_help_text" rows="3" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">{app.other_help_text ?? ''}</textarea>
		</label>
		<label class="block space-y-1 text-sm">
			<span>Additional notes</span>
			<textarea name="notes" rows="3" class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2">{data.application?.notes ?? ''}</textarea>
		</label>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-xs text-slate-400">Status: {data.application?.status ?? 'not submitted'} {#if data.application?.reviewed_at}(reviewed){/if}</p>
			<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Submit parent application course</button>
		</div>
	</form>

	<form method="POST" action="?/linkStudentByCode" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="font-semibold">Link Student Account</h2>
		<p class="text-xs text-slate-400">Admin approval is required before student linking is enabled.</p>
		<label class="block space-y-1 text-sm">
			<span class="text-slate-300">Student link code</span>
			<input name="code" required={!approved} disabled={!approved} class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 uppercase disabled:opacity-50" placeholder="AB12CD34" />
		</label>
		<button class="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50" disabled={!approved}>Link student</button>
		<div class="border-t border-slate-800 pt-3">
			<p class="text-xs uppercase tracking-wide text-slate-500">Linked students</p>
			<ul class="mt-2 space-y-1 text-sm text-slate-300">
				{#each data.linkedStudents as student}
					<li>{student.full_name || student.email}</li>
				{:else}
					<li class="text-slate-500">No linked students yet.</li>
				{/each}
			</ul>
		</div>
	</form>
</section>
