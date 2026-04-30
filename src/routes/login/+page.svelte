<script lang="ts">
	let { data } = $props();
	let showParentEmail = $state(false);
</script>

<section class="mx-auto max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
	<h1 class="text-2xl font-semibold">Sign in</h1>
	<p class="text-sm text-slate-300">Students, mentors, admins, and parents all sign in here with Google.</p>
	{#if data?.error}
		<p class="rounded bg-red-900/30 p-2 text-sm text-red-200">{data.error}</p>
	{:else if data?.success}
		<p class="rounded bg-emerald-900/30 p-2 text-sm text-emerald-200">{data.success}</p>
	{/if}
	<form method="POST" action="/auth/google">
		<button
			class="w-full rounded bg-yellow-400 px-4 py-2 font-semibold text-slate-900"
			type="submit"
		>
			Continue with Google
		</button>
	</form>
	<button class="w-full rounded border border-slate-700 px-4 py-2 font-semibold text-slate-100" type="button" onclick={() => (showParentEmail = !showParentEmail)}>
		{showParentEmail ? 'Hide Parent Login' : 'Login as Parent'}
	</button>
	{#if showParentEmail}
		<form method="POST" action="/auth/email" class="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Parent / Guardian Email Login</p>
			<input
				type="email"
				name="email"
				required
				autocomplete="email"
				class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
				placeholder="parent@example.com"
			/>
			<input
				type="password"
				name="password"
				required
				autocomplete="current-password"
				class="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
				placeholder="Password"
			/>
			<div class="grid grid-cols-2 gap-2">
				<button
					class="w-full rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900"
					type="submit"
					name="intent"
					value="login"
				>
					Parent Login
				</button>
				<button
					class="w-full rounded border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100"
					type="submit"
					name="intent"
					value="signup"
				>
					Create Account
				</button>
			</div>
		</form>
	{/if}
	<p class="text-xs text-slate-400">Email/password works only for parent/guardian accounts. Everyone else should use Google.</p>
</section>
