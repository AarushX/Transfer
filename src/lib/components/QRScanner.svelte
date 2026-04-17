<script lang="ts">
	import { BrowserMultiFormatReader } from '@zxing/browser';
	import { onMount } from 'svelte';
	let { onDecoded }: { onDecoded: (value: string) => void } = $props();
	let videoEl: HTMLVideoElement;

	onMount(() => {
		const reader = new BrowserMultiFormatReader();
		let controls: { stop: () => void } | null = null;
		reader
			.decodeFromVideoDevice(undefined, videoEl, (result) => {
				if (result) onDecoded(result.getText());
			})
			.then((c) => {
				controls = c;
			});
		return () => controls?.stop();
	});
</script>

<video bind:this={videoEl} class="h-64 w-full rounded-lg bg-black object-cover"></video>
