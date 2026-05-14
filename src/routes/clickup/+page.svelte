<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	let signedUp = $derived(form?.signed_up ?? data.clickupSignedUp);

	const SIGNUP_URL = 'https://app.clickup.com/signup/sso/google_sso';
	const WORKSPACE_URL = 'https://app.clickup.com/login';
</script>

<section class="space-y-5">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">ClickUp</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Project Workspace</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Our team uses ClickUp for project tasks, build season planning, and team workspaces.</p>
	</header>

	<GlassCard>
		<div class="space-y-4">
			<label class="flex items-start gap-3 cursor-pointer">
				<form method="POST" action="?/setSignedUp">
					<input type="hidden" name="signed_up" value={signedUp ? 'false' : 'true'} />
					<button type="submit" class="mt-0.5 grid h-5 w-5 place-items-center rounded border transition-colors" style="border-color: {signedUp ? 'var(--app-accent)' : 'var(--app-glass-border)'}; background: {signedUp ? 'var(--app-accent)' : 'transparent'};">
						{#if signedUp}
							<svg viewBox="0 0 16 16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M3 8l3 3 7-7" /></svg>
						{/if}
					</button>
				</form>
				<div class="flex-1">
					<p class="text-sm font-medium" style="color: var(--app-text);">I've signed up for ClickUp with my team Google account</p>
					<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">Click the box to toggle once you've completed signup.</p>
				</div>
			</label>

			{#if !signedUp}
				<div class="space-y-2 rounded-xl border p-4" style="border-color: color-mix(in srgb, var(--app-accent) 30%, transparent); background: color-mix(in srgb, var(--app-accent) 6%, transparent);">
					<p class="text-sm font-semibold" style="color: var(--app-text);">Step 1 &mdash; Sign up</p>
					<p class="text-xs" style="color: var(--app-text-muted);">Use your team Google account to sign in with SSO.</p>
					<Button variant="primary" href={SIGNUP_URL}>Sign up for ClickUp</Button>
				</div>
			{:else}
				<div class="space-y-2 rounded-xl border p-4" style="border-color: color-mix(in srgb, var(--app-success) 30%, transparent); background: color-mix(in srgb, var(--app-success) 6%, transparent);">
					<p class="text-sm font-semibold" style="color: var(--app-text);">You're signed up &mdash; open the workspace</p>
					<p class="text-xs" style="color: var(--app-text-muted);">You should see all teams and the team workspace. If your workspace is empty, <strong>contact a mentor</strong> to get added.</p>
					<Button variant="primary" href={WORKSPACE_URL}>Open ClickUp</Button>
				</div>
			{/if}
		</div>
	</GlassCard>
</section>
