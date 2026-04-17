<script lang="ts">
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import Quiz from '$lib/components/Quiz.svelte';

	let { data } = $props();
	let videoDone = $state(false);

	const videoId = (() => {
		try {
			const url = new URL(data.node.video_url);
			return url.searchParams.get('v') ?? url.pathname.split('/').at(-1) ?? '';
		} catch {
			return '';
		}
	})();

	const markVideoComplete = async () => {
		await fetch('/api/nodes/video-complete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ nodeId: data.node.id })
		});
		videoDone = true;
	};

	$effect(() => {
		videoDone = !(data.certStatus === 'video_pending' || data.certStatus === 'available');
	});
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">{data.node.title}</h1>
	<p class="text-slate-300">{data.node.description}</p>
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-3">
		<VideoPlayer {videoId} onCompleted={markVideoComplete} />
	</div>
	{#if videoDone}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h2 class="mb-3 text-lg font-semibold">Quiz</h2>
			<Quiz questions={data.questions} nodeId={data.node.id} />
		</div>
	{:else}
		<p class="text-sm text-slate-400">Finish the video to unlock the quiz.</p>
	{/if}
</section>
