<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data } = $props();

	const PAGE_SIZE_OPTIONS = [30, 60, 120, 240] as const;
	const COLUMN_OPTIONS = [2, 3, 4, 5] as const;
	const SORT_OPTIONS = [
		{ key: 'newest', label: 'Newest' },
		{ key: 'oldest', label: 'Oldest' },
		{ key: 'name', label: 'Name' }
	] as const;
	type SortMode = (typeof SORT_OPTIONS)[number]['key'];

	let pageSize = $state<number>(60);
	let columns = $state<number>(3);
	let page = $state<number>(1);
	let sortMode = $state<SortMode>('newest');
	let lightboxIndex = $state<number | null>(null);
	let loaded = $state<Record<string, boolean>>({});
	let failed = $state<Record<string, boolean>>({});
	let showJumpInputIndex = $state<number | null>(null);

	const focusOnMount = (node: HTMLInputElement) => {
		node.focus();
		node.select();
	};

	// Server already returns photos newest-first (orderBy createdTime desc, name).
	// Reverse for oldest, sort by name for name-mode. Keep it pure so the derived
	// computation re-runs only when inputs change.
	const photos = $derived.by(() => {
		const base = data.photos;
		if (sortMode === 'oldest') return [...base].reverse();
		if (sortMode === 'name') return [...base].sort((a, b) => a.name.localeCompare(b.name));
		return base;
	});
	const totalPages = $derived(Math.max(1, Math.ceil(photos.length / pageSize)));
	// Keep page in range when pageSize changes.
	$effect(() => {
		if (page > totalPages) page = totalPages;
		if (page < 1) page = 1;
	});
	const start = $derived((page - 1) * pageSize);
	const end = $derived(Math.min(start + pageSize, photos.length));
	const visiblePhotos = $derived(photos.slice(start, end));
	const activePhoto = $derived(lightboxIndex !== null ? photos[lightboxIndex] : null);

	const aspectFor = (w: number | null, h: number | null) =>
		w && h && w > 0 && h > 0 ? `${w} / ${h}` : '4 / 3';

	const photoTimeFormat = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const formatPhotoTime = (iso: string) => {
		const date = new Date(iso);
		return Number.isNaN(date.getTime()) ? '' : photoTimeFormat.format(date);
	};

	// Compact numbered pagination — always shows first, last, neighbors,
	// with "…" gaps. ['‹', 1, '…', 4, 5, 6, '…', 12, '›']
	const pageNumbers = $derived.by(() => {
		const out: Array<number | 'gap'> = [];
		const push = (v: number | 'gap') => {
			if (v === 'gap' && out[out.length - 1] === 'gap') return;
			out.push(v);
		};
		const inWindow = (n: number) => Math.abs(n - page) <= 1;
		for (let n = 1; n <= totalPages; n++) {
			if (n === 1 || n === totalPages || inWindow(n)) push(n);
			else push('gap');
		}
		return out;
	});

	const goToPage = (n: number) => {
		page = Math.min(totalPages, Math.max(1, n));
		// Smooth-scroll to the gallery top so the new page is in view.
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const open = (index: number) => {
		lightboxIndex = index;
	};
	const close = () => {
		lightboxIndex = null;
	};
	const next = () => {
		if (lightboxIndex === null || photos.length === 0) return;
		lightboxIndex = (lightboxIndex + 1) % photos.length;
	};
	const prev = () => {
		if (lightboxIndex === null || photos.length === 0) return;
		lightboxIndex = (lightboxIndex - 1 + photos.length) % photos.length;
	};

	function handleKey(event: KeyboardEvent) {
		if (lightboxIndex === null) return;
		if (event.key === 'Escape') close();
		else if (event.key === 'ArrowRight') {
			event.preventDefault();
			next();
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			prev();
		}
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Preload adjacent images for rapid, lag-free navigation
	$effect(() => {
		if (lightboxIndex === null || photos.length === 0) return;
		const preloads = [
			(lightboxIndex + 1) % photos.length,
			(lightboxIndex + 2) % photos.length,
			(lightboxIndex - 1 + photos.length) % photos.length
		];
		for (const idx of preloads) {
			const img = new Image();
			img.src = photos[idx].full;
		}
	});

	const onImgLoad = (id: string) => {
		loaded = { ...loaded, [id]: true };
	};
	const onImgError = (id: string) => {
		failed = { ...failed, [id]: true };
	};
</script>

<svelte:window onkeydown={handleKey} />

<section class="space-y-5">
	<header class="fade-up flex flex-wrap items-end justify-between gap-3">
		<div>
			<a href="/media" class="text-xs" style="color: var(--app-text-muted);">← Back to media</a>
			<h1
				class="mt-1 text-2xl font-bold tracking-tight"
				style="color: var(--app-text); letter-spacing: -0.025em;"
			>
				{data.eventName}
			</h1>
			<p class="mt-0.5 text-sm" style="color: var(--app-text-muted);">
				{photos.length}
				{photos.length === 1 ? 'photo' : 'photos'}
			</p>
		</div>
		<Button variant="secondary" href={data.driveUrl}>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-4 w-4"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			Download all
		</Button>
	</header>

	{#if data.error}
		<div
			class="rounded-2xl border p-4 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{data.error}
		</div>
	{:else if photos.length === 0}
		<EmptyState
			title="No photos in this event"
			description="Upload images to the Drive folder and they'll appear here."
		/>
	{:else}
		<!-- Floating control bar: grid density + per-page selector -->
		<div
			class="gallery-controls sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 backdrop-blur-xl"
			style="background: color-mix(in srgb, var(--app-glass-bg) 85%, transparent); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<div class="flex items-center gap-2">
				<span class="eyebrow-label" style="margin-bottom: 0;">Grid</span>
				<div class="control-segment">
					{#each COLUMN_OPTIONS as col (col)}
						<button
							type="button"
							class="seg-btn"
							data-active={col === columns}
							onclick={() => (columns = col)}
							aria-label={`${col} columns`}
						>
							{col}×
						</button>
					{/each}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<span class="eyebrow-label" style="margin-bottom: 0;">Sort</span>
				<div class="control-segment">
					{#each SORT_OPTIONS as opt (opt.key)}
						<button
							type="button"
							class="seg-btn"
							data-active={opt.key === sortMode}
							onclick={() => {
								sortMode = opt.key;
								page = 1;
							}}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<span class="eyebrow-label" style="margin-bottom: 0;">Per page</span>
				<div class="control-segment">
					{#each PAGE_SIZE_OPTIONS as size (size)}
						<button
							type="button"
							class="seg-btn"
							data-active={size === pageSize}
							onclick={() => {
								pageSize = size;
								page = 1;
							}}
						>
							{size}
						</button>
					{/each}
				</div>
				<span class="text-[11px]" style="color: var(--app-text-dim);">
					{start + 1}–{end} of {photos.length}
				</span>
			</div>
		</div>

		<div class="masonry" style="--cols: {columns};">
			{#each visiblePhotos as photo, i (photo.id)}
				<button
					type="button"
					class="tile group relative overflow-hidden rounded-xl border"
					style="border-color: var(--app-glass-border); aspect-ratio: {aspectFor(
						photo.width,
						photo.height
					)};"
					onclick={() => open(start + i)}
					disabled={failed[photo.id]}
					aria-label={failed[photo.id] ? `${photo.name} failed to load` : `Open ${photo.name}`}
				>
					{#if !loaded[photo.id] && !failed[photo.id]}
						<div class="skeleton absolute inset-0" aria-hidden="true"></div>
					{/if}
					{#if failed[photo.id]}
						<div
							class="absolute inset-0 grid place-items-center"
							style="background: var(--app-glass-bg); color: var(--app-text-dim);"
							aria-hidden="true"
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="h-7 w-7 opacity-60"
							>
								<rect x="3" y="3" width="18" height="18" rx="2" />
								<circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
								<path d="m21 15-5-5L5 21" />
								<line x1="3" y1="3" x2="21" y2="21" />
							</svg>
						</div>
					{:else}
						<img
							src={photo.thumb}
							alt={photo.name}
							referrerpolicy="no-referrer"
							decoding="async"
							loading="lazy"
							onload={() => onImgLoad(photo.id)}
							onerror={() => onImgError(photo.id)}
							class="absolute inset-0 block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
							style="opacity: {loaded[photo.id]
								? 1
								: 0}; transition: opacity 0.35s ease, transform 0.5s ease;"
						/>
					{/if}
					<div class="tile-fade pointer-events-none absolute inset-0"></div>
				</button>
			{/each}
		</div>

		{#if totalPages > 1}
			<nav
				class="page-bar mt-6 flex flex-wrap items-center justify-center gap-1"
				aria-label="Gallery pagination"
			>
				<button
					type="button"
					class="page-btn"
					onclick={() => goToPage(page - 1)}
					disabled={page <= 1}
					aria-label="Previous page"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-3.5 w-3.5"><polyline points="15 18 9 12 15 6" /></svg
					>
				</button>
				{#each pageNumbers as item, i (i)}
					{#if item === 'gap'}
						{#if showJumpInputIndex === i}
							<input
								type="number"
								min="1"
								max={totalPages}
								class="page-btn page-input-jump"
								placeholder="..."
								use:focusOnMount
								onblur={() => (showJumpInputIndex = null)}
								onkeydown={(e) => {
									if (e.key === 'Escape') {
										showJumpInputIndex = null;
									} else if (e.key === 'Enter') {
										const val = parseInt(e.currentTarget.value, 10);
										if (!isNaN(val) && val >= 1 && val <= totalPages) {
											goToPage(val);
										}
										showJumpInputIndex = null;
									}
								}}
							/>
						{:else}
							<button
								type="button"
								class="page-gap-btn"
								onclick={() => (showJumpInputIndex = i)}
								title="Click to jump to a page"
								aria-label="Jump to page"
							>
								…
							</button>
						{/if}
					{:else}
						<button
							type="button"
							class="page-btn"
							data-active={item === page}
							aria-current={item === page ? 'page' : undefined}
							onclick={() => goToPage(item)}>{item}</button
						>
					{/if}
				{/each}
				<button
					type="button"
					class="page-btn"
					onclick={() => goToPage(page + 1)}
					disabled={page >= totalPages}
					aria-label="Next page"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-3.5 w-3.5"><polyline points="9 18 15 12 9 6" /></svg
					>
				</button>
			</nav>
		{/if}
	{/if}
</section>

{#if activePhoto}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label={activePhoto.name}
		onclick={close}
	>
		<button
			type="button"
			class="lightbox-arrow lightbox-arrow--left"
			onclick={(event) => {
				event.stopPropagation();
				prev();
			}}
			aria-label="Previous photo"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-6 w-6"><polyline points="15 18 9 12 15 6" /></svg
			>
		</button>

		<button
			type="button"
			class="lightbox-close"
			onclick={(event) => {
				event.stopPropagation();
				close();
			}}
			aria-label="Close"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				class="h-5 w-5"><path d="M18 6 6 18M6 6l12 12" /></svg
			>
		</button>

		<figure class="lightbox-figure" onclick={(event) => event.stopPropagation()}>
			<img
				src={activePhoto.full}
				alt={activePhoto.name}
				referrerpolicy="no-referrer"
				class="lightbox-image"
			/>
			<figcaption class="lightbox-caption">
				<div class="lightbox-meta">
					<span class="truncate font-medium">{activePhoto.name}</span>
					<span class="lightbox-meta-row">
						<span>Uploaded by {activePhoto.uploader ?? 'Unknown'}</span>
						{#if activePhoto.createdTime}
							<span aria-hidden="true">·</span>
							<span>{formatPhotoTime(activePhoto.createdTime)}</span>
						{/if}
						<span aria-hidden="true">·</span>
						<span class="truncate">{data.eventName}</span>
					</span>
				</div>
				<span class="opacity-60">
					{(lightboxIndex ?? 0) + 1} / {photos.length}
				</span>
			</figcaption>
		</figure>

		<button
			type="button"
			class="lightbox-arrow lightbox-arrow--right"
			onclick={(event) => {
				event.stopPropagation();
				next();
			}}
			aria-label="Next photo"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-6 w-6"><polyline points="9 18 15 12 9 6" /></svg
			>
		</button>
	</div>
{/if}

<style>
	.masonry {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 0.75rem;
		align-items: start;
	}
	@media (min-width: 640px) {
		.masonry {
			grid-template-columns: repeat(min(2, var(--cols, 3)), minmax(0, 1fr));
		}
	}
	@media (min-width: 1024px) {
		.masonry {
			grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
		}
	}
	.tile {
		display: block;
		width: 100%;
		margin: 0;
		cursor: pointer;
		padding: 0;
		transition:
			border-color 0.2s ease,
			transform 0.2s ease;
	}
	.tile:hover:not(:disabled) {
		border-color: var(--app-glass-border-hover);
	}
	.tile:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}
	.tile-fade {
		background: linear-gradient(
			180deg,
			transparent 70%,
			color-mix(in srgb, var(--app-bg) 55%, transparent) 100%
		);
	}
	.skeleton {
		background-color: color-mix(in srgb, var(--app-text-muted) 12%, var(--app-glass-bg));
		background-image: linear-gradient(
			110deg,
			transparent 25%,
			color-mix(in srgb, var(--app-text-muted) 18%, transparent) 50%,
			transparent 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.4s linear infinite;
	}
	@keyframes shimmer {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -200% 0;
		}
	}
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: color-mix(in srgb, black 88%, transparent);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		animation: lightbox-fade 0.2s ease;
		cursor: zoom-out;
	}
	@keyframes lightbox-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.lightbox-figure {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		max-height: 100%;
		cursor: default;
	}
	.lightbox-image {
		max-width: min(95vw, 1400px);
		max-height: calc(100vh - 6rem);
		object-fit: contain;
		border-radius: 12px;
		box-shadow: 0 24px 80px -12px rgba(0, 0, 0, 0.6);
		animation: lightbox-pop 0.25s cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	@keyframes lightbox-pop {
		from {
			opacity: 0;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.lightbox-caption {
		display: flex;
		max-width: min(95vw, 1400px);
		width: 100%;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.78);
	}
	.lightbox-meta {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.125rem;
	}
	.lightbox-meta-row {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		gap: 0.375rem;
		color: rgba(255, 255, 255, 0.6);
	}
	.lightbox-arrow {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.08);
		color: white;
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.15s ease;
	}
	.lightbox-arrow:hover {
		background: rgba(255, 255, 255, 0.18);
		transform: scale(1.05);
	}
	.lightbox-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.08);
		color: white;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.18);
	}

	.control-segment {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 2px;
		border-radius: 9px;
		border: 1px solid var(--app-glass-border);
		background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);
	}
	.seg-btn {
		min-width: 28px;
		padding: 3px 8px;
		border: none;
		border-radius: 7px;
		background: transparent;
		color: var(--app-text-muted);
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.seg-btn:hover {
		color: var(--app-text);
	}
	.seg-btn[data-active='true'] {
		background: color-mix(in srgb, var(--app-accent) 22%, transparent);
		color: var(--app-text);
	}

	.page-bar .page-btn {
		min-width: 32px;
		height: 32px;
		padding: 0 8px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--app-glass-border);
		background: var(--app-glass-bg);
		border-radius: 8px;
		color: var(--app-text-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.page-bar .page-btn:hover:not(:disabled) {
		background: var(--app-glass-bg-hover);
		color: var(--app-text);
		border-color: var(--app-glass-border-hover);
	}
	.page-bar .page-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.page-bar .page-btn[data-active='true'] {
		background: color-mix(in srgb, var(--app-accent) 22%, transparent);
		border-color: color-mix(in srgb, var(--app-accent) 50%, var(--app-glass-border));
		color: var(--app-text);
	}

	.page-gap-btn {
		min-width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px dashed var(--app-glass-border);
		background: transparent;
		border-radius: 8px;
		color: var(--app-text-muted);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.page-gap-btn:hover {
		color: var(--app-text);
		border-color: var(--app-accent);
		background: color-mix(in srgb, var(--app-accent) 8%, transparent);
	}
	.page-input-jump {
		width: 48px;
		text-align: center;
		padding: 0;
		outline: none;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.page-input-jump::-webkit-outer-spin-button,
	.page-input-jump::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.gallery-controls {
		/* Sits above the masonry header but below the lightbox */
		z-index: 10;
	}
</style>
