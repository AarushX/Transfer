<script lang="ts">
	let { qrDataUrl }: { qrDataUrl: string } = $props();
	let currentQrDataUrl = $state('');
	let refreshing = $state(false);
	let error = $state('');

	$effect(() => {
		currentQrDataUrl = qrDataUrl;
	});

	const refreshQr = async () => {
		refreshing = true;
		error = '';
		const res = await fetch('/api/passport/refresh-qr', { method: 'POST' });
		const body = await res.json().catch(() => null);
		refreshing = false;
		if (!res.ok) {
			error = body?.error ?? 'Unable to refresh QR.';
			return;
		}
		currentQrDataUrl = String(body?.qrDataUrl ?? '');
	};
</script>

<div class="space-y-2">
	{#if currentQrDataUrl}
		<img src={currentQrDataUrl} alt="Passport QR code" class="h-56 w-56 rounded bg-slate-900 p-2" />
	{/if}
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
			onclick={refreshQr}
			disabled={refreshing}
		>
			{refreshing ? 'Refreshing…' : 'Refresh QR'}
		</button>
		{#if error}
			<span class="text-xs text-red-300">{error}</span>
		{/if}
	</div>
</div>
