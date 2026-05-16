<script lang="ts">
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { onMount, tick } from 'svelte';
	let { data } = $props();

	const PAGE_SIZE = 30;
	let visibleCount = $state(PAGE_SIZE);
	let lightboxIndex = $state<number | null>(null);
	let loaded = $state<Record<string, boolean>>({});
	let tiles: HTMLElement[] = [];
	let io: IntersectionObserver | null = null;
	let sentinel = $state<HTMLDivElement | null>(null);
	let sentinelObserver: IntersectionObserver | null = null;

	const photos = $derived(data.photos);
	const visiblePhotos = $derived(photos.slice(0, visibleCount));
	const hasMore = $derived(visibleCount < photos.length);
	const activePhoto = $derived(lightboxIndex !== null ? photos[lightboxIndex] : null);

	const aspectFor = (w: number | null, h: number | null) =>
		w && h && w > 0 && h > 0 ? `${w} / ${h}` : '4 / 3';

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

	const observeTile = (el: HTMLElement | null | undefined) => {
		if (!el || !io) return;
		io.observe(el);
	};

	// Re-observe whenever visibleCount changes (new tiles get appended).
	$effect(() => {
		// Read visibleCount so this effect tracks it.
		visibleCount;
		if (!io) return;
		// Wait one tick for the new tiles to render, then observe.
		tick().then(() => {
			for (const el of tiles) if (el) io?.observe(el);
		});
	});

	const showMore = () => {
		visibleCount = Math.min(photos.length, visibleCount + PAGE_SIZE);
	};

	onMount(() => {
		if (typeof IntersectionObserver === 'undefined') {
			// Older browsers: skip lazy loading entirely.
			for (const el of tiles) {
				const img = el?.querySelector<HTMLImageElement>('img[data-src]');
				if (img?.dataset.src) img.src = img.dataset.src;
			}
			return;
		}
		io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const img = entry.target.querySelector<HTMLImageElement>('img[data-src]');
					if (img?.dataset.src) {
						img.src = img.dataset.src;
						img.removeAttribute('data-src');
					}
					io?.unobserve(entry.target);
				}
			},
			// Generous bottom margin so images near the fold start loading just
			// before they enter the viewport.
			{ rootMargin: '400px 0px 600px 0px', threshold: 0.01 }
		);
		for (const el of tiles) if (el) io.observe(el);

		// Auto-load the next page as the user approaches the bottom.
		sentinelObserver = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) showMore();
			},
			{ rootMargin: '300px 0px' }
		);
		if (sentinel) sentinelObserver.observe(sentinel);

		return () => {
			io?.disconnect();
			sentinelObserver?.disconnect();
			io = null;
			sentinelObserver = null;
		};
	});

	// Re-observe sentinel whenever it remounts (e.g. when hasMore flips).
	$effect(() => {
		if (sentinel && sentinelObserver) {
			sentinelObserver.observe(sentinel);
		}
	});

	const onImgLoad = (id: string) => {
		loaded = { ...loaded, [id]: true };
	};
</script>

<svelte:window onkeydown={handleKey} />

<section class="space-y-5">
	<header class="fade-up flex flex-wrap items-end justify-between gap-3">
		<div>
			<a href="/media" class="text-xs" style="color: var(--app-text-muted);">← Back to media</a>
			<h1 class="mt-1 text-2xl font-bold tracking-tight" style="color: var(--app-text); letter-spacing: -0.025em;">
				{data.eventName}
			</h1>
			<p class="mt-0.5 text-sm" style="color: var(--app-text-muted);">
				{photos.length} {photos.length === 1 ? 'photo' : 'photos'}
			</p>
		</div>
		<Button variant="secondary" href={data.driveUrl}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
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
		<EmptyState title="No photos in this event" description="Upload images to the Drive folder and they'll appear here." />
	{:else}
		<div class="masonry">
			{#each visiblePhotos as photo, i (photo.id)}
				<button
					type="button"
					class="tile group relative overflow-hidden rounded-xl border"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); aspect-ratio: {aspectFor(photo.width, photo.height)};"
					onclick={() => open(i)}
					bind:this={tiles[i]}
					aria-label={`Open ${photo.name}`}
				>
					{#if !loaded[photo.id]}
						<div class="skeleton absolute inset-0" aria-hidden="true"></div>
					{/if}
					<img
						alt={photo.name}
						data-src={photo.thumb}
						referrerpolicy="no-referrer"
						decoding="async"
						loading="lazy"
						onload={() => onImgLoad(photo.id)}
						class="absolute inset-0 block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
						style="opacity: {loaded[photo.id] ? 1 : 0}; transition: opacity 0.4s ease, transform 0.5s ease;"
					/>
					<div class="tile-fade pointer-events-none absolute inset-0"></div>
				</button>
			{/each}
		</div>

		{#if hasMore}
			<div
				bind:this={sentinel}
				class="mt-4 flex items-center justify-center"
			>
				<Button variant="secondary" onclick={showMore}>
					Load more
					<span class="ml-1 text-[11px]" style="opacity: 0.65;">
						({Math.min(PAGE_SIZE, photos.length - visibleCount)} of {photos.length - visibleCount} left)
					</span>
				</Button>
			</div>
		{:else if photos.length > PAGE_SIZE}
			<p class="mt-4 text-center text-xs" style="color: var(--app-text-dim);">
				All {photos.length} photos loaded
			</p>
		{/if}
	{/if}
</section>

{#if activePhoto}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="lightbox" role="dialog" aria-modal="true" aria-label={activePhoto.name} onclick={close}>
		<button
			type="button"
			class="lightbox-arrow lightbox-arrow--left"
			onclick={(event) => {
				event.stopPropagation();
				prev();
			}}
			aria-label="Previous photo"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><polyline points="15 18 9 12 15 6" /></svg>
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
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="h-5 w-5"><path d="M18 6 6 18M6 6l12 12" /></svg>
		</button>

		<figure class="lightbox-figure" onclick={(event) => event.stopPropagation()}>
			<img
				src={activePhoto.full}
				alt={activePhoto.name}
				referrerpolicy="no-referrer"
				class="lightbox-image"
			/>
			<figcaption class="lightbox-caption">
				<span class="truncate">{activePhoto.name}</span>
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
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><polyline points="9 18 15 12 9 6" /></svg>
		</button>
	</div>
{/if}

<style>
	.masonry {
		column-count: 1;
		column-gap: 0.75rem;
	}
	@media (min-width: 640px) {
		.masonry {
			column-count: 2;
		}
	}
	@media (min-width: 1024px) {
		.masonry {
			column-count: 3;
		}
	}
	@media (min-width: 1536px) {
		.masonry {
			column-count: 4;
		}
	}
	.tile {
		display: block;
		width: 100%;
		margin: 0 0 0.75rem 0;
		break-inside: avoid;
		cursor: pointer;
		padding: 0;
		transition: border-color 0.2s ease, transform 0.2s ease;
	}
	.tile:hover {
		border-color: var(--app-glass-border-hover);
	}
	.tile-fade {
		background: linear-gradient(180deg, transparent 70%, color-mix(in srgb, var(--app-bg) 55%, transparent) 100%);
	}
	.skeleton {
		background: linear-gradient(
			110deg,
			color-mix(in srgb, var(--app-glass-bg) 60%, transparent) 25%,
			color-mix(in srgb, var(--app-glass-bg-hover) 80%, transparent) 50%,
			color-mix(in srgb, var(--app-glass-bg) 60%, transparent) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.2s linear infinite;
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
		gap: 1rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.78);
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
		transition: background 0.15s ease, transform 0.15s ease;
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
</style>
