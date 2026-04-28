<script lang="ts">
	let { data } = $props();

	type Row = {
		title: string;
		slug: string;
		status: string;
		required: boolean;
		sortOrder: number;
	};

	const courses = $derived((data.courses ?? []) as Row[]);

	const statusLabel: Record<string, string> = {
		locked: 'Locked',
		available: 'Ready',
		video_pending: 'In progress',
		quiz_pending: 'In progress',
		mentor_checkoff_pending: 'Review',
		completed: 'Done'
	};

	const pill = (s: string) => {
		if (s === 'completed') return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30';
		if (s === 'locked') return 'bg-slate-800 text-slate-400 ring-1 ring-slate-700';
		return 'bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/30';
	};
</script>

<section class="mx-auto max-w-3xl space-y-8 px-4 py-8">
	<div>
		<a href="/courseloads" class="text-xs font-medium text-slate-500 hover:text-slate-300">← All courseloads</a>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">{data.courseload.title}</h1>
		{#if data.courseload.description}
			<p class="mt-2 text-sm leading-relaxed text-slate-400">{data.courseload.description}</p>
		{/if}
	</div>

	<ol class="space-y-3">
		{#each courses as c, i (c.slug)}
			<li>
				<a
					href={`/learn/${c.slug}`}
					class="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-4 transition hover:border-sky-500/35 hover:bg-slate-900"
				>
					<div class="flex min-w-0 items-start gap-4">
						<span
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold text-slate-300 ring-1 ring-white/10"
						>
							{i + 1}
						</span>
						<div class="min-w-0">
							<p class="font-medium text-white">{c.title}</p>
							<p class="truncate font-mono text-[11px] text-slate-500">{c.slug}</p>
						</div>
					</div>
					<div class="flex shrink-0 flex-col items-end gap-1">
						<span class={`rounded-full px-2.5 py-1 text-xs font-medium ${pill(c.status)}`}>
							{statusLabel[c.status] ?? c.status}
						</span>
						{#if !c.required}
							<span class="text-[10px] uppercase tracking-wide text-slate-500">Optional</span>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ol>
</section>
