<script lang="ts">
	import QRScanner from '$lib/components/QRScanner.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let token = $state('');
	let error = $state('');
	let success = $state('');
	let machine = $state<any>(null);

	const useMachine = async () => {
		if (!token.trim()) {
			error = 'Scan or enter a machine QR token first.';
			return;
		}
		const res = await fetch('/api/machines/use', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ machineToken: token.trim() })
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			error = body?.error ?? 'Machine authorization failed.';
			success = '';
			machine = body?.machine ?? null;
			return;
		}
		error = '';
		success = body?.message ?? 'Authorized.';
		machine = body?.machine ?? null;
	};
</script>

<section class="space-y-6">
	<header class="fade-up">
		<p class="eyebrow-label">Safety</p>
		<h1 class="gradient-text mt-1 text-3xl font-semibold tracking-tight">Machine Access</h1>
		<p class="mt-2 max-w-2xl text-sm" style="color: var(--app-text-muted);">
			Scan the machine QR before use. You must have completed all required training courses.
		</p>
	</header>

	{#if error}
		<div
			class="fade-up rounded-2xl border p-3 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 12%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);"
		>
			{error}
		</div>
	{/if}
	{#if success}
		<div
			class="fade-up rounded-2xl border p-3 text-sm"
			style="border-color: color-mix(in srgb, var(--app-success) 40%, transparent); background: color-mix(in srgb, var(--app-success) 12%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);"
		>
			{success}
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<div class="fade-up" style="animation-delay: 60ms;">
			<GlassCard>
				<p class="eyebrow-label mb-3">Scan machine QR</p>
				<QRScanner onDecoded={(v: string) => (token = v)} />
			</GlassCard>
		</div>
		<div class="fade-up" style="animation-delay: 120ms;">
			<GlassCard>
				<div class="space-y-3">
					<p class="eyebrow-label">Manual entry</p>
					<label class="flex flex-col gap-1.5 text-sm">
						<span style="color: var(--app-text);">Machine token</span>
						<input
							class="rounded-xl px-3 py-2.5"
							style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
							bind:value={token}
						/>
					</label>
					<Button variant="primary" onclick={useMachine}>Authorize machine use</Button>
					{#if machine}
						<div
							class="rounded-xl border p-3"
							style="background: var(--app-surface-alt); border-color: var(--app-glass-border);"
						>
							<p class="font-semibold" style="color: var(--app-text);">{machine.name}</p>
							<p class="mt-0.5 text-sm" style="color: var(--app-text-muted);">
								{machine.description || 'No description.'}
							</p>
						</div>
					{/if}
				</div>
			</GlassCard>
		</div>
	</div>
</section>
