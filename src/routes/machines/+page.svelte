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

<section class="space-y-4">
	<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Machine Access</h1>
	<p class="text-sm" style="color: var(--app-text-muted);">
		Scan the machine QR before use. You must have completed all required training courses.
	</p>
	{#if error}<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">
			{error}
		</p>{/if}
	{#if success}<p
			class="rounded border p-2 text-sm"
			style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			{success}
		</p>{/if}

	<div class="grid gap-3 md:grid-cols-2">
		<GlassCard>
			<h2 class="mb-2 font-semibold" style="color: var(--app-text);">Scan machine QR</h2>
			<QRScanner onDecoded={(v: string) => (token = v)} />
		</GlassCard>
		<GlassCard>
			<div class="space-y-2">
				<label class="flex flex-col gap-1 text-sm">
					<span style="color: var(--app-text);">Machine token</span>
					<input class="rounded px-2 py-2" style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);" bind:value={token} />
				</label>
				<Button variant="primary" onclick={useMachine}>
					Authorize machine use
				</Button>
				{#if machine}
					<div class="rounded p-2 text-sm" style="background: var(--app-glass-bg); backdrop-filter: blur(12px);">
						<p class="font-semibold" style="color: var(--app-text);">{machine.name}</p>
						<p style="color: var(--app-text-muted);">{machine.description || 'No description.'}</p>
					</div>
				{/if}
			</div>
		</GlassCard>
	</div>
</section>
