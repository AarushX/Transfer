<script lang="ts">
	import { onMount } from 'svelte';
	let { videoId, onCompleted }: { videoId: string; onCompleted: () => Promise<void> } = $props();
	const iframeId = $derived(`youtube-${videoId}`);

	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://www.youtube.com/iframe_api';
		document.body.appendChild(script);

		// @ts-expect-error runtime global from YouTube
		window.onYouTubeIframeAPIReady = () => {
			// @ts-expect-error runtime global from YouTube
			new window.YT.Player(iframeId, {
				events: {
					onStateChange: async (event: { data: number }) => {
						// @ts-expect-error runtime global from YouTube
						if (event.data === window.YT.PlayerState.ENDED) await onCompleted();
					}
				}
			});
		};
	});
</script>

<iframe
	id={iframeId}
	class="aspect-video w-full rounded-lg"
	src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
	title="Training video"
	allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
	referrerpolicy="strict-origin-when-cross-origin"
	allowfullscreen
></iframe>
