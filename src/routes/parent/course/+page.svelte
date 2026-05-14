<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	const app = $derived((data.application?.application_payload ?? {}) as Record<string, string>);

	const gi = "w-full rounded-lg border px-3 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";
</script>

<section class="space-y-4">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Course</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Parent Application Course</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">This is a parent-only course track with content, video, quiz checks, and a final application submission for admin approval.</p>
	</header>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<form method="POST" action="?/submitForApproval" class="fade-up space-y-4 rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;">
		<div class="rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Module 1 · Parent Letter & Expectations</p>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">Parental involvement is essential; participation is required for team acceptance and continued participation.</p>
			<label class="mt-3 block space-y-1 text-sm"><span style="color: var(--app-text);">I&apos;ve read the introductory letter for parents.</span><select name="intro_read" required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app.intro_read === 'yes'}>Yes</option><option value="no" selected={app.intro_read === 'no'}>No</option></select></label>
		</div>

		<div class="rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Video Block</p>
			<div class="mt-2 aspect-video overflow-hidden rounded-lg border" style="border-color: var(--app-glass-border);">
				<iframe class="h-full w-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Parent orientation video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
			</div>
		</div>

		<div class="rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Module 2 · Quick Quiz Checkpoints</p>
			<label class="mt-2 block space-y-1 text-sm"><span style="color: var(--app-text);">Walton Robotics is a competitive team with significant parent volunteer expectations.</span><select name="quiz_commitment" required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app.quiz_commitment === 'yes'}>Yes</option><option value="no" selected={app.quiz_commitment === 'no'}>No</option></select></label>
			<label class="mt-2 block space-y-1 text-sm"><span style="color: var(--app-text);">Students are expected to attend all competitions, including possible spring break overlap.</span><select name="quiz_competitions" required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app.quiz_competitions === 'yes'}>Yes</option><option value="no" selected={app.quiz_competitions === 'no'}>No</option></select></label>
		</div>

		<div class="rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Video Block</p>
			<div class="mt-2 aspect-video overflow-hidden rounded-lg border" style="border-color: var(--app-glass-border);">
				<iframe class="h-full w-full" src="https://www.youtube.com/embed/ysz5S6PUM-U" title="Volunteer overview video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
			</div>
		</div>

		<div class="grid gap-3 md:grid-cols-2">
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Student FIRST name</span><input name="student_first_name" required value={app.student_first_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Student LAST name</span><input name="student_last_name" required value={app.student_last_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent FIRST name</span><input name="parent_first_name" required value={app.parent_first_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent LAST name</span><input name="parent_last_name" required value={app.parent_last_name ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent relationship</span><input name="relationship" required value={data.application?.relationship ?? app.relationship ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm"><span style="color: var(--app-text);">Parent phone</span><input name="phone" required value={data.application?.phone ?? app.phone ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span style="color: var(--app-text);">Parent email signature</span><input name="parent_signature_email" type="email" required value={app.parent_signature_email ?? ''} class={gi} style={gs} /></label>
			<label class="space-y-1 text-sm md:col-span-2"><span style="color: var(--app-text);">Student email signature</span><input name="student_signature_email" type="email" required value={app.student_signature_email ?? ''} class={gi} style={gs} /></label>
		</div>

		<div class="space-y-2 rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Volunteer Commitments (choose at least 3 yes/maybe)</p>
			{#each [['volunteer_host_field_practice', 'Host 3 evenings of field practice for other teams'], ['volunteer_field_build_12_hours', 'Participate in at least 12 hours of field build'], ['volunteer_plan_team_travel', 'Plan team travel details'], ['volunteer_chaperone_trip', 'Serve as a chaperone for an out of town trip'], ['volunteer_transport_competitions', 'Provide transportation for two competitions'], ['volunteer_team_mentor', 'Serve as a team mentor in your expertise area'], ['volunteer_supervise_team_meetings', 'Supervise 3 evenings of team meetings'], ['volunteer_outreach_activities', 'Take part in 3 outreach activities'], ['volunteer_provide_food', 'Provide food/drinks on at least 3 occasions']] as [key, label]}
				<label class="grid gap-1 text-sm md:grid-cols-[1fr_220px] md:items-center"><span style="color: var(--app-text);">{label}</span><select name={key} required class={gi} style={gs}><option value="">Select</option><option value="yes" selected={app[key] === 'yes'}>Yes</option><option value="no" selected={app[key] === 'no'}>No</option><option value="maybe" selected={app[key] === 'maybe'}>Maybe - contact me</option></select></label>
			{/each}
		</div>

		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Skills / talents / equipment / relationships</span><textarea name="skills_and_relationships" rows="4" class={gi} style={gs}>{app.skills_and_relationships ?? ''}</textarea></label>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Other ways you can help Walton Robotics</span><textarea name="other_help_text" rows="3" class={gi} style={gs}>{app.other_help_text ?? ''}</textarea></label>
		<label class="block space-y-1 text-sm"><span style="color: var(--app-text);">Additional notes</span><textarea name="notes" rows="3" class={gi} style={gs}>{data.application?.notes ?? ''}</textarea></label>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<p class="text-xs" style="color: var(--app-text-muted);">Current status: {data.application?.status ?? 'not started'}</p>
			<div class="flex gap-2">
				<button type="submit" formaction="?/saveDraft" class="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium backdrop-blur-sm" style="background: var(--app-glass-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-glass-border);">Save draft</button>
				<Button variant="primary" type="submit">Submit for admin approval</Button>
			</div>
		</div>
	</form>
</section>
