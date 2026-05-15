<script lang="ts">
	let { courses }: { courses: Array<{ id: string; title: string; slug: string; subteamLabel: string }> } = $props();
</script>

<div class="rounded-2xl border p-4" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
	<div class="flex items-center justify-between mb-2">
		<p class="text-[10px] tracking-[0.18em] uppercase font-bold" style="color: var(--app-text-muted);">Up next · {courses.length} courses</p>
		<a href="/courses/map" class="text-xs" style="color: var(--app-link);">See all →</a>
	</div>
	<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
		{#each courses as c (c.id)}
			<a href={`/learn/${c.slug}`} class="w-44 shrink-0 rounded-xl border p-3" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
				<p class="font-semibold text-sm leading-tight" style="color: var(--app-text);">{c.title}</p>
				<p class="text-[10px] mt-1" style="color: var(--app-text-muted);">{c.subteamLabel}</p>
			</a>
		{/each}
	</div>
</div>
