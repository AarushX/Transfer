<script lang="ts">
	import { isMentor } from '$lib/roles';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	const canMentor = $derived(isMentor(data.profile));

	const message = $derived.by(() => {
		if (form?.error) return { tone: 'error' as const, text: form.error };
		if (form?.ok && form?.section === 'primary')
			return { tone: 'ok' as const, text: 'Primary team updated.' };
		if (form?.ok && form?.section === 'mentor')
			return { tone: 'ok' as const, text: 'Mentor checkoff teams updated.' };
		return null;
	});
</script>

<section class="space-y-6">
	<GlassCard>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Teams</h1>
		<p class="text-sm" style="color: var(--app-text-muted);">
			Set your primary team for course organization and (for mentors) choose the teams you want to
			check off.
		</p>
	</GlassCard>

	{#if message}
		<div
			class="rounded border p-3 text-sm"
			style={message.tone === 'error'
				? 'border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);'
				: 'border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);'}
		>
			{message.text}
		</div>
	{/if}

	<form
		method="POST"
		action="?/setPrimaryTeam"
		class="rounded-xl border p-4 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	>
		<h2 class="text-lg font-semibold" style="color: var(--app-text);">Primary team</h2>
		<p class="mb-3 text-xs" style="color: var(--app-text-muted);">
			This drives your default course grouping and teammate context.
		</p>
		<div class="grid gap-2 md:grid-cols-2">
			{#each data.subteams as team}
				<label class="flex cursor-pointer items-center gap-2 rounded border p-3 transition-colors" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);" onmouseenter={(e) => { e.currentTarget.style.background = 'var(--app-glass-bg-hover)'; }} onmouseleave={(e) => { e.currentTarget.style.background = 'var(--app-glass-bg)'; }}>
					<input
						type="radio"
						name="subteam_id"
						value={team.id}
						checked={data.profile?.subteam_id === team.id}
						class="accent-yellow-400"
					/>
					<div>
						<p class="font-medium" style="color: var(--app-text);">{team.name}</p>
						<p class="text-xs" style="color: var(--app-text-muted);">{team.slug}</p>
					</div>
				</label>
			{/each}
		</div>
		<div class="mt-3 flex gap-2">
			<Button variant="primary" type="submit">Save primary team</Button>
			<button type="submit" name="subteam_id" value="" class="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium backdrop-blur-sm" style="background: var(--app-glass-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-glass-border);">Clear</button>
		</div>
	</form>

	{#if canMentor}
		<form
			method="POST"
			action="?/saveMentorTeams"
			class="rounded-xl border p-4 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Mentor checkoff teams</h2>
			<p class="mb-3 text-xs" style="color: var(--app-text-muted);">
				Pick which teams should appear in your mentor queue when filtering to "My teams".
			</p>
			<div class="grid gap-2 md:grid-cols-2">
				{#each data.subteams as team}
					<label class="flex cursor-pointer items-center gap-2 rounded border p-3 transition-colors" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);" onmouseenter={(e) => { e.currentTarget.style.background = 'var(--app-glass-bg-hover)'; }} onmouseleave={(e) => { e.currentTarget.style.background = 'var(--app-glass-bg)'; }}>
						<input
							type="checkbox"
							name="mentor_team_ids"
							value={team.id}
							checked={data.mentorTeamIds.includes(team.id)}
							class="accent-yellow-400"
						/>
						<div>
							<p class="font-medium" style="color: var(--app-text);">{team.name}</p>
							<p class="text-xs" style="color: var(--app-text-muted);">{team.slug}</p>
						</div>
					</label>
				{/each}
			</div>
			<Button variant="primary" type="submit" class="mt-3">Save mentor teams</Button>
		</form>
	{/if}
</section>
