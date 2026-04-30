<script lang="ts">
	import { BrowserMultiFormatReader } from '@zxing/browser';
	import { onDestroy, onMount } from 'svelte';
	let { onDecoded }: { onDecoded: (value: string) => void } = $props();
	let videoEl: HTMLVideoElement;
	let reader: BrowserMultiFormatReader | null = null;
	let controls: { stop: () => void } | null = null;

	const stopCamera = () => {
		controls?.stop();
		controls = null;
		const stream = videoEl?.srcObject;
		if (stream instanceof MediaStream) {
			for (const track of stream.getTracks()) track.stop();
		}
		if (videoEl) videoEl.srcObject = null;
	};

	onMount(() => {
		reader = new BrowserMultiFormatReader();
		reader
			.decodeFromVideoDevice(undefined, videoEl, (result) => {
				if (result) onDecoded(result.getText());
			})
			.then((c) => {
				controls = c;
			});
		return stopCamera;
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<video bind:this={videoEl} class="h-64 w-full rounded-lg bg-black object-cover"></video>
