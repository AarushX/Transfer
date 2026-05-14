<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();
	const app = $derived((data.application?.application_payload ?? {}) as Record<string, string>);
	const gi = "w-full rounded-lg border px-3 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";
</script>

<section class="space-y-6">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Portal</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Parent Application Course</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Complete this onboarding course application to register for Walton Robotics.</p>
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-3 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-3 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<form method="POST" action="?/submitApplication" class="fade-up space-y-4 rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;">
		<div class="rounded-lg border p-3 text-sm" style="border-color: var(--app-glass-border); background: var(--app-surface-alt); color: var(--app-text);">
			<p class="font-semibold">Parental involvement is essential. Parent commitment is required for Walton Robotics participation.</p>
			<p class="mt-2 text-xs" style="color: var(--app-text-muted);">Coach Heather Guiendon letter and expectations are included in this application course. You must review and acknowledge before submission.</p>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">I&apos;ve read the introductory letter</span><select name="intro_read" required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app.intro_read === 'yes'}>Yes</option><option value="no" selected={app.intro_read === 'no'}>No</option></select></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Prospective interest meeting attendance</span><select name="interest_meeting" required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app.interest_meeting === 'yes'}>Yes</option><option value="no" selected={app.interest_meeting === 'no'}>No</option><option value="na_returning" selected={app.interest_meeting === 'na_returning'}>Not Applicable (Returning Parent)</option></select></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Student FIRST name</span><input name="student_first_name" required value={app.student_first_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Student LAST name</span><input name="student_last_name" required value={app.student_last_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Student grade in August</span><select name="student_grade_august" required class={gi} style={gs}><option value="">Select</option><option value="9" selected={app.student_grade_august === '9'}>9</option><option value="10" selected={app.student_grade_august === '10'}>10</option><option value="11" selected={app.student_grade_august === '11'}>11</option><option value="12" selected={app.student_grade_august === '12'}>12</option></select></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Team status</span><select name="team_status" required class={gi} style={gs}><option value="">Select</option><option value="rookie_2026_27" selected={app.team_status === 'rookie_2026_27'}>Rookie to Walton Robotics for 2026-27</option><option value="returning" selected={app.team_status === 'returning'}>Returning to Walton Robotics</option></select></label>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent relationship</span><input name="relationship" required value={data.application?.relationship ?? app.relationship ?? ''} class={gi} style={gs} placeholder="Parent / Guardian" /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent phone</span><input name="phone" required value={data.application?.phone ?? app.phone ?? ''} class={gi} style={gs} placeholder="404.404.4040" /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent first name</span><input name="parent_first_name" required value={app.parent_first_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent last name</span><input name="parent_last_name" required value={app.parent_last_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span style="color: var(--app-text);">Parent email signature</span><input name="parent_signature_email" type="email" required value={app.parent_signature_email ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span style="color: var(--app-text);">Student email signature</span><input name="student_signature_email" type="email" required value={app.student_signature_email ?? ''} class={gi} style={gs} /></label>
		</div>
		<div class="space-y-2 rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Volunteer Choices (choose at least 3 Yes/Maybe)</p>
			{#each [['volunteer_host_field_practice', 'Host 3 evenings of field practice for other teams'], ['volunteer_field_build_12_hours', 'Participate in at least 12 hours of field build'], ['volunteer_plan_team_travel', 'Plan team travel details (transportation/meals/hotel)'], ['volunteer_chaperone_trip', 'Serve as a chaperone for an out of town trip'], ['volunteer_transport_competitions', 'Provide transportation for two competitions'], ['volunteer_team_mentor', 'Serve as a team mentor in your expertise area'], ['volunteer_supervise_team_meetings', 'Supervise 3 evenings of team meetings'], ['volunteer_outreach_activities', 'Take part in 3 outreach activities'], ['volunteer_provide_food', 'Provide food/drinks on at least 3 occasions']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"><span style="color: var(--app-text);">{label}</span><select name={key} required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}>Yes</option><option value="no" selected={app[key] === 'no'}>No</option><option value="maybe" selected={app[key] === 'maybe'}>Maybe - contact me</option></select></label>
			{/each}
		</div>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Skills / talents / equipment / relationships</span><textarea name="skills_and_relationships" rows="4" class={gi} style={gs}>{app.skills_and_relationships ?? ''}</textarea></label>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Other ways you see yourself helping Walton Robotics</span><textarea name="other_help_text" rows="3" class={gi} style={gs}>{app.other_help_text ?? ''}</textarea></label>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Additional notes</span><textarea name="notes" rows="3" class={gi} style={gs}>{data.application?.notes ?? ''}</textarea></label>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-xs" style="color: var(--app-text-muted);">Status: {data.application?.status ?? 'not submitted'} {#if data.application?.reviewed_at}(reviewed){/if}</p>
			<Button variant="primary" type="submit">Submit parent application course</Button>
		</div>
	</form>

	<GlassCard title="Link Student Account" subtitle="Enter the link code from your student's profile to connect accounts.">
		<form method="POST" action="?/linkStudentByCode" class="space-y-3">
			<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Student link code</span><input name="code" required class={gi + " uppercase"} style={gs} placeholder="AB12CD34" /></label>
			<button class="rounded-lg px-3 py-2 text-sm font-semibold" style="background: var(--app-button-secondary-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-button-secondary-border);">Link student</button>
			<div class="border-t pt-3" style="border-color: var(--app-glass-border);">
				<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Linked students</p>
				<ul class="mt-2 space-y-1 text-sm" style="color: var(--app-text);">
					{#each data.linkedStudents as student}
						<li>{student.full_name || student.email}</li>
					{:else}
						<li style="color: var(--app-text-muted);">No linked students yet.</li>
					{/each}
				</ul>
			</div>
		</form>
	</GlassCard>
</section>
