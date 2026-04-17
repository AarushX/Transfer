<script lang="ts">
	let { qrDataUrl }: { qrDataUrl: string } = $props();
</script>

{#if qrDataUrl}
	<img src={qrDataUrl} alt="Passport QR code" class="h-56 w-56 rounded bg-white p-2" />
{/if}
