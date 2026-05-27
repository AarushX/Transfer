<script lang="ts">
	let {
		courses
	}: { courses: Array<{ id: string; title: string; slug: string; subteamLabel: string }> } =
		$props();
</script>

{#if courses.length > 0}
	<div
		class="rounded-2xl border p-4"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<div class="mb-2 flex items-center justify-between">
			<p
				class="text-[10px] font-bold tracking-[0.18em] uppercase"
				style="color: var(--app-text-muted);"
			>
				Courses you need · {courses.length}
			</p>
			<a href="/coursework" class="text-xs" style="color: var(--app-link);">See all →</a>
		</div>
		<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
			{#each courses as c (c.id)}
				<a
					href={`/learn/${c.slug}`}
					class="w-44 shrink-0 rounded-xl border p-3"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
				>
					<p class="text-sm leading-tight font-semibold" style="color: var(--app-text);">
						{c.title}
					</p>
					<p class="mt-1 text-[10px]" style="color: var(--app-text-muted);">{c.subteamLabel}</p>
				</a>
			{/each}
		</div>
	</div>
{/if}
