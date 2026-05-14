<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	type Question = {
		id: string;
		prompt: string;
		type: 'mc' | 'ms' | 'tf' | 'short' | 'matrix' | 'matrix_ms' | 'short_grid';
		options?: string[];
		rows?: string[];
		columns?: string[];
		correct_map?: Record<string, string>;
		correct_map_multi?: Record<string, string[]>;
		correct: string | string[];
		randomize_options?: boolean;
		max_select?: number;
		short_ignore_punctuation?: boolean;
		short_ignore_case?: boolean;
		short_required?: boolean;
		short_requires_mentor_checkoff?: boolean;
	};

	type VideoConfig = {
		title: string;
		video_url: string;
		start_seconds: number;
		end_seconds: number | null;
	};

	type QuizConfig = {
		title: string;
		passing_score: number;
		min_seconds_between_attempts: number;
	max_attempts: number | null;
		fail_window_minutes: number;
		max_failed_in_window: number;
		short_answer_min_chars: number;
		short_answer_max_chars: number;
		questions: Question[];
	};

	type CheckoffConfig = {
		title: string;
		directions: string;
		evidence_mode: 'none' | 'photo_optional' | 'photo_required';
		mentor_checklist: string[];
		resource_links: string[];
		show_mentor_checklist_to_students: boolean;
	};

type ReadingConfig = {
	title: string;
	content: string;
	resource_links: string[];
};

type BlockType = 'video' | 'quiz' | 'checkoff' | 'reading';
	type Block =
		| { id?: string; type: 'video'; config: VideoConfig }
		| { id?: string; type: 'quiz'; config: QuizConfig }
	| { id?: string; type: 'checkoff'; config: CheckoffConfig }
	| { id?: string; type: 'reading'; config: ReadingConfig };

	let { data, form } = $props();
const selectableCategories = $derived(
	((data.trainingCategories as Array<any>) ?? []).filter((category) => category.parent_id != null)
);
const selectedNodeCategoryIds = $derived(new Set((data.nodeCategoryIds as string[]) ?? []));
const selectedNodeTeamIds = $derived(new Set((data.nodeTeamIds as string[]) ?? []));
const teamsByGroup = $derived.by(() => {
	const groups = new Map<string, { name: string; teams: Array<any> }>();
	for (const team of (data.teams as any[]) ?? []) {
		const groupSlug = String(team.team_groups?.slug ?? 'other');
		const groupName = String(team.team_groups?.name ?? 'Other');
		const bucket = groups.get(groupSlug) ?? { name: groupName, teams: [] };
		bucket.teams.push(team);
		groups.set(groupSlug, bucket);
	}
	return Array.from(groups.entries()).map(([slug, value]) => ({ slug, ...value }));
});
	const postedBlocks = $derived.by<Block[] | null>(() => {
		if (form?.section !== 'blocks' || !form?.blocks_json) return null;
		try {
			const parsed = JSON.parse(String(form.blocks_json));
			return Array.isArray(parsed) ? (parsed as Block[]) : null;
		} catch {
			return null;
		}
	});

	const initialBlocks = $derived<Block[]>(
		postedBlocks ??
			(Array.isArray(data.blocks)
				? (data.blocks as any[]).map((row) => {
					const cfg = row.config ?? {};
					if (row.type === 'video') {
						return {
							id: row.id,
							type: 'video',
							config: {
								title: String(cfg.title ?? ''),
								video_url: String(cfg.video_url ?? ''),
								start_seconds: Number(cfg.start_seconds ?? 0),
								end_seconds:
									cfg.end_seconds == null || cfg.end_seconds === '' ? null : Number(cfg.end_seconds)
							}
						} as Block;
					}
					if (row.type === 'quiz') {
						return {
							id: row.id,
							type: 'quiz',
							config: {
								title: String(cfg.title ?? ''),
								passing_score: Number(cfg.passing_score ?? 80),
								min_seconds_between_attempts: Number(cfg.min_seconds_between_attempts ?? 15),
								max_attempts:
									cfg.max_attempts == null || cfg.max_attempts === ''
										? null
										: Number(cfg.max_attempts),
								fail_window_minutes: Number(cfg.fail_window_minutes ?? 10),
								max_failed_in_window: Number(cfg.max_failed_in_window ?? 5),
								short_answer_min_chars: Number(cfg.short_answer_min_chars ?? 3),
								short_answer_max_chars: Number(cfg.short_answer_max_chars ?? 300),
								questions: Array.isArray(cfg.questions) ? (cfg.questions as Question[]) : []
							}
						} as Block;
					}
					if (row.type === 'reading') {
						return {
							id: row.id,
							type: 'reading',
							config: {
								title: String(cfg.title ?? 'Reading'),
								content: String(cfg.content ?? ''),
								resource_links: Array.isArray(cfg.resource_links)
									? cfg.resource_links.map((v: unknown) => String(v))
									: []
							}
						} as Block;
					}
					return {
						id: row.id,
						type: 'checkoff',
						config: {
							title: String(cfg.title ?? 'Skills Check'),
							directions: String(cfg.directions ?? ''),
							evidence_mode:
								cfg.evidence_mode === 'photo_required' || cfg.evidence_mode === 'photo_optional'
									? cfg.evidence_mode
									: 'none',
							mentor_checklist: Array.isArray(cfg.mentor_checklist)
								? cfg.mentor_checklist.map((v: unknown) => String(v))
								: [],
							resource_links: Array.isArray(cfg.resource_links)
								? cfg.resource_links.map((v: unknown) => String(v))
								: [],
							show_mentor_checklist_to_students: Boolean(
								cfg.show_mentor_checklist_to_students ?? false
							)
						}
					} as Block;
				})
				: [])
	);

	let blocks = $state<Block[]>([]);
	let expandedIndex = $state<number | null>(null);
	$effect(() => {
		blocks = initialBlocks;
		expandedIndex = initialBlocks.length === 0 ? null : 0;
	});

	const blocksJson = $derived(JSON.stringify(blocks));
	const blockErrors = $derived(((form as any)?.block_errors as Record<number, string> | undefined) ?? {});

	let prereqFilter = $state('');
	const filteredNodes = $derived.by(() => {
		const needle = prereqFilter.trim().toLowerCase();
		if (!needle) return data.allNodes;
		return data.allNodes.filter((n: { title: string; slug: string }) =>
			(n.title + ' ' + n.slug).toLowerCase().includes(needle)
		);
	});

	function formatClock(totalSeconds: number | null | undefined): string {
		const seconds = Math.max(0, Math.trunc(Number(totalSeconds ?? 0)));
		const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
		const ss = (seconds % 60).toString().padStart(2, '0');
		return `${mm}:${ss}`;
	}

	function parseClock(input: string): number {
		const cleaned = input.trim();
		if (!cleaned) return 0;
		const parts = cleaned.split(':').map((v) => v.trim());
		if (parts.length === 1) return Math.max(0, Number(parts[0]) || 0);
		const mm = Math.max(0, Number(parts[0]) || 0);
		const ss = Math.max(0, Number(parts[1]) || 0);
		return Math.trunc(mm * 60 + ss);
	}

	function nextQuestionId(list: Question[]): string {
		const used = new Set(list.map((q) => q.id));
		let i = list.length + 1;
		while (used.has(`q${i}`)) i += 1;
		return `q${i}`;
	}

	function addBlock(type: BlockType) {
		if (type === 'video') {
			blocks.push({
				type: 'video',
				config: {
					title: '',
					video_url: '',
					start_seconds: 0,
					end_seconds: null
				}
			});
		} else if (type === 'quiz') {
			blocks.push({
				type: 'quiz',
				config: {
					title: '',
					passing_score: 80,
					min_seconds_between_attempts: 15,
					max_attempts: null,
					fail_window_minutes: 10,
					max_failed_in_window: 5,
					short_answer_min_chars: 3,
					short_answer_max_chars: 300,
					questions: []
				}
			});
		} else {
			if (type === 'reading') {
				blocks.push({
					type: 'reading',
					config: {
						title: 'Reading',
						content: '',
						resource_links: []
					}
				});
				expandedIndex = blocks.length - 1;
				return;
			}
			blocks.push({
				type: 'checkoff',
				config: {
					title: 'Skills Check',
					directions: '',
					evidence_mode: 'none',
					mentor_checklist: [],
					resource_links: [],
					show_mentor_checklist_to_students: false
				}
			});
		}
		expandedIndex = blocks.length - 1;
	}

	function removeBlock(index: number) {
		blocks.splice(index, 1);
		if (expandedIndex === index) expandedIndex = null;
		else if (expandedIndex != null && expandedIndex > index) expandedIndex -= 1;
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const next = index + direction;
		if (next < 0 || next >= blocks.length) return;
		const copy = [...blocks];
		const tmp = copy[index];
		copy[index] = copy[next];
		copy[next] = tmp;
		blocks = copy;
		if (expandedIndex === index) expandedIndex = next;
		else if (expandedIndex === next) expandedIndex = index;
	}

	function addQuizQuestion(block: Extract<Block, { type: 'quiz' }>) {
		block.config.questions = [
			...block.config.questions,
			{
				id: nextQuestionId(block.config.questions),
				prompt: '',
				type: 'mc',
				options: ['', ''],
				correct: '',
				randomize_options: false
			}
		];
	}
	function removeQuizQuestion(block: Extract<Block, { type: 'quiz' }>, qIdx: number) {
		block.config.questions = block.config.questions.filter((_, i) => i !== qIdx);
	}
	function onQuestionTypeChange(q: Question) {
		if (q.type === 'mc') {
			if (!Array.isArray(q.options) || q.options.length < 2) q.options = ['', ''];
			const current = typeof q.correct === 'string' ? q.correct : '';
			if (!q.options.includes(current)) q.correct = '';
			else q.correct = current;
			if (q.randomize_options == null) q.randomize_options = false;
		} else if (q.type === 'ms') {
			if (!Array.isArray(q.options) || q.options.length < 2) q.options = ['', ''];
			const current = Array.isArray(q.correct)
				? q.correct
				: typeof q.correct === 'string' && q.correct
					? [q.correct]
					: [];
			q.correct = Array.from(new Set(current.filter((option) => q.options?.includes(option))));
			const currentMax = Number(q.max_select);
			q.max_select =
				Number.isFinite(currentMax) && currentMax > 0
					? Math.min(Math.trunc(currentMax), q.options.length)
					: undefined;
			if (q.randomize_options == null) q.randomize_options = false;
		} else if (q.type === 'tf') {
			q.options = undefined;
			const current = typeof q.correct === 'string' ? q.correct : '';
			if (current !== 'true' && current !== 'false') q.correct = 'true';
			else q.correct = current;
		} else {
			if (q.type === 'matrix') {
				q.options = undefined;
				if (!Array.isArray(q.rows) || q.rows.length === 0) q.rows = [''];
				if (!Array.isArray(q.columns) || q.columns.length < 2) q.columns = ['', ''];
				const currentMap =
					q.correct_map && typeof q.correct_map === 'object' ? { ...q.correct_map } : {};
				const nextMap: Record<string, string> = {};
				for (const row of q.rows) {
					const key = String(row ?? '').trim();
					if (!key) continue;
					const pick = String(currentMap[key] ?? '').trim();
					if (pick && q.columns.includes(pick)) nextMap[key] = pick;
				}
				q.correct_map = nextMap;
				return;
			}
			if (q.type === 'matrix_ms') {
				q.options = undefined;
				if (!Array.isArray(q.rows) || q.rows.length === 0) q.rows = [''];
				if (!Array.isArray(q.columns) || q.columns.length < 2) q.columns = ['', ''];
				const raw =
					q.correct_map_multi && typeof q.correct_map_multi === 'object'
						? { ...q.correct_map_multi }
						: {};
				const next: Record<string, string[]> = {};
				for (const row of q.rows) {
					const key = String(row ?? '').trim();
					if (!key) continue;
					const list = Array.isArray(raw[key])
						? raw[key].map((v) => String(v ?? '').trim()).filter((v) => q.columns?.includes(v))
						: [];
					next[key] = Array.from(new Set(list));
				}
				q.correct_map_multi = next;
				return;
			}
			if (q.type === 'short_grid') {
				q.options = undefined;
				if (!Array.isArray(q.rows) || q.rows.length === 0) q.rows = [''];
				if (!Array.isArray(q.columns) || q.columns.length < 2) q.columns = ['', ''];
				return;
			}
			q.options = undefined;
			if (Array.isArray(q.correct)) q.correct = q.correct[0] ?? '';
			if (q.short_ignore_punctuation == null) q.short_ignore_punctuation = false;
			if (q.short_ignore_case == null) q.short_ignore_case = true;
			if (q.short_required == null) q.short_required = true;
			if (q.short_requires_mentor_checkoff == null) q.short_requires_mentor_checkoff = false;
		}
	}

	function addChecklistItem(block: Extract<Block, { type: 'checkoff' }>) {
		block.config.mentor_checklist = [...block.config.mentor_checklist, ''];
	}
	function removeChecklistItem(block: Extract<Block, { type: 'checkoff' }>, idx: number) {
		block.config.mentor_checklist = block.config.mentor_checklist.filter((_, i) => i !== idx);
	}
	function addResourceLink(block: Extract<Block, { type: 'checkoff' }>) {
		block.config.resource_links = [...block.config.resource_links, ''];
	}
	function removeResourceLink(block: Extract<Block, { type: 'checkoff' }>, idx: number) {
		block.config.resource_links = block.config.resource_links.filter((_, i) => i !== idx);
	}
function addReadingResourceLink(block: Extract<Block, { type: 'reading' }>) {
	block.config.resource_links = [...block.config.resource_links, ''];
}
function removeReadingResourceLink(block: Extract<Block, { type: 'reading' }>, idx: number) {
	block.config.resource_links = block.config.resource_links.filter((_, i) => i !== idx);
}

	function blockSummary(block: Block): string {
		if (block.type === 'video') {
			const v = block.config;
			const range =
				v.end_seconds != null
					? `${formatClock(v.start_seconds)} – ${formatClock(v.end_seconds)}`
					: `from ${formatClock(v.start_seconds)}`;
			return `${v.title || 'Untitled video'} · ${range}`;
		}
		if (block.type === 'quiz') {
			const q = block.config;
			const count = q.questions.length;
			return `${q.title || 'Quiz'} · ${count} question${count === 1 ? '' : 's'} · pass ${q.passing_score}%`;
		}
		if (block.type === 'reading') {
			const r = block.config;
			const resources = r.resource_links.length;
			return `${r.title || 'Reading'} · ${resources} resource${resources === 1 ? '' : 's'}`;
		}
		const c = block.config;
		const evidenceLabel =
			c.evidence_mode === 'photo_required'
				? 'photo required'
				: c.evidence_mode === 'photo_optional'
					? 'photo optional'
					: 'no photo';
		return `${c.title || 'Skills Check'} · ${evidenceLabel}`;
	}

	function blockStyles(type: BlockType) {
		if (type === 'video') return 'border-sky-700/60 bg-sky-950/30';
		if (type === 'quiz') return 'border-yellow-700/60 bg-yellow-950/20';
		if (type === 'reading') return 'border-violet-700/60 bg-violet-950/20';
		return 'border-emerald-700/60 bg-emerald-950/20';
	}
	function blockLabel(type: BlockType) {
		if (type === 'video') return 'Video';
		if (type === 'quiz') return 'Quiz';
		if (type === 'reading') return 'Reading';
		return 'Skills Check';
	}

	function handleDeleteSubmit(event: SubmitEvent) {
		const ok = confirm(
			'Delete this course? Student progress, its blocks, and prerequisites pointing to it will be removed. This cannot be undone.'
		);
		if (!ok) event.preventDefault();
	}

	const message = $derived.by(() => {
		if (form?.error) return { tone: 'error' as const, text: form.error };
		if (form?.ok) return { tone: 'ok' as const, text: 'Saved.' };
		return null;
	});
	let templateName = $state('');

	const glassInput = "rounded-lg border px-2 py-2 backdrop-blur-sm";
	const glassInputStyle = "background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);";
	const glassLabelColor = "color: var(--app-text-muted);";
	const glassFormCard = "rounded-xl border p-4 backdrop-blur-xl";
	const glassFormCardStyle = "background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);";
</script>

<section class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<a href="/mentor/courses" class="text-xs" style="color: var(--app-text-muted);">← All courses</a>
			<h1 class="text-2xl font-semibold" style="color: var(--app-text);">{data.node.title}</h1>
			<p class="text-xs" style="color: var(--app-text-muted);">
				<code class="rounded-lg px-1 py-0.5" style="background: var(--app-surface-alt);">{data.node.slug}</code>
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="secondary" href={`/learn/${data.node.slug}`}>Preview as student</Button>
			<form method="POST" action="?/deleteNode" onsubmit={handleDeleteSubmit}>
				<Button variant="danger" type="submit">Delete</Button>
			</form>
			<form method="POST" action="?/saveTemplate" class="flex items-center gap-2">
				<input
					class={glassInput + " text-xs"}
					style={glassInputStyle}
					name="template_name"
					bind:value={templateName}
					placeholder="Template name"
					required
				/>
				<Button variant="secondary" size="sm" type="submit">Save as template</Button>
			</form>
		</div>
	</div>

	{#if message}
		<div
			class="rounded-xl border p-3 text-sm"
			style={message.tone === 'error'
				? 'border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);'
				: 'border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);'}
		>
			{message.text}
		</div>
	{/if}

	<form
		method="POST"
		action="?/updateNode"
		class="grid gap-3 {glassFormCard} md:grid-cols-2"
		style={glassFormCardStyle}
	>
		<h2 class="text-lg font-semibold md:col-span-2" style="color: var(--app-text);">Details</h2>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span style="color: var(--app-text);">Title</span>
			<input class={glassInput} style={glassInputStyle} name="title" value={data.node.title} required />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Slug</span>
			<input class={glassInput} style={glassInputStyle} name="slug" value={data.node.slug} required />
		</label>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span style="color: var(--app-text);">Description</span>
			<textarea class={glassInput} style={glassInputStyle} name="description" rows="3"
				>{data.node.description ?? ''}</textarea
			>
		</label>
		<div class="flex justify-end md:col-span-2">
			<Button variant="primary" type="submit">Save details</Button>
		</div>
	</form>

	<form
		method="POST"
		action="?/saveBlocks"
		class="space-y-4 {glassFormCard}"
		style={glassFormCardStyle}
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h2 class="text-lg font-semibold" style="color: var(--app-text);">Course Builder</h2>
				<p class="text-xs" style="color: var(--app-text-muted);">
					Compose this course from ordered blocks. Students complete each block in sequence.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="rounded-lg border border-sky-700/60 bg-sky-950/40 px-3 py-1 text-sm hover:bg-sky-900/30"
					onclick={() => addBlock('video')}
				>
					+ Video
				</button>
				<button
					type="button"
					class="rounded-lg border border-yellow-700/60 bg-yellow-950/40 px-3 py-1 text-sm hover:bg-yellow-900/40"
					onclick={() => addBlock('quiz')}
				>
					+ Quiz
				</button>
				<button
					type="button"
					class="rounded-lg border border-violet-700/60 bg-violet-950/40 px-3 py-1 text-sm hover:bg-violet-900/30"
					onclick={() => addBlock('reading')}
				>
					+ Reading
				</button>
				<button
					type="button"
					class="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-1 text-sm hover:bg-emerald-900/30"
					onclick={() => addBlock('checkoff')}
				>
					+ Skills Check
				</button>
			</div>
		</div>
		<input type="hidden" name="blocks_json" value={blocksJson} />

		<div class="space-y-2">
			{#each blocks as block, i (block.id ?? i)}
				<div class="rounded-lg border p-3 {blockStyles(block.type)} {blockErrors[i] ? 'ring-1 ring-red-500' : ''}">
					<div
						class="flex cursor-pointer flex-wrap items-center gap-2"
						onclick={() => (expandedIndex = expandedIndex === i ? null : i)}
					>
						<span class="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold" style="background: color-mix(in srgb, var(--app-surface) 70%, transparent); color: var(--app-text);">
							{i + 1}. {blockLabel(block.type)}
						</span>
						<p class="truncate text-sm" style="color: var(--app-text);">{blockSummary(block)}</p>
						<div class="ml-auto flex items-center gap-1">
							<button
								type="button"
								class="rounded-lg border px-2 py-0.5 text-xs disabled:opacity-40"
								style="border-color: var(--app-glass-border);"
								disabled={i === 0}
								onclick={(event) => {
									event.stopPropagation();
									moveBlock(i, -1);
								}}
								title="Move up"
								aria-label="Move up"
							>▲</button>
							<button
								type="button"
								class="rounded-lg border px-2 py-0.5 text-xs disabled:opacity-40"
								style="border-color: var(--app-glass-border);"
								disabled={i === blocks.length - 1}
								onclick={(event) => {
									event.stopPropagation();
									moveBlock(i, 1);
								}}
								title="Move down"
								aria-label="Move down"
							>▼</button>
							<button
								type="button"
								class="rounded-lg border px-2 py-0.5 text-xs"
								style="border-color: var(--app-glass-border);"
								onclick={(event) => {
									event.stopPropagation();
									expandedIndex = expandedIndex === i ? null : i;
								}}
							>
								{expandedIndex === i ? 'Collapse' : 'Edit'}
							</button>
							<button
								type="button"
								class="rounded-lg border px-2 py-0.5 text-xs"
								style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
								onclick={(event) => {
									event.stopPropagation();
									removeBlock(i);
								}}
							>Remove</button>
						</div>
					</div>

					{#if expandedIndex === i}
						<div class="mt-3 space-y-3 rounded-lg p-3" style="background: color-mix(in srgb, var(--app-surface) 60%, transparent);">
							{#if blockErrors[i]}
								<p class="rounded-lg border p-2 text-xs" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">
									{blockErrors[i]}
								</p>
							{/if}
							{#if block.type === 'video'}
								<div class="grid gap-2 md:grid-cols-2">
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Title (shown to students)</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} bind:value={block.config.title} placeholder="e.g. Intro to Pneumatics" />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>YouTube URL</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} bind:value={block.config.video_url} placeholder="https://www.youtube.com/watch?v=..." />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Start time (mm:ss)</span>
										<input
											class={glassInput + " text-sm"}
											style={glassInputStyle}
											value={formatClock(block.config.start_seconds)}
											onchange={(e) => (block.config.start_seconds = parseClock((e.currentTarget as HTMLInputElement).value))}
										/>
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>End time (mm:ss, optional)</span>
										<input
											class={glassInput + " text-sm"}
											style={glassInputStyle}
											placeholder="e.g. 12:30"
											value={block.config.end_seconds == null ? '' : formatClock(block.config.end_seconds)}
											onchange={(e) => {
												const raw = (e.currentTarget as HTMLInputElement).value.trim();
												block.config.end_seconds = raw ? parseClock(raw) : null;
											}}
										/>
									</label>
								</div>
							{:else if block.type === 'quiz'}
								<div class="grid gap-2 md:grid-cols-2">
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Title</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} bind:value={block.config.title} placeholder="Quiz name (optional)" />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Passing score (%)</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} type="number" min="1" max="100" bind:value={block.config.passing_score} />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Min seconds between attempts</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} type="number" min="0" max="3600" bind:value={block.config.min_seconds_between_attempts} />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Max attempts (optional)</span>
										<input
											class={glassInput + " text-sm"}
											style={glassInputStyle}
											type="number"
											min="1"
											max="1000"
											placeholder="Unlimited"
											value={block.config.max_attempts ?? ''}
											oninput={(e) => {
												const raw = (e.currentTarget as HTMLInputElement).value.trim();
												block.config.max_attempts = raw ? Number(raw) : null;
											}}
										/>
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Failed-attempt window (minutes)</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} type="number" min="1" max="1440" bind:value={block.config.fail_window_minutes} />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Max failed in window</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} type="number" min="1" max="200" bind:value={block.config.max_failed_in_window} />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Short answer min / max chars</span>
										<div class="flex gap-2">
											<input class={"w-full " + glassInput + " text-sm"} style={glassInputStyle} type="number" min="0" max="5000" bind:value={block.config.short_answer_min_chars} />
											<input class={"w-full " + glassInput + " text-sm"} style={glassInputStyle} type="number" min="1" max="5000" bind:value={block.config.short_answer_max_chars} />
										</div>
									</label>
								</div>

								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<p class="text-xs font-semibold" style="color: var(--app-text);">Questions</p>
										<button type="button" class="rounded-lg border px-2 py-1 text-xs" style="border-color: var(--app-glass-border);" onclick={() => addQuizQuestion(block)}>+ Add question</button>
									</div>
									{#each block.config.questions as q, qIdx (qIdx)}
										<div class="space-y-2 rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
											<div class="flex items-center justify-between">
												<span class="text-xs" style="color: var(--app-text-muted);">Q{qIdx + 1}</span>
												<button type="button" class="text-xs" style="color: var(--app-danger);" onclick={() => removeQuizQuestion(block, qIdx)}>Remove</button>
											</div>
											<input class={"w-full " + glassInput + " text-sm"} style={glassInputStyle} placeholder="Question prompt" bind:value={q.prompt} />
											<div class="flex items-center gap-2">
												<select class={glassInput + " text-sm"} style={glassInputStyle} bind:value={q.type} onchange={() => onQuestionTypeChange(q)}>
													<option value="mc">Multiple choice</option>
													<option value="ms">Multiple select</option>
													<option value="tf">True / False</option>
													<option value="short">Short answer</option>
													<option value="matrix">Matrix (table)</option>
													<option value="matrix_ms">Matrix (multi-select table)</option>
													<option value="short_grid">Short Answer Grid</option>
												</select>
											</div>
											{#if q.type === 'mc'}
												<div class="space-y-1">
													{#each q.options ?? [] as _opt, oi (oi)}
														<div class="flex items-center gap-2">
															<input
																type="radio"
																name={`correct-${i}-${qIdx}`}
																checked={typeof q.correct === 'string' && q.correct !== '' && q.correct === q.options![oi]}
																onchange={() => (q.correct = q.options![oi])}
															/>
															<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} placeholder={`Option ${oi + 1}`} bind:value={q.options![oi]} />
														</div>
													{/each}
													<label class="mt-1 inline-flex items-center gap-2 text-xs" style="color: var(--app-text);">
														<input type="checkbox" checked={q.randomize_options ?? false} onchange={(e) => (q.randomize_options = (e.currentTarget as HTMLInputElement).checked)} />
														Randomize option order for students
													</label>
													<div class="flex gap-2 pt-1">
														<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button>
													</div>
												</div>
											{:else if q.type === 'ms'}
												<div class="space-y-1">
													{#each q.options ?? [] as _opt, oi (oi)}
														<div class="flex items-center gap-2">
															<input
																type="checkbox"
																checked={Array.isArray(q.correct) && q.correct.includes(q.options![oi])}
																onchange={(e) => {
																	const option = q.options![oi];
																	const current = Array.isArray(q.correct) ? q.correct : [];
																	const checked = (e.currentTarget as HTMLInputElement).checked;
																	q.correct = checked
																		? Array.from(new Set([...current, option]))
																		: current.filter((value) => value !== option);
																}}
															/>
															<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} placeholder={`Option ${oi + 1}`} bind:value={q.options![oi]} />
														</div>
													{/each}
													<label class="mt-1 inline-flex items-center gap-2 text-xs" style="color: var(--app-text);">
														<input type="checkbox" checked={q.randomize_options ?? false} onchange={(e) => (q.randomize_options = (e.currentTarget as HTMLInputElement).checked)} />
														Randomize option order for students
													</label>
													<label class="mt-1 flex items-center gap-2 text-xs" style="color: var(--app-text);">
														<span>Max selections (optional)</span>
														<input
															type="number"
															min="1"
															max={Math.max(1, (q.options ?? []).length)}
															class={"w-24 " + glassInput + " py-1 text-xs"}
															style={glassInputStyle}
															value={q.max_select ?? ''}
															oninput={(e) => {
																const raw = (e.currentTarget as HTMLInputElement).value.trim();
																q.max_select = raw
																	? Math.max(1, Math.min(Number(raw) || 1, (q.options ?? []).length))
																	: undefined;
																if (Array.isArray(q.correct) && q.max_select && q.correct.length > q.max_select) {
																	q.correct = q.correct.slice(0, q.max_select);
																}
															}}
															placeholder="No limit"
														/>
													</label>
													<div class="flex gap-2 pt-1">
														<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button>
													</div>
												</div>
											{:else if q.type === 'tf'}
												<div class="inline-flex overflow-hidden rounded-lg border" style="border-color: var(--app-glass-border);">
													<button type="button" class="px-4 py-1 text-sm" style={q.correct === 'true' ? 'background: var(--app-gradient-accent); color: var(--app-accent-text);' : 'background: var(--app-glass-bg); color: var(--app-text);'} onclick={() => (q.correct = 'true')}>True</button>
													<button type="button" class="px-4 py-1 text-sm" style={q.correct === 'false' ? 'background: var(--app-gradient-accent); color: var(--app-accent-text);' : 'background: var(--app-glass-bg); color: var(--app-text);'} onclick={() => (q.correct = 'false')}>False</button>
												</div>
											{:else if q.type === 'matrix' || q.type === 'matrix_ms' || q.type === 'short_grid'}
												<div class="space-y-2">
													<div class="grid gap-2 md:grid-cols-2">
														<div class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
															<div class="mb-1 flex items-center justify-between">
																<p class="text-xs font-semibold" style="color: var(--app-text);">Rows</p>
																<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => (q.rows = [...(q.rows ?? []), ''])}>+ Row</button>
															</div>
															{#each q.rows ?? [] as _row, ri (ri)}
																<div class="mb-1 flex items-center gap-1">
																	<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} bind:value={q.rows![ri]} placeholder={`Row ${ri + 1}`} />
																	<button type="button" class="px-2 text-xs" style="color: var(--app-danger);" onclick={() => (q.rows = (q.rows ?? []).filter((_, i) => i !== ri))}>x</button>
																</div>
															{/each}
														</div>
														<div class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
															<div class="mb-1 flex items-center justify-between">
																<p class="text-xs font-semibold" style="color: var(--app-text);">Columns</p>
																<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => (q.columns = [...(q.columns ?? []), ''])}>+ Column</button>
															</div>
															{#each q.columns ?? [] as _col, ci (ci)}
																<div class="mb-1 flex items-center gap-1">
																	<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} bind:value={q.columns![ci]} placeholder={`Column ${ci + 1}`} />
																	<button type="button" class="px-2 text-xs" style="color: var(--app-danger);" onclick={() => (q.columns = (q.columns ?? []).filter((_, i) => i !== ci))}>x</button>
																</div>
															{/each}
														</div>
													</div>
													{#if q.type !== 'short_grid'}
														<div class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
															<p class="mb-1 text-xs font-semibold" style="color: var(--app-text);">Optional answer key per row</p>
															{#each (q.rows ?? []).filter((row) => String(row).trim().length > 0) as row}
																{#if q.type === 'matrix'}
																	<div class="mb-1 grid items-center gap-1 text-xs md:grid-cols-[1fr_220px]">
																		<span>{row}</span>
																		<select
																			class={glassInput + " text-xs"}
																			style={glassInputStyle}
																			value={q.correct_map?.[row] ?? ''}
																			onchange={(e) => {
																				const value = (e.currentTarget as HTMLSelectElement).value;
																				const next = { ...(q.correct_map ?? {}) };
																				if (value) next[row] = value;
																				else delete next[row];
																				q.correct_map = next;
																			}}
																		>
																			<option value="">No key (completion-only)</option>
																			{#each (q.columns ?? []).filter((col) => String(col).trim().length > 0) as col}
																				<option value={col}>{col}</option>
																			{/each}
																		</select>
																	</div>
																{:else}
																	<div class="mb-2 rounded-lg border p-2 text-xs" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
																		<p class="mb-1">{row}</p>
																		<div class="grid gap-1 md:grid-cols-2">
																			{#each (q.columns ?? []).filter((col) => String(col).trim().length > 0) as col}
																				<label class="inline-flex items-center gap-1">
																					<input
																						type="checkbox"
																						checked={Array.isArray(q.correct_map_multi?.[row]) && q.correct_map_multi![row].includes(col)}
																						onchange={(e) => {
																							const checked = (e.currentTarget as HTMLInputElement).checked;
																							const next = { ...(q.correct_map_multi ?? {}) };
																							const current = Array.isArray(next[row]) ? [...next[row]] : [];
																							next[row] = checked
																								? Array.from(new Set([...current, col]))
																								: current.filter((v) => v !== col);
																							q.correct_map_multi = next;
																						}}
																					/>
																					{col}
																				</label>
																			{/each}
																		</div>
																	</div>
																{/if}
															{/each}
													</div>
													{:else}
														<p class="text-xs" style="color: var(--app-text-muted);">Each row/column cell will render as a short answer input.</p>
													{/if}
												</div>
											{:else}
												<input
													class={"w-full " + glassInput + " text-sm"}
													style={glassInputStyle}
													placeholder="Expected answer"
													value={Array.isArray(q.correct) ? (q.correct[0] ?? '') : q.correct}
													oninput={(e) => (q.correct = (e.currentTarget as HTMLInputElement).value)}
												/>
												<div class="flex flex-wrap gap-4 text-xs" style="color: var(--app-text);">
													<label class="inline-flex items-center gap-2">
														<input
															type="checkbox"
															checked={q.short_required ?? true}
															onchange={(e) => (q.short_required = (e.currentTarget as HTMLInputElement).checked)}
														/>
														Required response
													</label>
													<label class="inline-flex items-center gap-2">
														<input
															type="checkbox"
															checked={q.short_ignore_case ?? true}
															onchange={(e) => (q.short_ignore_case = (e.currentTarget as HTMLInputElement).checked)}
														/>
														Ignore capitalization
													</label>
													<label class="inline-flex items-center gap-2">
														<input
															type="checkbox"
															checked={q.short_ignore_punctuation ?? false}
															onchange={(e) =>
																(q.short_ignore_punctuation = (e.currentTarget as HTMLInputElement).checked)}
														/>
														Ignore periods/punctuation
													</label>
													<label class="inline-flex items-center gap-2">
														<input
															type="checkbox"
															checked={q.short_requires_mentor_checkoff ?? false}
															onchange={(e) =>
																(q.short_requires_mentor_checkoff = (e.currentTarget as HTMLInputElement).checked)}
														/>
														Require mentor checkoff (any valid answer earns quiz credit; mentor confirms during checkoff)
													</label>
												</div>
												<p class="text-xs" style="color: var(--app-text-muted);">
													Set expected answer to <code>acknowledged</code> to give credit for any non-empty response
													without mentor review. Optional reference answer above is shown to mentors when checkoff is
													required.
												</p>
											{/if}
										</div>
									{:else}
										<p class="text-xs" style="color: var(--app-text-muted);">No questions yet.</p>
									{/each}
								</div>
							{:else if block.type === 'reading'}
								<div class="space-y-3">
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Title</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} bind:value={block.config.title} placeholder="Reading title" />
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Reading content</span>
										<textarea class={glassInput + " text-sm"} style={glassInputStyle} rows="5" bind:value={block.config.content} placeholder="Paste text, instructions, or key notes students must read..."></textarea>
									</label>
									<div class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
										<div class="mb-1 flex items-center justify-between">
											<p class="text-xs font-semibold" style="color: var(--app-text);">Resource links</p>
											<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => addReadingResourceLink(block)}>+ Link</button>
										</div>
										{#each block.config.resource_links as _link, idx (idx)}
											<div class="flex items-center gap-1">
												<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} bind:value={block.config.resource_links[idx]} placeholder="https://..." />
												<button type="button" class="px-2 text-xs" style="color: var(--app-danger);" onclick={() => removeReadingResourceLink(block, idx)}>x</button>
											</div>
										{:else}
											<p class="text-xs" style="color: var(--app-text-muted);">No links yet.</p>
										{/each}
									</div>
								</div>
							{:else}
								<div class="grid gap-2 md:grid-cols-2">
									<label class="flex flex-col gap-1 text-xs md:col-span-2" style={glassLabelColor}>
										<span>Section title</span>
										<input class={glassInput + " text-sm"} style={glassInputStyle} bind:value={block.config.title} />
									</label>
									<label class="flex flex-col gap-1 text-xs md:col-span-2" style={glassLabelColor}>
										<span>Student directions</span>
										<textarea class={glassInput + " text-sm"} style={glassInputStyle} rows="3" bind:value={block.config.directions} placeholder="Explain exactly what they must demo or submit..."></textarea>
									</label>
									<label class="flex flex-col gap-1 text-xs" style={glassLabelColor}>
										<span>Photo evidence</span>
										<select class={glassInput + " text-sm"} style={glassInputStyle} bind:value={block.config.evidence_mode}>
											<option value="none">No photo</option>
											<option value="photo_optional">Photo optional</option>
											<option value="photo_required">Photo required</option>
										</select>
									</label>
									<label class="flex items-center gap-2 text-xs" style="color: var(--app-text);">
										<input
											type="checkbox"
											class="accent-yellow-400"
											checked={Boolean(block.config.show_mentor_checklist_to_students)}
											onchange={(event) =>
												(block.config.show_mentor_checklist_to_students = (
													event.currentTarget as HTMLInputElement
												).checked)}
										/>
										Show mentor checklist to students
									</label>
								</div>

								<div class="grid gap-3 md:grid-cols-2">
									<div class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
										<div class="mb-1 flex items-center justify-between">
											<p class="text-xs font-semibold" style="color: var(--app-text);">Mentor checklist</p>
											<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => addChecklistItem(block)}>+ Item</button>
										</div>
										{#each block.config.mentor_checklist as _item, idx (idx)}
											<div class="flex items-center gap-1">
												<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} bind:value={block.config.mentor_checklist[idx]} placeholder="e.g. Safety glasses worn" />
												<button type="button" class="px-2 text-xs" style="color: var(--app-danger);" onclick={() => removeChecklistItem(block, idx)}>x</button>
											</div>
										{:else}
											<p class="text-xs" style="color: var(--app-text-muted);">No checklist items yet.</p>
										{/each}
									</div>
									<div class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-surface) 50%, transparent); border-color: var(--app-glass-border);">
										<div class="mb-1 flex items-center justify-between">
											<p class="text-xs font-semibold" style="color: var(--app-text);">Resource links</p>
											<button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--app-glass-border);" onclick={() => addResourceLink(block)}>+ Link</button>
										</div>
										{#each block.config.resource_links as _link, idx (idx)}
											<div class="flex items-center gap-1">
												<input class={"flex-1 " + glassInput + " py-1 text-sm"} style={glassInputStyle} bind:value={block.config.resource_links[idx]} placeholder="https://..." />
												<button type="button" class="px-2 text-xs" style="color: var(--app-danger);" onclick={() => removeResourceLink(block, idx)}>x</button>
											</div>
										{:else}
											<p class="text-xs" style="color: var(--app-text-muted);">No links yet.</p>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<div class="rounded-xl border border-dashed p-6 text-center text-sm" style="border-color: var(--app-glass-border); color: var(--app-text-muted);">
					No blocks yet. Use the buttons above to add a video, quiz, reading, or skills check.
				</div>
			{/each}
		</div>

		<div class="flex justify-end">
			<Button variant="primary" type="submit">Save course</Button>
		</div>
	</form>

	<form method="POST" action="?/savePrereqs" class="space-y-3 {glassFormCard}" style={glassFormCardStyle}>
		<div>
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Prerequisites</h2>
			<p class="text-xs" style="color: var(--app-text-muted);">
				Students must complete these courses before starting this one.
			</p>
		</div>
		<input
			bind:value={prereqFilter}
			placeholder="Filter by title or slug..."
			class={"w-full " + glassInput + " text-sm"}
			style={glassInputStyle}
		/>
		<div class="grid max-h-80 gap-1 overflow-y-auto md:grid-cols-2">
			{#each filteredNodes as n (n.id)}
				<label class="glass-prereq-row flex items-center gap-2 rounded-lg border px-2 py-1 text-sm" style="border-color: var(--app-glass-border);">
					<input type="checkbox" name="prereq_ids" value={n.id} checked={data.prereqIds.includes(n.id)} />
					<span class="truncate">{n.title}</span>
					<span class="ml-auto text-xs" style="color: var(--app-text-muted);">{n.slug}</span>
				</label>
			{:else}
				<p class="text-sm" style="color: var(--app-text-muted);">No matching courses.</p>
			{/each}
		</div>
		<div class="flex justify-end">
			<Button variant="primary" type="submit">Save prerequisites</Button>
		</div>
	</form>
</section>

<style>
	.glass-prereq-row {
		transition: background 0.15s ease;
	}
	.glass-prereq-row:hover {
		background: var(--app-glass-bg-hover);
	}
</style>
