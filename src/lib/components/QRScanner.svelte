<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	let { onDecoded }: { onDecoded: (value: string) => void } = $props();
	let videoEl: HTMLVideoElement;
	let controls: { stop: () => void } | null = null;

	const stopCamera = () => {
		controls?.stop();
		controls = null;
		// Duck-type instead of `instanceof MediaStream` so this file is safe to
		// evaluate during SSR (where the MediaStream global is undefined). The
		// shape we care about is just `getTracks(): MediaStreamTrack[]`.
		const stream = videoEl?.srcObject as { getTracks?: () => Array<{ stop: () => void }> } | null;
		if (stream && typeof stream.getTracks === 'function') {
			for (const track of stream.getTracks()) track.stop();
		}
		if (videoEl) videoEl.srcObject = null;
	};

	onMount(() => {
		import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
			const reader = new BrowserMultiFormatReader();
			reader
				.decodeFromVideoDevice(undefined, videoEl, (result) => {
					if (result) onDecoded(result.getText());
				})
				.then((c) => {
					controls = c;
				});
		});
		return stopCamera;
	});

	onDestroy(() => {
		stopCamera();
	});
</script>

<video bind:this={videoEl} class="h-64 w-full rounded-lg bg-black object-cover"></video>
