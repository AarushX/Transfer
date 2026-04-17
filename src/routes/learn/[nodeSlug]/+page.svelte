<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import Quiz from '$lib/components/Quiz.svelte';

	let { data } = $props();

	function extractVideoId(url: string): string | null {
		if (!url) return null;
		try {
			const u = new URL(url);
			const host = u.hostname.replace(/^www\./, '');
			if (host === 'youtu.be') {
				const id = u.pathname.slice(1);
				return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
			}
			if (host.endsWith('youtube.com')) {
				if (u.pathname === '/watch') {
					const id = u.searchParams.get('v') ?? '';
					return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
				}
				if (u.pathname.startsWith('/embed/')) {
					const id = u.pathname.split('/')[2] ?? '';
					return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
				}
			}
			return null;
		} catch {
			return null;
		}
	}

	const videoId = $derived(extractVideoId(data.node.video_url ?? ''));

	const certStatus = $derived(data.certStatus as string);
	const videoDone = $derived(
		certStatus === 'quiz_pending' ||
			certStatus === 'mentor_checkoff_pending' ||
			certStatus === 'completed'
	);
	const awaitingMentor = $derived(certStatus === 'mentor_checkoff_pending');
	const completed = $derived(certStatus === 'completed');
	const locked = $derived(certStatus === 'locked');

	let marking = $state(false);

	async function markWatched() {
		if (marking) return;
		marking = true;
		try {
			await fetch('/api/nodes/video-complete', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ nodeId: data.node.id })
			});
			await invalidateAll();
		} finally {
			marking = false;
		}
	}

	const statusLabels: Record<string, { label: string; tone: string }> = {
		locked: { label: 'Locked (complete prerequisites first)', tone: 'slate' },
		available: { label: 'Available — watch the video to begin', tone: 'slate' },
		video_pending: { label: 'Video in progress', tone: 'slate' },
		quiz_pending: { label: 'Quiz unlocked', tone: 'yellow' },
		mentor_checkoff_pending: { label: 'Awaiting mentor checkoff', tone: 'sky' },
		completed: { label: 'Completed', tone: 'emerald' }
	};
	const statusInfo = $derived(
		statusLabels[certStatus] ?? { label: certStatus, tone: 'slate' }
	);
</script>

<section class="space-y-4">
	<div>
		<a href="/dashboard" class="text-xs text-slate-400">← Dashboard</a>
		<h1 class="text-2xl font-semibold">{data.node.title}</h1>
		<p class="text-slate-300">{data.node.description}</p>
		<p class="mt-2 text-xs">
			<span
				class={`inline-flex rounded-full px-2 py-0.5 ${
					statusInfo.tone === 'emerald'
						? 'bg-emerald-900/40 text-emerald-200'
						: statusInfo.tone === 'sky'
							? 'bg-sky-900/40 text-sky-200'
							: statusInfo.tone === 'yellow'
								? 'bg-yellow-900/40 text-yellow-200'
								: 'bg-slate-800 text-slate-300'
				}`}
			>
				{statusInfo.label}
			</span>
		</p>
	</div>

	{#if locked}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
			This module is locked. Complete its prerequisites on the
			<a class="text-yellow-300 underline" href="/dashboard">dashboard</a> first.
		</div>
	{:else}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-3">
			{#if videoId}
				<VideoPlayer {videoId} onCompleted={markWatched} />
			{:else if data.node.video_url}
				<div class="space-y-2 p-3">
					<p class="text-sm text-slate-300">
						This module's video can't be embedded (likely a playlist or search link).
					</p>
					<a
						href={data.node.video_url}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600"
						>Open video on YouTube ↗</a
					>
				</div>
			{:else}
				<p class="p-3 text-sm text-slate-300">No video has been attached to this module yet.</p>
			{/if}

			{#if !videoDone}
				<div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
					<button
						class="rounded bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-60"
						onclick={markWatched}
						disabled={marking}
					>
						{marking ? 'Marking…' : 'I finished the video'}
					</button>
					<span class="text-xs text-slate-400"
						>Marks the video as watched so the quiz unlocks.</span
					>
				</div>
			{/if}
		</div>
	{/if}

	{#if videoDone && !completed && !awaitingMentor}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Quiz</h2>
				<span class="text-xs text-slate-400">Passing score: {data.passingScore}%</span>
			</div>
			{#if (data.questions ?? []).length === 0}
				<p class="text-sm text-slate-400">
					No quiz is configured for this module. Ask a mentor to add one.
				</p>
			{:else}
				<Quiz
					questions={data.questions}
					nodeId={data.node.id}
					passingScore={data.passingScore}
				/>
			{/if}
		</div>
	{/if}

	{#if awaitingMentor}
		<div class="rounded-xl border border-sky-700 bg-sky-900/20 p-4">
			<h2 class="mb-1 text-lg font-semibold">Awaiting mentor checkoff</h2>
			<p class="text-sm text-sky-100">
				Quiz passed{data.cert?.quiz_score != null ? ` (${data.cert.quiz_score}%)` : ''}. Find a
				mentor to complete the hands-on step:
			</p>
			<p class="mt-2 rounded bg-slate-900 p-3 text-sm text-slate-200">
				{data.node.physical_task || 'Demonstrate the skills from this module to a mentor.'}
			</p>
		</div>
	{/if}

	{#if completed}
		<div class="rounded-xl border border-emerald-700 bg-emerald-900/20 p-4">
			<h2 class="mb-1 text-lg font-semibold text-emerald-200">Completed</h2>
			<p class="text-sm text-emerald-100">
				You've finished this module{data.cert?.approved_at
					? ` on ${new Date(data.cert.approved_at).toLocaleDateString()}`
					: ''}.
			</p>
		</div>
	{/if}
</section>
