<script lang="ts">
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();
	let showParentEmail = $state(false);
</script>

<GlassCard class="mx-auto max-w-md space-y-4">
	<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Sign in</h1>
	<p class="text-sm" style="color: var(--app-text-muted);">Students, mentors, admins, and parents all sign in here with Google.</p>
	{#if data?.error}
		<p class="rounded-xl p-2 text-sm" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); border: 1px solid color-mix(in srgb, var(--app-danger) 40%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">{data.error}</p>
	{:else if data?.success}
		<p class="rounded-xl p-2 text-sm" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); border: 1px solid color-mix(in srgb, var(--app-success) 40%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">{data.success}</p>
	{/if}
	<form method="POST" action="/auth/google">
		<Button variant="primary" type="submit" class="w-full">
			Continue with Google
		</Button>
	</form>
	<Button variant="secondary" class="w-full" onclick={() => (showParentEmail = !showParentEmail)}>
		{showParentEmail ? 'Hide Parent Login' : 'Login as Parent'}
	</Button>
	{#if showParentEmail}
		<form method="POST" action="/auth/email" class="space-y-2 rounded-xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			<p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">Parent / Guardian Email Login</p>
			<input
				type="email"
				name="email"
				required
				autocomplete="email"
				class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				placeholder="parent@example.com"
			/>
			<input
				type="password"
				name="password"
				required
				autocomplete="current-password"
				class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				placeholder="Password"
			/>
			<div class="grid grid-cols-2 gap-2">
				<button
					class="w-full rounded-lg px-4 py-2 text-sm font-semibold transition-all"
					style="background: var(--app-gradient-accent); color: var(--app-accent-text);"
					type="submit"
					name="intent"
					value="login"
				>
					Parent Login
				</button>
				<button
					class="w-full rounded-lg border px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-button-secondary-text);"
					type="submit"
					name="intent"
					value="signup"
				>
					Create Account
				</button>
			</div>
		</form>
	{/if}
	<p class="text-xs" style="color: var(--app-text-muted);">Email/password works only for parent/guardian accounts. Everyone else should use Google.</p>
</GlassCard>
