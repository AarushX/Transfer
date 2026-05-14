<script lang="ts">
	import QRScanner from '$lib/components/QRScanner.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let result = $state<any>(null);
	let error = $state('');

	const onDecoded = async (token: string) => {
		const res = await fetch('/api/mentor/resolve-qr', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token })
		});
		const data = await res.json();
		if (!res.ok) {
			error = data.error ?? 'Failed to decode QR';
			result = null;
			return;
		}
		result = data;
		error = '';
	};
</script>

<section class="space-y-6">
	<header class="fade-up">
		<p class="eyebrow-label">Mentor Tools</p>
		<h1 class="gradient-text mt-1 text-2xl font-bold tracking-tight">QR Scanner</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Scan a student's passport QR to view their profile and certifications.</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
		<!-- Scanner card -->
		<div class="fade-up relative overflow-hidden rounded-2xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
			<div class="relative border-b px-5 py-3" style="border-color: var(--app-glass-border);">
				<div class="flex items-center gap-2">
					<div class="live-dot" style="color: var(--app-info);"></div>
					<p class="text-sm font-medium" style="color: var(--app-text);">Scanner</p>
				</div>
			</div>
			<div class="relative p-4">
				<QRScanner {onDecoded} />
			</div>
		</div>

		<!-- Result panel -->
		<div class="space-y-4">
			{#if error}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-5" style="background: color-mix(in srgb, var(--app-danger) 10%, transparent); border-color: color-mix(in srgb, var(--app-danger) 30%, transparent); box-shadow: 0 0 24px -8px color-mix(in srgb, var(--app-danger) 25%, transparent);">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<div class="relative">
						<span class="chip-rose inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">Error</span>
						<p class="mt-2 text-sm" style="color: var(--app-text);">{error}</p>
					</div>
				</div>
			{:else if result}
				<div class="fade-up relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
					<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
					<div class="relative space-y-3">
						<div>
							<p class="eyebrow-label">Student Profile</p>
							<p class="mt-1 text-lg font-semibold" style="color: var(--app-text);">{result.profile?.full_name || result.profile?.email}</p>
						</div>
						{#if (result.certifications ?? []).length > 0}
							<div>
								<p class="eyebrow-label mb-2">Certifications</p>
								<div class="space-y-1.5">
									{#each result.certifications ?? [] as cert}
										<div class="chip-emerald flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium">
											<svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
											{cert.nodes?.title}
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<p class="text-sm" style="color: var(--app-text-dim);">No certifications yet.</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="fade-up rounded-2xl border border-dashed p-6 text-center backdrop-blur-xl" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);">
					<p class="text-sm" style="color: var(--app-text-dim);">Scan a student QR to view their info.</p>
				</div>
			{/if}
		</div>
	</div>
</section>
