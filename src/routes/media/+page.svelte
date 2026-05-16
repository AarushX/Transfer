<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	let { data } = $props();
</script>

<section class="space-y-5">
	<PageHeader title="Media" description="Photos from team events, organized by gathering." />

	{#if data.error}
		<div
			class="rounded-2xl border p-4 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{data.error}
		</div>
	{:else if data.events.length === 0}
		<EmptyState
			title="No events yet"
			description="When photos are uploaded to the Media Drive folder, events will show up here automatically."
		/>
	{:else}
		<div class="fade-up grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.events as event (event.id)}
				<a
					href={`/media/${event.id}`}
					class="event-card group relative overflow-hidden rounded-2xl border backdrop-blur-xl"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
					aria-label={`Open ${event.name} (${event.photoCount} photos)`}
				>
					<div class="event-cover relative aspect-[4/3] w-full overflow-hidden">
						{#if event.coverThumb}
							<img
								src={event.coverThumb}
								alt=""
								loading="lazy"
								referrerpolicy="no-referrer"
								class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
							/>
						{:else}
							<div
								class="grid h-full w-full place-items-center"
								style="background: linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 14%, var(--app-glass-bg)), var(--app-glass-bg));"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="h-10 w-10"
									style="color: var(--app-text-dim);"
								>
									<rect x="3" y="3" width="18" height="18" rx="2" />
									<circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
									<path d="m21 15-5-5L5 21" />
								</svg>
							</div>
						{/if}
						<div class="cover-fade pointer-events-none absolute inset-0"></div>
					</div>
					<div class="relative px-4 py-3">
						<p class="truncate text-sm font-semibold" style="color: var(--app-text);">{event.name}</p>
						<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">
							{event.photoCount} {event.photoCount === 1 ? 'photo' : 'photos'}
						</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>

<style>
	.event-card {
		transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
	}
	.event-card:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
		transform: translateY(-2px);
	}
	.cover-fade {
		background: linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--app-bg) 70%, transparent) 100%);
	}
</style>
