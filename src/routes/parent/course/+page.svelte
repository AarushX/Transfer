<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	const app = $derived((data.application?.application_payload ?? {}) as Record<string, string>);

	const gi = 'w-full rounded-lg border px-3 py-2 backdrop-blur-sm';
	const gs =
		'border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);';
</script>

<section class="space-y-4">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Course</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">Parent Application Course</span>
		</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			This is a parent-only course track with content, video, quiz checks, and a final application
			submission for admin approval.
		</p>
	</header>
	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}

	<form
		method="POST"
		action="?/submitForApproval"
		class="fade-up space-y-4 rounded-2xl border p-5 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;"
	>
		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Module 1 · Parent Letter & Expectations
			</p>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
				Parental involvement is essential; participation is required for team acceptance and
				continued participation.
			</p>
			<label class="mt-3 block space-y-1 text-sm"
				><span style="color: var(--app-text);"
					>I&apos;ve read the introductory letter for parents.</span
				><select name="intro_read" required class={gi} style={gs}
					><option value="">Select</option><option value="yes" selected={app.intro_read === 'yes'}
						>Yes</option
					><option value="no" selected={app.intro_read === 'no'}>No</option></select
				></label
			>
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">Video Block</p>
			<div
				class="mt-2 aspect-video overflow-hidden rounded-lg border"
				style="border-color: var(--app-glass-border);"
			>
				<iframe
					class="h-full w-full"
					src="https://www.youtube.com/embed/dQw4w9WgXcQ"
					title="Parent orientation video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Module 2 · Quick Quiz Checkpoints
			</p>
			<label class="mt-2 block space-y-1 text-sm"
				><span style="color: var(--app-text);"
					>Walton Robotics is a competitive team with significant parent volunteer expectations.</span
				><select name="quiz_commitment" required class={gi} style={gs}
					><option value="">Select</option><option
						value="yes"
						selected={app.quiz_commitment === 'yes'}>Yes</option
					><option value="no" selected={app.quiz_commitment === 'no'}>No</option></select
				></label
			>
			<label class="mt-2 block space-y-1 text-sm"
				><span style="color: var(--app-text);"
					>Students are expected to attend all competitions, including possible spring break
					overlap.</span
				><select name="quiz_competitions" required class={gi} style={gs}
					><option value="">Select</option><option
						value="yes"
						selected={app.quiz_competitions === 'yes'}>Yes</option
					><option value="no" selected={app.quiz_competitions === 'no'}>No</option></select
				></label
			>
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">Video Block</p>
			<div
				class="mt-2 aspect-video overflow-hidden rounded-lg border"
				style="border-color: var(--app-glass-border);"
			>
				<iframe
					class="h-full w-full"
					src="https://www.youtube.com/embed/ysz5S6PUM-U"
					title="Volunteer overview video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">Student Information</p>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Student FIRST name</span><input
						name="student_first_name"
						required
						value={app.student_first_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Student LAST name</span><input
						name="student_last_name"
						required
						value={app.student_last_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Student grade in August</span><select
						name="student_grade_august"
						required
						class={gi}
						style={gs}
						><option value="">Select</option><option
							value="9"
							selected={app.student_grade_august === '9'}>9</option
						><option value="10" selected={app.student_grade_august === '10'}>10</option><option
							value="11"
							selected={app.student_grade_august === '11'}>11</option
						><option value="12" selected={app.student_grade_august === '12'}>12</option></select
					></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Prospective interest meeting attendance</span
					><select name="interest_meeting" required class={gi} style={gs}
						><option value="">Select</option><option
							value="yes"
							selected={app.interest_meeting === 'yes'}>Yes</option
						><option value="no" selected={app.interest_meeting === 'no'}>No</option><option
							value="na_returning"
							selected={app.interest_meeting === 'na_returning'}
							>Not Applicable (Returning Parent)</option
						></select
					></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Team status</span><select
						name="team_status"
						required
						class={gi}
						style={gs}
						><option value="">Select</option><option
							value="rookie_2026_27"
							selected={app.team_status === 'rookie_2026_27'}
							>Rookie to Walton Robotics for 2026-27</option
						><option value="returning" selected={app.team_status === 'returning'}
							>Returning to Walton Robotics</option
						></select
					></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Rookie year on team</span><select
						name="rookie_year"
						required
						class={gi}
						style={gs}
						><option value="">Select</option><option
							value="2023"
							selected={app.rookie_year === '2023'}>2023</option
						><option value="2024" selected={app.rookie_year === '2024'}>2024</option><option
							value="2025"
							selected={app.rookie_year === '2025'}>2025</option
						><option value="2026" selected={app.rookie_year === '2026'}
							>2026 - My student will be a rookie this year!</option
						></select
					></label
				>
			</div>
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Parent/Guardian 1 Information
			</p>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">FIRST name</span><input
						name="parent_first_name"
						required
						value={app.parent_first_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">LAST name</span><input
						name="parent_last_name"
						required
						value={app.parent_last_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Relationship</span><input
						name="relationship"
						required
						value={data.application?.relationship ?? app.relationship ?? ''}
						class={gi}
						style={gs}
						placeholder="Parent / Guardian"
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Cell phone</span><input
						name="phone"
						required
						value={data.application?.phone ?? app.phone ?? ''}
						class={gi}
						style={gs}
						placeholder="404.404.4040"
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Email</span><input
						name="parent1_email"
						type="email"
						required
						value={app.parent1_email ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Occupation</span><input
						name="parent1_occupation"
						value={app.parent1_occupation ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Employer</span><input
						name="parent1_employer"
						value={app.parent1_employer ?? ''}
						class={gi}
						style={gs}
					/></label
				>
			</div>
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Parent/Guardian 2 Information
			</p>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
				Optional — fill in if a second parent/guardian is involved.
			</p>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">FIRST name</span><input
						name="parent2_first_name"
						value={app.parent2_first_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">LAST name</span><input
						name="parent2_last_name"
						value={app.parent2_last_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Cell phone</span><input
						name="parent2_phone"
						value={app.parent2_phone ?? ''}
						class={gi}
						style={gs}
						placeholder="404.404.4040"
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Email</span><input
						name="parent2_email"
						type="email"
						value={app.parent2_email ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Occupation</span><input
						name="parent2_occupation"
						value={app.parent2_occupation ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Employer</span><input
						name="parent2_employer"
						value={app.parent2_employer ?? ''}
						class={gi}
						style={gs}
					/></label
				>
			</div>
		</div>

		<div
			class="space-y-2 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Volunteer Commitments (choose at least 3 yes/maybe)
			</p>
			{#each [['volunteer_host_field_practice', 'Host 3 evenings of field practice for other teams'], ['volunteer_field_build_12_hours', 'Participate in at least 12 hours of field build'], ['volunteer_plan_team_travel', 'Plan team travel details (transportation, meals, hotel, etc.)'], ['volunteer_chaperone_trip', 'Serve as a chaperone for an out of town trip'], ['volunteer_transport_competitions', 'Provide team member transportation to two team competitions within driving distance'], ['volunteer_team_mentor', 'Serve as a team mentor in an area of your expertise'], ['volunteer_supervise_team_meetings', 'Supervise 3 evenings of team meetings'], ['volunteer_outreach_activities', 'Take part in 3 outreach activities'], ['volunteer_provide_food', 'Provide food on at least 3 occasions for the whole team']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"
					><span style="color: var(--app-text);">{label}</span><select
						name={key}
						required
						class={gi}
						style={gs}
						><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}
							>Yes</option
						><option value="no" selected={app[key] === 'no'}>No</option><option
							value="maybe"
							selected={app[key] === 'maybe'}>Maybe - contact me</option
						></select
					></label
				>
			{/each}
		</div>

		<div
			class="space-y-2 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Leadership (Returning Members ONLY)
			</p>
			<p class="text-xs" style="color: var(--app-text-muted);">Skip if your student is a rookie.</p>
			{#each [['leadership_parent_volunteer_coord', 'Parent volunteer coordination and parent communication'], ['leadership_sponsorships', 'Getting team sponsorships'], ['leadership_de_field_coordinator', 'DE field coordinator'], ['leadership_field_build_chair', 'Field build chair'], ['leadership_food_committee', 'Food committee chairperson'], ['leadership_banquet_chair', 'End of year banquet chairperson'], ['leadership_shadow_role', 'Shadow a role for future leadership']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"
					><span style="color: var(--app-text);">{label}</span><select
						name={key}
						class={gi}
						style={gs}
						><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}
							>Yes</option
						><option value="no" selected={app[key] === 'no'}>No</option><option
							value="maybe"
							selected={app[key] === 'maybe'}>Maybe - contact me</option
						></select
					></label
				>
			{/each}
		</div>

		<div
			class="space-y-2 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Skills / Talents / Interest Areas
			</p>
			{#each [['skills_fundraising', 'Fundraising'], ['skills_transport_equipment', 'Transportation for equipment'], ['skills_sponsorship_recruitment', 'Sponsorship - recruitment and relations'], ['skills_sponsor_team', 'I would like to sponsor the team!']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"
					><span style="color: var(--app-text);">{label}</span><select
						name={key}
						class={gi}
						style={gs}
						><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}
							>Yes!</option
						><option value="no" selected={app[key] === 'no'}>No</option><option
							value="maybe"
							selected={app[key] === 'maybe'}>Maybe - contact me</option
						></select
					></label
				>
			{/each}
		</div>

		<div
			class="space-y-2 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">Mentoring Interests</p>
			<p class="text-xs" style="color: var(--app-text-muted);">
				Select areas where you could mentor students.
			</p>
			{#each [['mentor_community_service', 'Community Service'], ['mentor_mechanical_electrical', 'Mechanical / Electrical'], ['mentor_programming', 'Programming'], ['mentor_cad', 'CAD'], ['mentor_communications', 'Communications'], ['mentor_financial_accounting', 'Financial Accounting'], ['mentor_photo_video', 'Photo/video'], ['mentor_business', 'Business'], ['mentor_event_planning', 'Event Planning'], ['mentor_travel_coordination', 'Travel Coordination'], ['mentor_public_speaking', 'Public Speaking'], ['mentor_graphics', 'Graphics'], ['mentor_open_field_mgmt', 'Open Field event management'], ['mentor_girls_first_mgmt', 'Girls FIRST event management'], ['mentor_summer_camps_mgmt', 'Summer Camps event management']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"
					><span style="color: var(--app-text);">{label}</span><select
						name={key}
						class={gi}
						style={gs}
						><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}
							>Yes!</option
						><option value="no" selected={app[key] === 'no'}>No</option><option
							value="maybe"
							selected={app[key] === 'maybe'}>Maybe - contact me</option
						></select
					></label
				>
			{/each}
		</div>

		<label class="block space-y-1 text-sm"
			><span style="color: var(--app-text);"
				>Other ways you see yourself helping Walton Robotics</span
			><textarea name="other_help_text" rows="3" class={gi} style={gs}
				>{app.other_help_text ?? ''}</textarea
			></label
		>

		<div
			class="space-y-2 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">
				Commitment Acknowledgements
			</p>
			<p class="text-xs" style="color: var(--app-text-muted);">
				Walton Robotics is a varsity-sport time commitment. Please confirm each statement.
			</p>
			{#each [['commit_competitive_team', 'Walton Robotics is a competitive team — not a club.'], ['commit_major_time', 'Involvement with Walton Robotics is a major commitment of time.'], ['commit_attend_competitions', 'Students are EXPECTED to attend all team competitions.'], ['commit_parent_involvement', 'Parent involvement is REQUIRED.'], ['commit_follow_rules', 'Students and parents are expected to follow ALL team rules, including those established for travel.']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"
					><span style="color: var(--app-text);">{label}</span><select
						name={key}
						required
						class={gi}
						style={gs}
						><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}
							>Yes!</option
						><option value="no" selected={app[key] === 'no'}
							>No - probably not the team for you</option
						></select
					></label
				>
			{/each}
		</div>

		<div
			class="rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">Signatures</p>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Student name (typed signature)</span><input
						name="student_signature_name"
						required
						value={app.student_signature_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Student email (typed signature)</span><input
						name="student_signature_email"
						type="email"
						required
						value={app.student_signature_email ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Date student signed</span><input
						name="student_signature_date"
						type="date"
						required
						value={app.student_signature_date ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<div></div>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Parent name (typed signature)</span><input
						name="parent_signature_name"
						required
						value={app.parent_signature_name ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Parent email (typed signature)</span><input
						name="parent_signature_email"
						type="email"
						required
						value={app.parent_signature_email ?? ''}
						class={gi}
						style={gs}
					/></label
				>
				<label class="space-y-1 text-sm"
					><span style="color: var(--app-text);">Date parent signed</span><input
						name="parent_signature_date"
						type="date"
						required
						value={app.parent_signature_date ?? ''}
						class={gi}
						style={gs}
					/></label
				>
			</div>
		</div>

		<label class="block space-y-1 text-sm"
			><span style="color: var(--app-text);">Additional notes</span><textarea
				name="notes"
				rows="3"
				class={gi}
				style={gs}>{data.application?.notes ?? ''}</textarea
			></label
		>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-xs" style="color: var(--app-text-muted);">
				Current status: {data.application?.status ?? 'not started'}
			</p>
			<div class="flex gap-2">
				<button
					type="submit"
					formaction="?/saveDraft"
					class="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium backdrop-blur-sm"
					style="background: var(--app-glass-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-glass-border);"
					>Save draft</button
				>
				<Button variant="primary" type="submit">Submit for admin approval</Button>
			</div>
		</div>
	</form>
</section>
