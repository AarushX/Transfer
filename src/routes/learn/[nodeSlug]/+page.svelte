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
		locked: { label: 'Locked — finish prerequisites first', tone: 'slate' },
		available: { label: 'Available', tone: 'slate' },
		video_pending: { label: 'In progress', tone: 'slate' },
		quiz_pending: { label: 'In progress', tone: 'yellow' },
		mentor_checkoff_pending: { label: 'Awaiting mentor checkoff', tone: 'sky' },
		checkoff_needs_review: { label: 'Action required: redo checkoff', tone: 'yellow' },
		checkoff_blocked: { label: 'Blocked by mentor', tone: 'red' },
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

	function blockTypeChip(type: BlockType): string {
		if (type === 'video') return 'chip-cyan';
		if (type === 'quiz') return 'chip-amber';
		if (type === 'reading') return 'chip-violet';
		return 'chip-emerald';
	}

	function blockTypeIcon(type: BlockType): string {
		if (type === 'video') return '▶';
		if (type === 'quiz') return '?';
		if (type === 'reading') return '📖';
		return '✓';
	}

	function blockTypeLabel(type: BlockType): string {
		if (type === 'video') return 'Video';
		if (type === 'quiz') return 'Quiz';
		if (type === 'reading') return 'Reading';
		return 'Skills Check';
	}

	function blockSummary(block: LearnBlock): string {
		const cfg = block.config;
		if (block.type === 'video') return String(cfg.title ?? 'Video');
		if (block.type === 'quiz') {
			const count = Array.isArray(cfg.questions) ? cfg.questions.length : 0;
			return `${cfg.title || 'Quiz'} · ${count} question${count === 1 ? '' : 's'}`;
		}
		if (block.type === 'reading') {
			const count = Array.isArray(cfg.resource_links) ? cfg.resource_links.length : 0;
			return `${cfg.title || 'Reading'} · ${count} resource${count === 1 ? '' : 's'}`;
		}
		return String(cfg.title ?? 'Skills Check');
	}

	// Same as blockSummary but no "· N questions/resources" suffix and no
	// fallback "Quiz" / "Reading" label — used by the inline step heading in
	// the body so the title reads as a real heading instead of a breadcrumb.
	// The bottom block-strip still uses blockSummary() for the full label.
	function blockTitle(block: LearnBlock): string {
		const cfg = block.config;
		const raw = String(cfg.title ?? '').trim();
		if (raw) return raw;
		if (block.type === 'video') return 'Video';
		if (block.type === 'quiz') return 'Quiz';
		if (block.type === 'reading') return 'Reading';
		return 'Skills Check';
	}

	const completedBlockCount = $derived(blocks.filter((b) => isBlockCompleted(b)).length);
	const progressPercent = $derived(
		blocks.length > 0 ? Math.round((completedBlockCount / blocks.length) * 100) : 0
	);
</script>

<!-- Top bar: fixed to the viewport edges so it mirrors the bottom block-strip
     instead of floating inside main's padding. Breaks out of the layout's
     `mx-auto max-w-6xl px-6 md:px-10 py-8 md:py-10` wrapper. -->
<div class="fixed top-0 right-0 left-0 z-20 md:left-64">
	<header
		class="course-topbar border-b backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<!-- Row padding (py-4) matches the sidebar header's py-4 so the two
		     headers line up at the same horizontal axis on desktop. -->
		<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
			<div class="flex min-w-0 items-center gap-3">
				<a
					href="/dashboard"
					class="shrink-0 text-xs font-semibold transition-colors hover:brightness-125"
					style="color: var(--app-text-dim);">← Dashboard</a
				>
				<span
					class="h-4 w-px shrink-0"
					style="background: var(--app-glass-border);"
					aria-hidden="true"
				></span>
				<h1
					class="truncate text-base font-semibold tracking-tight"
					style="color: var(--app-text);"
				>
					{data.node.title}
				</h1>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<StatusChip label={statusInfo.label} tone={statusTone} />
				{#if blocks.length > 0}
					<span class="flex items-center gap-1">
						{#each blocks as block, i (block.id)}
							{@const done = isBlockCompleted(block)}
							{@const current = i === activeBlockIndex && !done}
							<span
								class="inline-block h-2 w-2 rounded-full transition-all"
								style={done
									? 'background: var(--app-success); box-shadow: 0 0 6px var(--app-success);'
									: current
										? 'background: var(--app-warning); box-shadow: 0 0 6px var(--app-warning);'
										: 'background: color-mix(in srgb, var(--app-text) 15%, transparent);'}
								title={`${blockTypeLabel(block.type)}: ${done ? 'Complete' : current ? 'Current' : 'Upcoming'}`}
							></span>
						{/each}
					</span>
					<span class="mono text-xs" style="color: var(--app-text-dim);"
						>{completedBlockCount}/{blocks.length}</span
					>
				{/if}
			</div>
		</div>
		<!-- Progress bar sits flush with the bottom border so the bar's
		     overall height stays in lock-step with the sidebar header. No
		     extra padding below. -->
		{#if blocks.length > 0}
			<div class="aurora-progress" style="height: 3px; border-radius: 0;">
				<div class="aurora-progress-fill" style="width: {progressPercent}%;"></div>
			</div>
		{/if}
		{#if data.previewBypass}
			<p class="px-4 pb-2 text-xs md:px-6" style="color: var(--app-info);">
				Preview mode: prerequisite locks are bypassed for mentor/admin preview.
			</p>
		{/if}
	</header>
</div>

<!-- pt-12 clears the fixed top bar (~60px = py-4 row + 3px progress) with a
     small visual buffer below. main's existing py-8 stacks on top of this
     padding, so first-child y ≈ 32 (main) + 48 (section pt) = 80px from
     viewport top — bar bottom is at ~60, giving a clean ~20px gap. -->
<section class="space-y-4 pt-12">

	{#if awaitingMentor && !completed}
		<div
			class="fade-up glass-card relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
			style="animation-delay: 0.06s;"
		>
			<div
				class="pointer-events-none absolute inset-0 rounded-2xl"
				style="background: var(--app-glass-shine);"
			></div>
			<div class="relative">
				<p class="eyebrow-label mb-2">Mentor Review</p>
				<h2 class="text-lg font-semibold" style="color: var(--app-text);">
					Awaiting mentor checkoff
				</h2>
				<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
					Your checkoff submission is ready for mentor review.
				</p>
				{#if data.reviewMentor}
					<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
						Last reviewed by {data.reviewMentor.full_name || data.reviewMentor.email}.
					</p>
				{/if}
				{#if data.checkoffQrDataUrl}
					<div
						class="mt-4 rounded-xl border p-4"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
					>
						<p class="text-xs" style="color: var(--app-text-muted);">
							Show this QR to a mentor. Scanning it approves this submitted checkoff directly.
						</p>
						<img
							src={data.checkoffQrDataUrl}
							alt="Checkoff approval QR"
							class="mt-3 h-36 w-36 rounded-lg bg-white p-2"
						/>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if completed || allBlocksComplete}
		<div
			class="fade-up glass-card relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl"
			style="animation-delay: 0.06s;"
		>
			<div
				class="pointer-events-none absolute inset-0 rounded-2xl"
				style="background: var(--app-glass-shine);"
			></div>
			<div class="relative">
				<div class="mb-2 flex items-center gap-2">
					<span
						class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs"
						style="background: color-mix(in srgb, var(--app-success) 20%, transparent); color: var(--app-success);"
						>✓</span
					>
					<h2 class="text-lg font-semibold" style="color: var(--app-text);">Completed</h2>
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
		</div>
	{/if}

	{#if locked}
		<div class="fade-up space-y-6" style="animation-delay: 0.06s;">
			<p class="text-sm" style="color: var(--app-text-muted);">
				This module is locked. Knock out its prerequisites first — the doable
				ones are right below. Your full plan is on the
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
			class="fade-up glass-card relative overflow-hidden rounded-2xl border p-5 text-sm backdrop-blur-xl"
			style="animation-delay: 0.06s;"
		>
			<div
				class="pointer-events-none absolute inset-0 rounded-2xl"
				style="background: var(--app-glass-shine);"
			></div>
			<p class="relative" style="color: var(--app-text-muted);">
				No blocks have been added to this module yet. Ask a mentor to configure the course.
			</p>
		</div>
	{:else}
		<div class="space-y-4 pb-24">
			{#if activeBlock}
				{@const icon = blockTypeIcon(activeBlock.type)}
				<div class="fade-up space-y-3" style="animation-delay: 0.08s;">
					<!-- Step heading: icon + clean title only. The "2. Quiz · 7 questions"
					     breadcrumb-style label still lives in the bottom block-strip; up
					     here we want the title to read as a real heading. -->
					<div class="flex flex-wrap items-center gap-2.5">
						<h2
							class="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold"
							style="color: var(--app-text);"
						>
							<span aria-hidden="true" style="color: var(--app-accent);">{icon}</span>
							<span class="truncate">{blockTitle(activeBlock)}</span>
						</h2>
						{#if isBlockCompleted(activeBlock)}
							<span
								class="chip-emerald inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
								>✓ Done</span
							>
						{/if}
					</div>
					<!-- Body of the active block follows. -->
					<div class="space-y-3">

						{#if activeBlock.type === 'video'}
							{@const vid = extractVideoId(activeBlock.config.video_url)}
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
								style="border-color: var(--app-glass-border);"
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
								/>
							{/if}
						{:else if activeBlock.type === 'reading'}
							{@const c = activeBlock.config}
							<div class="space-y-4">
								{#if c.content}
									<div
										class="rounded-xl border p-4 text-sm whitespace-pre-wrap"
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
									>
										{c.content}
									</div>
								{/if}
								{#if Array.isArray(c.resource_links) && c.resource_links.length > 0}
									<div
										class="rounded-xl border p-4"
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
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
									style="border-color: var(--app-glass-border);"
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
							{@const c = activeBlock.config}
							<div class="space-y-4">
								{#if c.directions}
									<p class="text-sm whitespace-pre-wrap" style="color: var(--app-text-muted);">
										{c.directions}
									</p>
								{/if}
								{#if c.show_mentor_checklist_to_students && Array.isArray(c.mentor_checklist) && c.mentor_checklist.length > 0}
									<div
										class="rounded-xl border p-4"
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
									>
										<p class="eyebrow-label mb-2">Mentor checklist</p>
										<ul class="space-y-1.5 text-sm" style="color: var(--app-text);">
											{#each c.mentor_checklist as item}
												<li class="flex items-start gap-2">
													<span
														class="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
														style="background: var(--app-text-dim);"
													></span>
													{item}
												</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if Array.isArray(c.resource_links) && c.resource_links.length > 0}
									<div
										class="rounded-xl border p-4"
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
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
									style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
								>
									<p class="eyebrow-label">Submission</p>
									<input type="hidden" name="block_id" value={activeBlock.id} />
									{#if blockedByMentor}
										<div
											class="rounded-lg border p-3 text-xs"
											style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
										>
											This checkoff is blocked by a mentor. Resolve the feedback before further
											review.
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
										style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
									>
										<div
											class="pointer-events-none absolute inset-0 rounded-xl"
											style="background: var(--app-glass-shine);"
										></div>
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
					</div>
				</div>
			{/if}

			<div class="fixed right-0 bottom-0 left-0 z-30 md:left-64">
				<div class="block-strip overflow-x-auto border-t px-3 py-2.5 backdrop-blur-xl">
					<div class="flex min-w-max items-stretch gap-2">
						{#each blocks as block, i (block.id)}
							{@const done = isBlockCompleted(block)}
							{@const current = i === activeBlockIndex && !done}
							{@const chipClass = blockTypeChip(block.type)}
							{@const icon = blockTypeIcon(block.type)}
							{@const accessible = allBlocksComplete || i <= activeBlockIndex}
							{@const selected = i === selectedBlockIndex}
							<button
								type="button"
								onclick={() => {
									if (!accessible) return;
									hasManualBlockSelection = true;
									selectedBlockIndex = i;
								}}
								disabled={!accessible}
								class="strip-block min-w-[180px] rounded-xl border px-3 py-2.5 text-left text-xs transition-all"
								class:strip-done={done}
								class:strip-current={current && !done}
								class:strip-selected={selected}
								class:strip-locked={!accessible}
							>
								<div class="flex items-center gap-1.5">
									<span class="text-sm">{icon}</span>
									<p class="truncate font-semibold" style="color: var(--app-text);">
										{i + 1}. {blockSummary(block)}
									</p>
								</div>
								<div class="mt-1.5 flex items-center gap-2">
									<span
										class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${chipClass}`}
										>{blockTypeLabel(block.type)}</span
									>
									{#if done}
										<span
											class="chip-emerald inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
											>✓ Done</span
										>
									{:else if current}
										<span
											class="chip-amber inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
											>Current</span
										>
									{:else}
										<span class="text-[10px]" style="color: var(--app-text-dim);">Upcoming</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.glass-card {
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
		box-shadow: var(--app-glass-shadow);
		backdrop-filter: blur(20px) saturate(140%);
		-webkit-backdrop-filter: blur(20px) saturate(140%);
	}

	/* Section divider used in the locked-course prereq listing. Same pattern
	   as the subteam / coursework pages. */
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
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
	}
	.resource-link:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}

	.upload-btn {
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
		color: var(--app-text);
	}
	.upload-btn:hover:not(:disabled) {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}

	.photo-preview {
		background: var(--app-glass-bg);
	}

	.block-strip {
		border-color: var(--app-glass-border);
		background: color-mix(in srgb, var(--app-surface) 85%, transparent);
		backdrop-filter: blur(20px) saturate(140%);
		-webkit-backdrop-filter: blur(20px) saturate(140%);
	}

	.strip-block {
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
		cursor: pointer;
	}
	.strip-block:hover:not(:disabled) {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
	.strip-done {
		border-color: color-mix(in srgb, var(--app-success) 40%, transparent);
		background: color-mix(in srgb, var(--app-success) 6%, transparent);
	}
	.strip-current {
		border-color: color-mix(in srgb, var(--app-warning) 50%, transparent);
		background: color-mix(in srgb, var(--app-warning) 8%, transparent);
	}
	.strip-selected {
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--app-accent) 50%, transparent),
			0 0 12px -2px color-mix(in srgb, var(--app-accent) 25%, transparent);
	}
	.strip-locked {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
