<script lang="ts">
	let {
		courses
	}: { courses: Array<{ id: string; title: string; slug: string; subteamLabel: string }> } =
		$props();
</script>

{#if courses.length > 0}
	<div
		class="self-start rounded-2xl border p-4"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<div class="mb-3 flex items-center justify-between">
			<p
				class="text-[10px] font-bold tracking-[0.18em] uppercase"
				style="color: var(--app-text-muted);"
			>
				Up next · {courses.length}
			</p>
			<a href="/coursework" class="text-xs" style="color: var(--app-link);">See all →</a>
		</div>
		<!-- Compact tile grid. Two cols on tablet, three on desktop. We
		     intentionally let each row size to content (auto-rows-auto) so the
		     panel doesn't stretch to match the StatusRail's full height, which
		     was producing a ~600px black void under just 1-2 rows of cards. -->
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each courses as c (c.id)}
				<a
					href={`/learn/${c.slug}`}
					class="up-next-card flex min-h-[5.5rem] flex-col justify-between rounded-xl border p-3 transition duration-150"
					style="background: color-mix(in srgb, var(--app-glass-bg) 70%, transparent); border-color: var(--app-glass-border);"
				>
					<p class="text-sm leading-tight font-semibold" style="color: var(--app-text);">
						{c.title}
					</p>
					<p class="mt-2 text-[10px]" style="color: var(--app-text-muted);">{c.subteamLabel}</p>
				</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	.up-next-card:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-glass-border)) !important;
	}
</style>
