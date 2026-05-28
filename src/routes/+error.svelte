<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';

	const status = $derived($page.status);
	const message = $derived($page.error?.message ?? '');

	const headline = $derived(
		status === 404
			? "We can't find that page"
			: status === 403
				? "You don't have access to that page"
				: status === 401
					? 'You need to sign in first'
					: 'Something went wrong on our end'
	);

	const detail = $derived(
		status === 404
			? message && message !== 'Not Found'
				? message
				: 'The page you tried to open does not exist, or the link is out of date.'
			: status >= 500
				? "We hit an unexpected error loading that page. It's usually fine on a retry."
				: message || 'Please try again.'
	);
</script>

<div class="flex min-h-[70dvh] items-center justify-center px-6 py-10">
	<div
		class="fade-up relative w-full max-w-lg overflow-hidden rounded-2xl border p-7 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	>
		<div
			class="pointer-events-none absolute inset-0 rounded-2xl"
			style="background: var(--app-glass-shine);"
		></div>
		<div class="relative space-y-4">
			<p
				class="mono text-[10px] font-bold tracking-[0.22em] uppercase"
				style="color: var(--app-text-muted);"
			>
				Error · <span style="color: var(--app-warning);">{status}</span>
			</p>
			<h1 class="text-2xl font-bold tracking-tight">
				<span class="gradient-text">{headline}</span>
			</h1>
			<p class="text-sm" style="color: var(--app-text-muted);">
				{detail}
			</p>
			<div class="flex flex-wrap items-center gap-2 pt-2">
				<Button variant="primary" href="/dashboard">Go to dashboard</Button>
				<Button variant="ghost" href="/">Home</Button>
			</div>
		</div>
	</div>
</div>
