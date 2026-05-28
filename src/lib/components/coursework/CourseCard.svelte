<script lang="ts" module>
	export type CatalogCourse = {
		nodeId: string;
		title: string;
		slug: string;
		code: string | null;
		proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | null;
		description: string;
		subteamIds: string[];
		teamGroupIds: string[];
		status: string;
		isRequired: boolean;
		href: string;
	};
	export type TeamRow = {
		id: string;
		name: string;
		color_hex: string;
		team_group_id?: string;
	};
	export type TeamGroupRow = { id: string; name: string; color_hex: string };
</script>

<script lang="ts">
	let {
		course,
		teamsById,
		teamGroupsById,
		compact = false
	}: {
		course: CatalogCourse;
		teamsById: Map<string, TeamRow>;
		teamGroupsById: Map<string, TeamGroupRow>;
		// `compact` shrinks the banner + body padding for dense listings like
		// the subteam page where multiple sections compete for screen space.
		compact?: boolean;
	} = $props();

	const isLocked = $derived(course.status === 'locked');
	const isCompleted = $derived(course.status === 'completed');

	function primaryAccent(c: CatalogCourse): string {
		for (const id of c.subteamIds) {
			const team = teamsById.get(id);
			if (team?.color_hex) return team.color_hex;
		}
		for (const id of c.teamGroupIds) {
			const group = teamGroupsById.get(id);
			if (group?.color_hex) return group.color_hex;
		}
		return c.proficiencyLevel === 'advanced'
			? '#a855f7'
			: c.proficiencyLevel === 'intermediate'
				? '#06b6d4'
				: c.proficiencyLevel === 'beginner'
					? '#22c55e'
					: '#475569';
	}

	function subteamChips(c: CatalogCourse): Array<{ label: string; color: string }> {
		const chips: Array<{ label: string; color: string }> = [];
		for (const id of c.subteamIds) {
			const team = teamsById.get(id);
			if (team) chips.push({ label: team.name, color: team.color_hex || '#475569' });
		}
		for (const id of c.teamGroupIds) {
			const group = teamGroupsById.get(id);
			if (group)
				chips.push({ label: `${group.name} · all subteams`, color: group.color_hex || '#475569' });
		}
		return chips;
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'completed':
				return 'Completed';
			case 'video_pending':
				return 'Watch';
			case 'quiz_pending':
				return 'Quiz';
			case 'mentor_checkoff_pending':
				return 'Checkoff';
			case 'available':
				return 'Start';
			case 'in_progress':
				return 'In progress';
			default:
				return 'Locked';
		}
	}

	function levelLabel(level: string | null): string {
		if (!level) return '';
		return level[0].toUpperCase() + level.slice(1);
	}

	const accent = $derived(primaryAccent(course));
	const chips = $derived(subteamChips(course));
</script>

<a
	href={course.href}
	class="cw-card group relative flex flex-col overflow-hidden rounded-2xl border"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); opacity: {isLocked
		? 0.6
		: 1};"
	aria-disabled={isLocked}
>
	<!-- Banner: app-store-style tile head. Just the code on the left and the
	     status pill on the right; the level label moved into the body. -->
	<div
		class="relative flex items-center justify-between {compact
			? 'h-16 px-3'
			: 'h-24 px-4'}"
		style="background: linear-gradient(135deg, color-mix(in srgb, {accent} 70%, transparent), color-mix(in srgb, {accent} 18%, transparent));"
	>
		<p
			class="mono relative z-10 font-extrabold tracking-tight {compact ? 'text-2xl' : 'text-3xl'}"
			style="color: white; text-shadow: 0 2px 14px color-mix(in srgb, {accent} 60%, transparent); line-height: 1;"
		>
			{course.code ?? '••'}
		</p>
		<span
			class="relative z-10 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md"
			style={isCompleted
				? 'border-color: rgba(255,255,255,0.45); background: rgba(34,197,94,0.85); color: white;'
				: isLocked
					? 'border-color: rgba(255,255,255,0.3); background: rgba(15,23,41,0.55); color: rgba(255,255,255,0.85);'
					: 'border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.18); color: white;'}
		>
			{statusLabel(course.status)}
		</span>
		<svg
			class="pointer-events-none absolute inset-0 h-full w-full opacity-25"
			viewBox="0 0 200 100"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<defs>
				<pattern
					id="cw-dot-{course.nodeId}"
					x="0"
					y="0"
					width="14"
					height="14"
					patternUnits="userSpaceOnUse"
				>
					<circle cx="2" cy="2" r="1" fill="white" />
				</pattern>
			</defs>
			<rect width="200" height="100" fill="url(#cw-dot-{course.nodeId})" />
		</svg>
	</div>

	<!-- Body. Order: title → description → level label → subteam chips
	     occupy the footer-left now, replacing the standalone proficiency pill. -->
	<div class="flex flex-1 flex-col {compact ? 'p-3' : 'p-4'}">
		<h3
			class="font-bold tracking-tight {compact ? 'text-sm' : 'text-base'}"
			style="color: var(--app-text); line-height: 1.2;"
		>
			{course.title}
		</h3>
		{#if course.description && !compact}
			<p class="mt-1.5 line-clamp-2 text-[12px] leading-snug" style="color: var(--app-text-muted);">
				{course.description}
			</p>
		{/if}

		{#if course.proficiencyLevel}
			<p
				class="text-[10px] font-bold tracking-[0.18em] uppercase {compact ? 'mt-1.5' : 'mt-2'}"
				style="color: color-mix(in srgb, {accent} 75%, var(--app-text-muted));"
			>
				{levelLabel(course.proficiencyLevel)}
			</p>
		{/if}

		<div
			class="flex flex-wrap items-center justify-between gap-2 border-t text-xs {compact
				? 'mt-3 pt-2'
				: 'mt-4 pt-3'}"
			style="border-color: color-mix(in srgb, var(--app-glass-border) 60%, transparent);"
		>
			<div class="flex min-w-0 flex-1 flex-wrap gap-1.5">
				{#each chips as chip}
					<span
						class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
						style="border-color: color-mix(in srgb, {chip.color} 50%, transparent); background: color-mix(in srgb, {chip.color} 12%, transparent); color: color-mix(in srgb, {chip.color} 70%, white);"
					>
						<span class="h-1.5 w-1.5 rounded-full" style="background: {chip.color};"></span>
						{chip.label}
					</span>
				{/each}
			</div>
			<span
				class="inline-flex shrink-0 items-center gap-1 font-semibold"
				style="color: {isLocked ? 'var(--app-text-dim)' : 'var(--app-accent)'};"
			>
				{isCompleted ? 'Review' : isLocked ? 'Locked' : 'Open'}
				{#if !isLocked}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-3 w-3 transition-transform group-hover:translate-x-0.5"
					>
						<path d="M5 12h14M13 5l7 7-7 7" />
					</svg>
				{/if}
			</span>
		</div>
	</div>
</a>

<style>
	.cw-card {
		transition:
			transform 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease;
	}
	.cw-card:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--app-accent) 45%, var(--app-glass-border));
		box-shadow: 0 14px 36px -22px rgba(0, 0, 0, 0.55);
	}
</style>
