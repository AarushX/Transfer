<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';

	let { data } = $props();

	type CourseRow = {
		nodeId: string;
		title: string;
		slug: string;
		status: string;
		href: string;
		required: boolean;
	};

	// Flatten all courses across the student's courseloads into one list with
	// courseload context, then bucket by status so the page reads as "what's on
	// my plate".
	type FlatCourse = CourseRow & { courseloadTitle: string };
	const allCourses = $derived.by<FlatCourse[]>(() => {
		const out: FlatCourse[] = [];
		for (const cl of data.coursesDashboard?.courseloads ?? []) {
			for (const c of cl.courses) {
				out.push({ ...c, courseloadTitle: cl.title });
			}
		}
		return out;
	});

	const IN_PROGRESS = new Set(['video_pending', 'quiz_pending', 'mentor_checkoff_pending']);

	const inProgress = $derived(allCourses.filter((c) => IN_PROGRESS.has(c.status)));
	const available = $derived(allCourses.filter((c) => c.status === 'available'));
	const completed = $derived(allCourses.filter((c) => c.status === 'completed'));
	const locked = $derived(allCourses.filter((c) => c.status === 'locked'));

	const statusLabel = (status: string) => {
		switch (status) {
			case 'video_pending':
				return 'Watch video';
			case 'quiz_pending':
				return 'Take quiz';
			case 'mentor_checkoff_pending':
				return 'Awaiting checkoff';
			case 'completed':
				return 'Completed';
			case 'available':
				return 'Available';
			default:
				return 'Locked';
		}
	};

	const statusTone = (status: string): 'success' | 'info' | 'warning' | 'neutral' => {
		if (status === 'completed') return 'success';
		if (status === 'mentor_checkoff_pending') return 'warning';
		if (IN_PROGRESS.has(status) || status === 'available') return 'info';
		return 'neutral';
	};
</script>

<section class="space-y-5">
	<PageHeader
		title="My Coursework"
		description="Everything assigned to you across your subteams, grouped by what needs your attention."
	>
		<Button variant="secondary" href="/courses/map">Skill map</Button>
	</PageHeader>

	{#if allCourses.length === 0}
		<EmptyState
			title="No courses assigned yet"
			description="Once your subteam is set in onboarding, your coursework will appear here."
		/>
	{:else}
		{#snippet courseList(title: string, courses: FlatCourse[], emptyMsg: string)}
			<GlassCard>
				<div class="mb-3 flex items-center justify-between gap-2">
					<h2 class="text-base font-semibold tracking-tight" style="color: var(--app-text);">
						{title}
					</h2>
					<span class="mono text-[11px]" style="color: var(--app-text-dim);">{courses.length}</span>
				</div>
				{#if courses.length === 0}
					<p class="py-2 text-sm" style="color: var(--app-text-dim);">{emptyMsg}</p>
				{:else}
					<ul class="space-y-2">
						{#each courses as c (c.nodeId)}
							<li>
								<a
									href={c.href}
									class="cw-row flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition duration-150"
									style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent); color: var(--app-text);"
								>
									<div class="min-w-0">
										<p class="truncate font-medium">{c.title}</p>
										<p class="truncate text-[11px]" style="color: var(--app-text-muted);">
											{c.courseloadTitle}{c.required ? ' · required' : ''}
										</p>
									</div>
									<StatusChip label={statusLabel(c.status)} tone={statusTone(c.status)} />
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</GlassCard>
		{/snippet}

		<div class="grid gap-4 md:grid-cols-2">
			{@render courseList('In progress', inProgress, 'Nothing in flight right now.')}
			{@render courseList('Ready to start', available, 'No newly available courses.')}
			{@render courseList('Completed', completed, 'No completions yet.')}
			{@render courseList('Locked', locked, 'No locked courses.')}
		</div>
	{/if}
</section>

<style>
	.cw-row:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
</style>
