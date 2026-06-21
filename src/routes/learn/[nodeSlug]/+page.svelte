<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import Quiz from '$lib/components/Quiz.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import CourseCard, {
		type TeamRow,
		type TeamGroupRow
	} from '$lib/components/coursework/CourseCard.svelte';

	type BlockType = 'video' | 'quiz' | 'checkoff' | 'reading';
	type LearnBlock = {
		id: string;
		type: BlockType;
		position: number;
		config: Record<string, any>;
	};

	let { data } = $props();

	function extractVideoId(url: string | null | undefined): string | null {
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

	const certStatus = $derived(data.certStatus as string);
	const reviewStatus = $derived((data.review?.status as string | undefined) ?? '');
	const effectiveStatus = $derived.by(() => {
		if (certStatus === 'mentor_checkoff_pending' && reviewStatus === 'needs_review') {
			return 'checkoff_needs_review';
		}
		if (certStatus === 'mentor_checkoff_pending' && reviewStatus === 'blocked') {
			return 'checkoff_blocked';
		}
		return certStatus;
	});
	const locked = $derived(certStatus === 'locked');
	const completed = $derived(certStatus === 'completed');

	const blocks = $derived.by<LearnBlock[]>(() => {
		const real = Array.isArray(data.blocks) ? (data.blocks as any[]) : [];
		return real.map((b) => ({
			id: String(b.id),
			type: b.type as BlockType,
			position: Number(b.position),
			config: (b.config ?? {}) as Record<string, any>
		}));
	});

	const progressByBlockId = $derived.by(() => {
		const map = new Map<string, { completed_at: string | null; best_score: number | null }>();
		for (const row of (data.blockProgress ?? []) as any[]) {
			map.set(String(row.block_id), {
				completed_at: row.completed_at,
				best_score: row.best_score
			});
		}
		return map;
	});

	function isBlockCompleted(block: LearnBlock): boolean {
		return Boolean(progressByBlockId.get(block.id)?.completed_at);
	}

	const activeBlockIndex = $derived.by(() => {
		for (let i = 0; i < blocks.length; i += 1) {
			if (!isBlockCompleted(blocks[i])) return i;
		}
		return blocks.length;
	});

	const allBlocksComplete = $derived(blocks.length > 0 && activeBlockIndex >= blocks.length);
	let selectedBlockIndex = $state(0);
	let hasManualBlockSelection = $state(false);
	$effect(() => {
		if (!blocks.length) {
			selectedBlockIndex = 0;
			hasManualBlockSelection = false;
			return;
		}
		const defaultIndex = allBlocksComplete
			? blocks.length - 1
			: Math.min(activeBlockIndex, blocks.length - 1);
		if (!hasManualBlockSelection) {
			selectedBlockIndex = defaultIndex;
			return;
		}
		if (selectedBlockIndex < 0 || selectedBlockIndex >= blocks.length) {
			selectedBlockIndex = defaultIndex;
			return;
		}
		const maxAccessible = allBlocksComplete ? blocks.length - 1 : activeBlockIndex;
		if (selectedBlockIndex > maxAccessible) selectedBlockIndex = defaultIndex;
	});

	const viewingCurrentStep = $derived(
		!allBlocksComplete && selectedBlockIndex === activeBlockIndex
	);
	const activeBlock = $derived(
		selectedBlockIndex >= 0 && selectedBlockIndex < blocks.length
			? blocks[selectedBlockIndex]
			: null
	);

	let marking = $state(false);
	let videoActionMessage = $state('');

	async function markBlockVideoDone(block: LearnBlock) {
		if (marking) return;
		marking = true;
		try {
			const res = await fetch('/api/nodes/block-complete', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ nodeId: data.node.id, blockId: block.id })
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				videoActionMessage = body?.error ?? 'Could not mark block complete.';
				return;
			}
			videoActionMessage = '';
			await invalidateAll();
		} finally {
			marking = false;
		}
	}

	const statusLabels: Record<string, { label: string; tone: string }> = {
		locked: { label: 'Locked', tone: 'slate' },
		available: { label: 'Available', tone: 'slate' },
		video_pending: { label: 'In Progress', tone: 'slate' },
		quiz_pending: { label: 'In Progress', tone: 'yellow' },
		mentor_checkoff_pending: { label: 'Awaiting Checkoff', tone: 'sky' },
		checkoff_needs_review: { label: 'Action Required', tone: 'yellow' },
		checkoff_blocked: { label: 'Blocked', tone: 'red' },
		completed: { label: 'Completed', tone: 'emerald' }
	};
	const statusInfo = $derived(
		statusLabels[effectiveStatus] ?? { label: effectiveStatus, tone: 'slate' }
	);
	const statusTone = $derived.by(() => {
		if (statusInfo.tone === 'emerald') return 'success';
		if (statusInfo.tone === 'red') return 'danger';
		if (statusInfo.tone === 'sky') return 'info';
		if (statusInfo.tone === 'yellow') return 'warning';
		return 'neutral';
	});

	const blockedByMentor = $derived(
		reviewStatus === 'blocked' && certStatus === 'mentor_checkoff_pending'
	);
	const awaitingMentor = $derived(certStatus === 'mentor_checkoff_pending');
	const prereqPlan = $derived((data.prereqPlan ?? []) as any[]);
	const doablePrereqs = $derived(prereqPlan.filter((row: any) => row.isDoable));
	const completedPrereqs = $derived(prereqPlan.filter((row: any) => row.status === 'completed'));
	const lockedPrereqs = $derived(
		prereqPlan.filter((row: any) => !row.isDoable && row.status !== 'completed')
	);
	const teamsById = $derived(
		new Map(((data.prereqTeams ?? []) as TeamRow[]).map((t) => [String(t.id), t]))
	);
	const teamGroupsById = $derived(
		new Map(((data.prereqTeamGroups ?? []) as TeamGroupRow[]).map((g) => [String(g.id), g]))
	);

	const initialSubmissionPhotos = $derived.by(() => {
		if (
			Array.isArray(data.submission?.photo_data_urls) &&
			data.submission.photo_data_urls.length > 0
		) {
			return data.submission.photo_data_urls as string[];
		}
		if (data.submission?.photo_data_url) return [data.submission.photo_data_url] as string[];
		return [] as string[];
	});
	let uploadPreviews = $state<string[]>([]);
	$effect(() => {
		uploadPreviews = initialSubmissionPhotos;
	});
	let checkoffMessage = $state('');

	async function compressImage(file: File): Promise<string> {
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result ?? ''));
			reader.onerror = () => reject(new Error('Could not read image'));
			reader.readAsDataURL(file);
		});
		const img = await new Promise<HTMLImageElement>((resolve, reject) => {
			const el = new Image();
			el.onload = () => resolve(el);
			el.onerror = () => reject(new Error('Could not load image'));
			el.src = dataUrl;
		});
		const maxDim = 1280;
		const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
		const width = Math.max(1, Math.round(img.width * scale));
		const height = Math.max(1, Math.round(img.height * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return dataUrl;
		ctx.drawImage(img, 0, 0, width, height);
		return canvas.toDataURL('image/jpeg', 0.78);
	}

	async function onPhotoSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (!files.length) return;
		const accepted = files.filter((f) => f.type.startsWith('image/')).slice(0, 4);
		if (!accepted.length) {
			checkoffMessage = 'Please choose image files.';
			return;
		}
		const compressed: string[] = [];
		for (const file of accepted) {
			const next = await compressImage(file);
			compressed.push(next);
		}
		uploadPreviews = compressed;
		checkoffMessage = 'Photos prepared and compressed for upload.';
	}

	function removePhoto(index: number) {
		uploadPreviews = uploadPreviews.filter((_, i) => i !== index);
		checkoffMessage = 'Photo removed. Save to persist this change.';
	}
	let photoInputEl = $state<HTMLInputElement | null>(null);
	const openPhotoPicker = () => photoInputEl?.click();

	function blockTypeLabel(type: BlockType): string {
		if (type === 'video') return 'VIDEO';
		if (type === 'quiz') return 'QUIZ';
		if (type === 'reading') return 'READING';
		return 'CHECKOFF';
	}

	function blockTitle(block: LearnBlock): string {
		const cfg = block.config;
		const raw = String(cfg.title ?? '').trim();
		if (raw) return raw;
		if (block.type === 'video') return 'Video';
		if (block.type === 'quiz') return 'Quiz';
		if (block.type === 'reading') return 'Reading';
		return 'Skills Check';
	}

	// Sidebar: mentor sign-off panel
	const checkoffBlock = $derived(blocks.find((b) => b.type === 'checkoff') ?? null);
	const checkoffChecklist = $derived(
		Array.isArray(checkoffBlock?.config?.mentor_checklist)
			? (checkoffBlock.config.mentor_checklist as string[])
			: []
	);

	// Attempt counter for Quiz component
	const quizAttemptCount = $derived.by(() => {
		if (!activeBlock || activeBlock.type !== 'quiz') return 0;
		const bid = activeBlock.id;
		return ((data.blockAttempts ?? []) as any[]).filter(
			(a: any) => String(a.block_id) === bid
		).length;
	});

</script>

<!-- Breadcrumb -->
<div class="mb-3 flex items-center gap-1.5 text-[12px]" style="color: var(--app-text-dim);">
	<a
		href="/coursework"
		class="transition-colors hover:underline"
		style="color: var(--app-text-dim);"
	>Coursework</a>
	<span>/</span>
	<span style="color: var(--app-text);">{data.node.title}</span>
</div>

<!-- Work-order card -->
<div
	class="mb-6 overflow-hidden rounded-2xl border"
	style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
>
	<!-- Label + title row with SUBTEAM and STATUS on the right -->
	<div class="border-b px-5 py-4" style="border-color: var(--app-border);">
		<p class="eyebrow-label mb-1.5" style="color: var(--app-text-dim);">WORK ORDER · MODULE</p>
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold tracking-tight" style="color: var(--app-text);">{data.node.title}</h1>
			<div class="flex items-center gap-6">
				<div>
					<p class="eyebrow-label mb-0.5">SUBTEAM</p>
					<p class="mono text-[14px] font-bold" style="color: var(--app-text);">{(data.subteamName as string) ?? '—'}</p>
				</div>
				<div>
					<p class="eyebrow-label mb-0.5">STATUS</p>
					<StatusChip label={statusInfo.label} tone={statusTone} />
				</div>
			</div>
		</div>
		{#if data.previewBypass}
			<p class="mt-1 text-xs" style="color: var(--app-info);">Preview mode: prerequisite locks are bypassed.</p>
		{/if}
	</div>

	<!-- Step tracker -->
	{#if blocks.length > 0}
		<div class="step-tracker-row flex overflow-x-auto">
			{#each blocks as block, i (block.id)}
				{@const done = isBlockCompleted(block)}
				{@const current = i === activeBlockIndex && !done}
				{@const accessible = allBlocksComplete || i <= activeBlockIndex}
				{@const isSelected = i === selectedBlockIndex}
				<button
					type="button"
					onclick={() => {
						if (!accessible) return;
						hasManualBlockSelection = true;
						selectedBlockIndex = i;
					}}
					disabled={!accessible}
					class="step-tracker-btn flex min-w-[140px] flex-1 flex-col gap-1.5 px-4 py-3 text-left transition-colors"
					style="opacity: {accessible ? 1 : 0.4}; cursor: {accessible ? 'pointer' : 'not-allowed'}; background: {isSelected ? 'color-mix(in srgb, var(--app-accent) 5%, var(--app-surface))' : 'var(--app-surface)'};"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span
							class="grid h-4 w-4 shrink-0 place-items-center rounded-sm border"
							style="border-color: {done ? 'var(--app-success)' : current ? 'var(--app-accent)' : 'var(--app-border)'}; background: {done ? 'var(--app-success)' : 'transparent'};"
						>
							{#if done}
								<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-2.5 w-2.5"><polyline points="4 12 10 18 20 6"/></svg>
							{/if}
						</span>
						<span class="mono text-[10px] font-bold" style="color: {done ? 'var(--app-success)' : current ? 'var(--app-accent)' : 'var(--app-text-dim)'};">
							{i + 1}.0 {blockTypeLabel(block.type)}
						</span>
						{#if current}
							<span class="text-[10px] font-semibold" style="color: var(--app-accent);">← YOU ARE HERE</span>
						{/if}
					</div>
					<p
						class="truncate text-[11px]"
						style="padding-left: 1.5rem; color: {done ? 'var(--app-text-muted)' : current ? 'var(--app-text)' : 'var(--app-text-dim)'};"
					>
						{blockTitle(block)}
					</p>
				</button>
			{/each}
		</div>
	{/if}
</div>

<!-- Page body -->
<section>
	{#if locked}
		<div class="fade-up space-y-6" style="animation-delay: 0.06s;">
			<p class="text-sm" style="color: var(--app-text-muted);">
				This module is locked. Knock out its prerequisites first — the doable ones are right below.
				Your full plan is on the
				<a style="color: var(--app-link);" href="/dashboard">dashboard</a>.
			</p>

			{#if prereqPlan.length > 0}
				{#each [['Doable now', doablePrereqs, 'No currently doable prerequisites.', 'var(--app-accent)'], ['Still locked', lockedPrereqs, 'No locked prerequisites.', 'var(--app-warning)'], ['Completed', completedPrereqs, 'No completed prerequisites yet.', 'var(--app-success)']] as [title, list, emptyMsg, accent]}
					<div class="space-y-3">
						<div class="section-divider" style="--divider-accent: {accent};">
							<h2 class="section-divider-label">
								{title}
								<span class="mono text-[11px] font-semibold" style="color: var(--app-text-dim);"
									>{(list as any[]).length}</span
								>
							</h2>
						</div>
						{#if (list as any[]).length === 0}
							<p class="text-sm italic" style="color: var(--app-text-dim);">{emptyMsg}</p>
						{:else}
							<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
								{#each list as row (row.nodeId)}
									<CourseCard course={row} {teamsById} {teamGroupsById} compact />
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{:else if blocks.length === 0}
		<div
			class="fade-up rounded-2xl border p-5 text-sm"
			style="animation-delay: 0.06s; background: var(--app-surface); border-color: var(--app-border);"
		>
			<p style="color: var(--app-text-muted);">
				No blocks have been added to this module yet. Ask a mentor to configure the course.
			</p>
		</div>
	{:else}
		<!-- Two-column layout: main content + mentor sidebar -->
		<div class="flex items-start gap-6 pb-12">
			<!-- Main column -->
			<div class="fade-up min-w-0 flex-1 space-y-4" style="animation-delay: 0.06s;">
				{#if awaitingMentor && !completed}
					<div
						class="rounded-2xl border p-5"
						style="background: color-mix(in srgb, var(--app-info) 6%, var(--app-surface)); border-color: color-mix(in srgb, var(--app-info) 30%, transparent);"
					>
						<p class="eyebrow-label mb-1">Mentor Review</p>
						<h2 class="text-base font-semibold" style="color: var(--app-text);">Awaiting mentor checkoff</h2>
						<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
							Your checkoff submission is ready for mentor review.
						</p>
						{#if data.reviewMentor}
							<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
								Last reviewed by {data.reviewMentor.full_name || data.reviewMentor.email}.
							</p>
						{/if}
					</div>
				{/if}

				{#if completed || allBlocksComplete}
					<div
						class="rounded-2xl border p-5"
						style="background: color-mix(in srgb, var(--app-success) 6%, var(--app-surface)); border-color: color-mix(in srgb, var(--app-success) 30%, transparent);"
					>
						<div class="mb-1 flex items-center gap-2">
							<span
								class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
								style="background: color-mix(in srgb, var(--app-success) 20%, transparent); color: var(--app-success);"
							>✓</span>
							<h2 class="text-base font-semibold" style="color: var(--app-text);">Completed</h2>
						</div>
						<p class="text-sm" style="color: var(--app-text-muted);">
							You've finished this module{data.cert?.approved_at
								? ` on ${new Date(data.cert.approved_at).toLocaleDateString()}`
								: ''}.
						</p>
						{#if data.certMentor}
							<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
								Approved by {data.certMentor.full_name || data.certMentor.email}.
							</p>
						{/if}
					</div>
				{/if}

				{#if activeBlock}
					{#if activeBlock.type === 'video'}
						{@const vid = extractVideoId(activeBlock.config.video_url)}
						<div class="space-y-3">
							{#if vid}
								<VideoPlayer
									videoId={vid}
									startSeconds={Number(activeBlock.config.start_seconds ?? 0)}
									endSeconds={activeBlock.config.end_seconds == null ||
									activeBlock.config.end_seconds === ''
										? null
										: Number(activeBlock.config.end_seconds)}
									onCompleted={() => markBlockVideoDone(activeBlock)}
								/>
							{:else if activeBlock.config.video_url}
								<div class="space-y-2">
									<p class="text-sm" style="color: var(--app-text-muted);">
										This video can't be embedded directly. Open it on YouTube to watch, then mark it
										done.
									</p>
									<Button variant="secondary" href={activeBlock.config.video_url} size="sm">
										Open on YouTube ↗
									</Button>
								</div>
							{:else}
								<p class="text-sm" style="color: var(--app-text-muted);">
									No video URL configured for this block.
								</p>
							{/if}
							<div
								class="flex flex-wrap items-center gap-3 border-t pt-4"
								style="border-color: var(--app-border);"
							>
								{#if viewingCurrentStep}
									<Button
										variant="primary"
										onclick={() => markBlockVideoDone(activeBlock)}
										disabled={marking}
									>
										{marking ? 'Marking…' : 'I finished this video'}
									</Button>
									<span class="text-xs" style="color: var(--app-text-dim);">
										Marks this video complete and unlocks the next block.
									</span>
									{#if videoActionMessage}
										<p class="text-xs" style="color: var(--app-danger);">{videoActionMessage}</p>
									{/if}
								{:else}
									<span class="text-xs" style="color: var(--app-text-dim);">
										Viewing a completed step. Return to the current step to continue progress.
									</span>
								{/if}
							</div>
						</div>

					{:else if activeBlock.type === 'quiz'}
						{#if (activeBlock.config.questions ?? []).length === 0}
							<p class="text-sm" style="color: var(--app-text-muted);">
								No quiz questions configured yet. Ask a mentor to add some.
							</p>
						{:else}
							<Quiz
								questions={activeBlock.config.questions}
								nodeId={data.node.id}
								blockId={activeBlock.id}
								passingScore={activeBlock.config.passing_score ?? 80}
								allowSubmit={true}
								lockedMessage=""
								attemptCount={quizAttemptCount}
								maxAttempts={3}
							/>
						{/if}

					{:else if activeBlock.type === 'reading'}
						{@const c = activeBlock.config}
						<div class="space-y-4">
							{#if c.content}
								<div
									class="rounded-xl border p-4 text-sm whitespace-pre-wrap"
									style="background: var(--app-surface); border-color: var(--app-border); color: var(--app-text);"
								>
									{c.content}
								</div>
							{/if}
							{#if Array.isArray(c.resource_links) && c.resource_links.length > 0}
								<div
									class="rounded-xl border p-4"
									style="background: var(--app-surface); border-color: var(--app-border);"
								>
									<p class="eyebrow-label mb-2">Resources</p>
									<ul class="space-y-2 text-sm">
										{#each c.resource_links as link}
											<li>
												<a
													href={link}
													class="resource-link inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all"
													target="_blank"
													rel="noopener noreferrer"
												>
													<span style="color: var(--app-link);">↗</span>
													<span class="truncate" style="color: var(--app-link);">{link}</span>
												</a>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							<div
								class="flex flex-wrap items-center gap-3 border-t pt-4"
								style="border-color: var(--app-border);"
							>
								{#if viewingCurrentStep}
									<Button
										variant="primary"
										onclick={() => markBlockVideoDone(activeBlock)}
										disabled={marking}
									>
										{marking ? 'Marking…' : 'I finished this reading'}
									</Button>
									<span class="text-xs" style="color: var(--app-text-dim);">
										Marks this reading complete and unlocks the next block.
									</span>
									{#if videoActionMessage}
										<p class="text-xs" style="color: var(--app-danger);">{videoActionMessage}</p>
									{/if}
								{:else}
									<span class="text-xs" style="color: var(--app-text-dim);">
										Viewing a completed step. Return to the current step to continue progress.
									</span>
								{/if}
							</div>
						</div>

					{:else}
						<!-- Checkoff block -->
						{@const c = activeBlock.config}
						<div class="space-y-4">
							{#if c.directions}
								<p class="text-sm whitespace-pre-wrap" style="color: var(--app-text-muted);">
									{c.directions}
								</p>
							{/if}
							{#if Array.isArray(c.resource_links) && c.resource_links.length > 0}
								<div
									class="rounded-xl border p-4"
									style="background: var(--app-surface); border-color: var(--app-border);"
								>
									<p class="eyebrow-label mb-2">Resources</p>
									<ul class="space-y-2 text-sm">
										{#each c.resource_links as link}
											<li>
												<a
													href={link}
													class="resource-link inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all"
													target="_blank"
													rel="noopener noreferrer"
												>
													<span style="color: var(--app-link);">↗</span>
													<span class="truncate" style="color: var(--app-link);">{link}</span>
												</a>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
							<form
								method="POST"
								action="?/saveSubmission"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											checkoffMessage = 'Submission saved. A mentor will review soon.';
											await invalidateAll();
										}
										if (result.type === 'failure') {
											checkoffMessage =
												(result.data?.error as string) ?? 'Could not save submission.';
										}
									};
								}}
								class="space-y-4 rounded-xl border p-4"
								style="background: var(--app-surface); border-color: var(--app-border);"
							>
								<p class="eyebrow-label">Submission</p>
								<input type="hidden" name="block_id" value={activeBlock.id} />
								{#if blockedByMentor}
									<div
										class="rounded-lg border p-3 text-xs"
										style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
									>
										This checkoff is blocked by a mentor. Resolve the feedback before further review.
									</div>
								{/if}
								<label class="flex flex-col gap-1.5 text-sm">
									<span style="color: var(--app-text-muted);">What did you complete?</span>
									<textarea
										name="notes"
										rows="3"
										class="rounded-xl px-3 py-2.5"
										style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
										placeholder="Describe what you built/demonstrated, tools used, and any issues."
										disabled={blockedByMentor}>{data.submission?.notes ?? ''}</textarea
									>
								</label>
								<label class="flex flex-col gap-1.5 text-sm">
									<input
										bind:this={photoInputEl}
										type="file"
										accept="image/*"
										capture="environment"
										multiple
										onchange={onPhotoSelected}
										disabled={blockedByMentor}
										class="hidden"
									/>
									<div class="flex flex-wrap items-center gap-3">
										<button
											type="button"
											onclick={openPhotoPicker}
											disabled={blockedByMentor}
											class="upload-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
										>
											<span>📷</span>
											Upload Photo or File
										</button>
										<span class="text-xs" style="color: var(--app-text-dim);">
											{uploadPreviews.length > 0
												? `${uploadPreviews.length} file${uploadPreviews.length === 1 ? '' : 's'} selected`
												: 'PNG/JPG, up to 4 files'}
										</span>
									</div>
									<input
										type="hidden"
										name="photo_data_urls_json"
										value={JSON.stringify(uploadPreviews)}
									/>
								</label>
								{#if uploadPreviews.length}
									<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
										{#each uploadPreviews as photo, idx}
											<div
												class="photo-preview group relative overflow-hidden rounded-xl border"
												style="border-color: var(--app-glass-border);"
											>
												<img
													src={photo}
													alt="Checkoff submission preview"
													class="h-24 w-full object-cover"
												/>
												<button
													type="button"
													onclick={() => removePhoto(idx)}
													class="absolute top-1.5 right-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
													style="background: color-mix(in srgb, var(--app-danger) 80%, transparent); color: white; backdrop-filter: blur(8px);"
												>
													Remove
												</button>
											</div>
										{/each}
									</div>
								{/if}
								{#if checkoffMessage}
									<p class="text-xs" style="color: var(--app-text-muted);">{checkoffMessage}</p>
								{/if}
								<Button variant="primary" type="submit" disabled={blockedByMentor}>
									{blockedByMentor ? 'Blocked by mentor' : 'Save checkoff submission'}
								</Button>
							</form>
							{#if data.review}
								<div
									class="rounded-xl border p-4 text-sm"
									style="background: var(--app-surface); border-color: var(--app-border);"
								>
									<p class="eyebrow-label mb-2">Latest mentor feedback</p>
									{#if data.reviewMentor}
										<p class="text-xs" style="color: var(--app-text-dim);">
											By {data.reviewMentor.full_name || data.reviewMentor.email}
										</p>
									{/if}
									<p class="mt-2 whitespace-pre-wrap" style="color: var(--app-text-muted);">
										{data.review.mentor_notes || 'No notes yet.'}
									</p>
									{#if data.review.status === 'needs_review'}
										<div
											class="mt-3 rounded-lg border p-2.5 text-xs"
											style="border-color: color-mix(in srgb, var(--app-warning) 40%, transparent); background: color-mix(in srgb, var(--app-warning) 8%, transparent); color: color-mix(in srgb, var(--app-warning) 70%, white);"
										>
											Mentor requested updates. Your current submission stays saved; update
											notes/photos and save again.
										</div>
									{/if}
									{#if data.review.status === 'blocked'}
										<div
											class="mt-3 rounded-lg border p-2.5 text-xs"
											style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 8%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);"
										>
											Mentor has blocked this checkoff pending safety/compliance resolution.
										</div>
									{/if}
									{#if (data.review.checklist_results ?? []).length > 0}
										<ul class="mt-3 space-y-1 text-xs" style="color: var(--app-text-muted);">
											{#each data.review.checklist_results as row}
												<li class="flex items-center gap-2">
													<span
														class="inline-block h-1.5 w-1.5 rounded-full"
														style={row.passed
															? 'background: var(--app-success);'
															: 'background: var(--app-danger);'}
													></span>
													{row.item}: {row.passed ? 'passed' : 'needs work'}
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>

			<!-- Sidebar: Mentor sign-off (shown whenever a checkoff block exists) -->
			{#if checkoffBlock}
				<div class="w-72 shrink-0">
					<div
						class="sticky top-6 rounded-2xl border p-4"
						style="background: var(--app-surface); border-color: var(--app-border);"
					>
						<p class="eyebrow-label mb-4">MENTOR SIGN-OFF</p>

						{#if checkoffChecklist.length > 0}
							<p class="sub-eyebrow mb-3">CHECKLIST — DEMONSTRATE TO MENTOR</p>
							<ul class="mb-4 space-y-2.5">
								{#each checkoffChecklist as item}
									<li class="flex items-start gap-2.5">
										<span
											class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border"
											style="border-color: var(--app-border);"
										></span>
										<span class="text-[13px] leading-snug" style="color: var(--app-text-muted);">{item}</span>
									</li>
								{/each}
							</ul>
						{/if}

						<div class="border-t pt-3" style="border-color: var(--app-border);">
							<p class="sub-eyebrow mb-2.5">MENTOR SIGNATURE — SCAN STUDENT PASSPORT</p>
							{#if completed}
								<StatusChip label="Approved ✓" tone="success" />
							{:else if awaitingMentor}
								<StatusChip label="Awaiting review" tone="info" />
							{:else}
								<StatusChip label="Awaiting demo" tone="warning" />
							{/if}
							{#if data.checkoffQrDataUrl && awaitingMentor}
								<div class="mt-3">
									<p class="mb-2 text-[11px]" style="color: var(--app-text-dim);">
										Show to mentor to approve directly.
									</p>
									<img
										src={data.checkoffQrDataUrl}
										alt="Checkoff approval QR"
										class="h-28 w-28 rounded-lg bg-white p-1.5"
									/>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.section-divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.section-divider-label {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--app-text);
		white-space: nowrap;
	}
	.section-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--divider-accent, var(--app-glass-border)) 60%, transparent),
			transparent
		);
	}

	.resource-link {
		background: var(--app-surface-alt);
		border-color: var(--app-border);
	}
	.resource-link:hover {
		background: var(--app-table-row-hover);
		border-color: color-mix(in srgb, var(--app-accent) 30%, transparent);
	}

	.upload-btn {
		background: var(--app-surface-alt);
		border-color: var(--app-border);
		color: var(--app-text);
	}
	.upload-btn:hover:not(:disabled) {
		background: var(--app-table-row-hover);
		border-color: color-mix(in srgb, var(--app-accent) 30%, transparent);
	}

	.photo-preview {
		background: var(--app-surface-alt);
	}

	.step-tracker-row > .step-tracker-btn + .step-tracker-btn {
		border-left: 1px solid var(--app-border);
	}
	.step-tracker-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--app-accent) 5%, var(--app-surface)) !important;
	}
	.step-tracker-btn:focus-visible {
		outline: 2px solid var(--app-accent);
		outline-offset: -2px;
	}

	.sub-eyebrow {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--app-text-dim);
	}
</style>
