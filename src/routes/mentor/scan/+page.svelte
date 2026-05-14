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
			return;
		}
		result = data;
		error = '';
	};
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold" style="color: var(--app-text);">QR Scanner</h1>
	<GlassCard>
		<QRScanner {onDecoded} />
	</GlassCard>
	{#if error}<p style="color: var(--app-danger);">{error}</p>{/if}
	{#if result}
		<GlassCard>
			<p class="font-semibold" style="color: var(--app-text);">{result.profile?.full_name || result.profile?.email}</p>
			<ul class="mt-2 list-disc pl-5 text-sm" style="color: var(--app-text);">
				{#each result.certifications ?? [] as cert}
					<li>{cert.nodes?.title}</li>
				{/each}
			</ul>
		</GlassCard>
	{/if}
</section>
