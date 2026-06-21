<script lang="ts">
	let {
		courses
	}: {
		courses: Array<{
			id: string;
			title: string;
			slug: string;
			subteamLabel: string;
			status?: string;
			done?: number;
			total?: number;
			teamColor?: string;
		}>;
	} = $props();

	function statusLabel(s: string): string {
		if (s === 'in_progress' || s === 'video_pending' || s === 'quiz_pending') return 'In progress';
		if (s === 'mentor_checkoff_pending') return 'Awaiting mentor';
		if (s === 'checkoff_needs_review') return 'Needs review';
		if (s === 'checkoff_blocked') return 'Blocked';
		if (s === 'completed') return 'Completed';
		return 'Ready to start';
	}

	function statusStyle(s: string): string {
		if (['in_progress', 'video_pending', 'quiz_pending'].includes(s))
			return 'background:color-mix(in srgb,var(--app-accent) 12%,transparent);color:var(--app-success);';
		if (['mentor_checkoff_pending', 'checkoff_needs_review'].includes(s))
			return 'background:color-mix(in srgb,var(--app-warning) 12%,transparent);color:var(--app-warning);';
		if (s === 'checkoff_blocked')
			return 'background:color-mix(in srgb,var(--app-danger) 12%,transparent);color:var(--app-danger);';
		if (s === 'completed')
			return 'background:color-mix(in srgb,var(--app-accent) 12%,transparent);color:var(--app-success);';
		return 'background:var(--app-surface-alt);color:var(--app-text-muted);';
	}

	function isInProgress(s: string): boolean {
		return ['in_progress', 'video_pending', 'quiz_pending'].includes(s);
	}
</script>

{#if courses.length > 0}
	<div
		class="rounded-2xl border"
		style="background: var(--app-surface); border-color: var(--app-border); box-shadow: var(--app-glass-shadow);"
	>
		<div
			class="flex items-center justify-between border-b px-5 py-4"
			style="border-color: var(--app-border);"
		>
			<h2 class="text-[15px] font-bold" style="color: var(--app-text);">Up next</h2>
			<a href="/coursework" class="text-[13px] font-bold" style="color: var(--app-accent);">
				View all coursework →
			</a>
		</div>
		{#each courses as c, i (c.id)}
			<a
				href={`/learn/${c.slug}`}
				class="course-row flex items-center gap-3.5 px-5 py-3.5"
				style="border-bottom: {i < courses.length - 1 ? `1px solid var(--app-border)` : 'none'};"
			>
				<span
					class="mt-0.5 h-2 w-2 shrink-0 rounded-full"
					style="background: {c.teamColor ?? 'var(--app-text-dim)'};"
				></span>
				<div class="min-w-0 flex-1">
					<p class="truncate text-[14px] font-bold" style="color: var(--app-text);">{c.title}</p>
					<p class="mt-0.5 text-[12px]" style="color: var(--app-text-dim);">
						{c.subteamLabel}{c.total ? ` · ${c.total} blocks` : ''}
					</p>
				</div>
				{#if isInProgress(c.status ?? '') && c.total && c.done !== undefined}
					<div class="w-28 shrink-0">
						<div
							class="h-[5px] overflow-hidden rounded-full"
							style="background: var(--app-border);"
						>
							<div
								class="h-full rounded-full"
								style="width: {Math.round((c.done / c.total) * 100)}%; background: var(--app-accent);"
							></div>
						</div>
					</div>
				{/if}
				<span
					class="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap"
					style={statusStyle(c.status ?? 'ready')}
				>{statusLabel(c.status ?? 'ready')}</span>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					style="color: var(--app-text-dim); flex-shrink: 0;"
					><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg
				>
			</a>
		{/each}
	</div>
{/if}

<style>
	.course-row {
		transition: background 0.12s ease;
	}
	.course-row:hover {
		background: var(--app-table-row-hover);
	}
</style>
