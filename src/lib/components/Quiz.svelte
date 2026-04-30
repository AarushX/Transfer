<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	type Question = {
		id: string;
		prompt: string;
		type: 'mc' | 'ms' | 'tf' | 'short' | 'matrix' | 'matrix_ms' | 'short_grid';
		options?: string[];
		rows?: string[];
		columns?: string[];
		correct_map?: Record<string, string>;
		correct_map_multi?: Record<string, string[]>;
		correct?: string | string[];
		randomize_options?: boolean;
		max_select?: number;
		short_ignore_punctuation?: boolean;
		short_ignore_case?: boolean;
	};

	let {
		questions,
		nodeId,
		segmentId = null,
		blockId = null,
		passingScore = 80,
		allowSubmit = true,
		lockedMessage = ''
	}: {
		questions: Question[];
		nodeId: string;
		segmentId?: string | null;
		blockId?: string | null;
		passingScore?: number;
		allowSubmit?: boolean;
		lockedMessage?: string;
	} = $props();

	let answers = $state<
		Record<
			string,
			string | string[] | Record<string, string> | Record<string, string[]> | Record<string, Record<string, string>>
		>
	>({});
	let submitting = $state(false);
	let result = $state<null | { passed: boolean; score: number }>(null);
	let errorMsg = $state('');
	let randomizeEpoch = $state(0);

	function hashSeed(input: string): number {
		let h = 2166136261;
		for (let i = 0; i < input.length; i += 1) {
			h ^= input.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}

	function shuffledOptions(options: string[], seedKey: string): string[] {
		const out = [...options];
		let seed = hashSeed(seedKey);
		for (let i = out.length - 1; i > 0; i -= 1) {
			seed = Math.imul(seed, 1664525) + 1013904223;
			const j = Math.abs(seed) % (i + 1);
			const tmp = out[i];
			out[i] = out[j];
			out[j] = tmp;
		}
		return out;
	}

	const displayOptions = $derived.by(() => {
		const map: Record<string, string[]> = {};
		for (const question of questions) {
			const base = Array.isArray(question.options) ? question.options : [];
			if (!question.randomize_options || base.length <= 1) {
				map[question.id] = base;
				continue;
			}
			map[question.id] = shuffledOptions(base, `${question.id}:${randomizeEpoch}`);
		}
		return map;
	});
	const hasRandomizableQuestions = $derived(
		questions.some(
			(q) => (q.type === 'mc' || q.type === 'ms') && q.randomize_options && (q.options?.length ?? 0) > 1
		)
	);
	const getMaxSelect = (question: Question): number | null => {
		const value = Number(question.max_select);
		return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
	};
	const getSelectedCount = (questionId: string): number =>
		Array.isArray(answers[questionId]) ? (answers[questionId] as string[]).length : 0;
	const isMsOptionDisabled = (question: Question, option: string): boolean => {
		const maxSelect = getMaxSelect(question);
		if (maxSelect == null) return false;
		const selected = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
		if (selected.includes(option)) return false;
		return selected.length >= maxSelect;
	};

	const unanswered = $derived(
		questions.filter((q) => {
			if (q.type === 'ms') {
				const selected = answers[q.id];
				return !Array.isArray(selected) || selected.length === 0;
			}
			if (q.type === 'matrix') {
				const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : [];
				const value = answers[q.id];
				if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
				const map = value as Record<string, string>;
				return rows.some((row) => !String(map[row] ?? '').trim());
			}
			if (q.type === 'matrix_ms') {
				const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : [];
				const value = answers[q.id];
				if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
				const map = value as Record<string, string[]>;
				return rows.some((row) => !Array.isArray(map[row]) || map[row].length === 0);
			}
			if (q.type === 'short_grid') {
				const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : [];
				const columns = Array.isArray(q.columns) ? q.columns.map((c) => String(c).trim()).filter(Boolean) : [];
				const value = answers[q.id];
				if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
				const map = value as Record<string, Record<string, string>>;
				return rows.some((row) => {
					const rowMap = map[row] ?? {};
					return columns.some((col) => !String(rowMap[col] ?? '').trim());
				});
			}
			return !String(answers[q.id] ?? '').trim();
		}).length
	);

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		submitting = true;
		errorMsg = '';
		const fd = new FormData();
		fd.set('nodeId', nodeId);
		if (segmentId) fd.set('segmentId', segmentId);
		if (blockId) fd.set('blockId', blockId);
		for (const q of questions) {
			if (q.type === 'ms') {
				const selected = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
				fd.set(q.id, JSON.stringify(selected));
			} else if (q.type === 'matrix') {
				const current =
					answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id])
						? (answers[q.id] as Record<string, string>)
						: {};
				fd.set(q.id, JSON.stringify(current));
			} else if (q.type === 'matrix_ms') {
				const current =
					answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id])
						? (answers[q.id] as Record<string, string[]>)
						: {};
				fd.set(q.id, JSON.stringify(current));
			} else if (q.type === 'short_grid') {
				const current =
					answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id])
						? (answers[q.id] as Record<string, Record<string, string>>)
						: {};
				fd.set(q.id, JSON.stringify(current));
			} else {
				fd.set(q.id, String(answers[q.id] ?? ''));
			}
		}
		try {
			const res = await fetch('/api/quiz/grade', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				errorMsg =
					typeof body?.error === 'string' ? body.error : 'Grading failed. Please try again.';
				return;
			}
			const body = (await res.json()) as { passed: boolean; score: number };
			result = body;
			if (body.passed) await invalidateAll();
		} catch {
			errorMsg = 'Network error while grading.';
		} finally {
			submitting = false;
		}
	}

	function retake() {
		answers = {};
		result = null;
		errorMsg = '';
		randomizeEpoch += 1;
	}
</script>

{#if result?.passed}
	<div class="space-y-3 rounded border border-emerald-700 bg-emerald-900/30 p-4">
		<p class="text-lg font-semibold text-emerald-200">Passed! Score: {result.score}%</p>
		<p class="text-sm text-emerald-200">
			Your request has been sent to a mentor for the hands-on "Do" checkoff. Visit the
			<a class="underline" href="/passport">passport</a> or your dashboard to track status.
		</p>
	</div>
{:else}
	<form class="space-y-4" onsubmit={onSubmit}>
		{#if result && !result.passed}
			<div class="rounded border border-amber-700 bg-amber-900/30 p-3 text-sm text-amber-200">
				You scored {result.score}% (need {passingScore}% to pass). Review the questions and try
				again.
			</div>
		{/if}
		{#if errorMsg}
			<div class="rounded border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
				{errorMsg}
			</div>
		{/if}
		{#if hasRandomizableQuestions}
			<div class="flex justify-end">
				<button
					type="button"
					class="rounded border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
					onclick={() => (randomizeEpoch += 1)}
					disabled={submitting || !allowSubmit}
				>
					Randomize choices
				</button>
			</div>
		{/if}

		{#each questions as question, i (question.id ?? i)}
			<fieldset class="space-y-2 rounded border border-slate-800 bg-slate-900/50 p-3">
				<legend class="px-1 text-xs text-slate-400">Question {i + 1}</legend>
				<p class="font-medium">{question.prompt}</p>
				{#if question.type === 'mc'}
					<div class="space-y-1">
						{#each displayOptions[question.id] ?? [] as option, oi (oi)}
							<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800">
								<input
									type="radio"
									name={question.id}
									value={option}
									class="accent-yellow-400"
									checked={answers[question.id] === option}
									onchange={() => (answers[question.id] = option)}
									required
									disabled={submitting || !allowSubmit}
								/>
								<span>{option}</span>
							</label>
						{/each}
					</div>
				{:else if question.type === 'ms'}
					<div class="space-y-1">
						{#each displayOptions[question.id] ?? [] as option, oi (oi)}
							<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800">
								<input
									type="checkbox"
									name={`${question.id}-${oi}`}
									value={option}
									class="accent-yellow-400"
									checked={Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option)}
									onchange={(event) => {
										const checked = (event.currentTarget as HTMLInputElement).checked;
										const current = Array.isArray(answers[question.id])
											? ([...(answers[question.id] as string[])] as string[])
											: [];
										answers[question.id] = checked
											? Array.from(new Set([...current, option]))
											: current.filter((value) => value !== option);
									}}
									disabled={submitting || !allowSubmit || isMsOptionDisabled(question, option)}
								/>
								<span>{option}</span>
							</label>
						{/each}
						{#if getMaxSelect(question) != null}
							<p class="text-xs text-slate-400">
								Select up to {getMaxSelect(question)} option{getMaxSelect(question) === 1 ? '' : 's'}.
							</p>
						{/if}
					</div>
				{:else if question.type === 'tf'}
					<div class="flex gap-2">
						{#each ['true', 'false'] as v (v)}
							<label
								class={`cursor-pointer rounded border px-4 py-1 text-sm ${
									answers[question.id] === v
										? 'border-yellow-400 bg-yellow-900/40 text-yellow-100'
										: 'border-slate-800 bg-slate-800 hover:bg-slate-700'
								}`}
							>
								<input
									type="radio"
									name={question.id}
									value={v}
									class="sr-only"
									checked={answers[question.id] === v}
									onchange={() => (answers[question.id] = v)}
									required
									disabled={submitting || !allowSubmit}
								/>
								{v === 'true' ? 'True' : 'False'}
							</label>
						{/each}
					</div>
				{:else if question.type === 'matrix' || question.type === 'matrix_ms' || question.type === 'short_grid'}
					{@const rows = Array.isArray(question.rows) ? question.rows.map((r) => String(r).trim()).filter(Boolean) : []}
					{@const cols = Array.isArray(question.columns) ? question.columns.map((c) => String(c).trim()).filter(Boolean) : []}
					<div class="space-y-3">
						<div class="space-y-2 md:hidden">
							{#each rows as row, ri (ri)}
								<div class="rounded-lg border border-slate-700/80 bg-slate-900/40 p-3">
									<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{row}</p>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{#each cols as col, ci (ci)}
											<label class="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-xs text-slate-200">
												<span class="truncate">{col}</span>
												{#if question.type === 'matrix'}
													<input
														type="radio"
														name={`${question.id}-${ri}`}
														value={col}
														checked={Boolean(
															answers[question.id] &&
															typeof answers[question.id] === 'object' &&
															!Array.isArray(answers[question.id]) &&
															(answers[question.id] as Record<string, string>)[row] === col
														)}
														onchange={() => {
															const current =
																answers[question.id] &&
																typeof answers[question.id] === 'object' &&
																!Array.isArray(answers[question.id])
																	? { ...(answers[question.id] as Record<string, string>) }
																	: {};
															current[row] = col;
															answers[question.id] = current;
														}}
														disabled={submitting || !allowSubmit}
														class="h-4 w-4 accent-yellow-400"
													/>
												{:else if question.type === 'matrix_ms'}
													<input
														type="checkbox"
														name={`${question.id}-${ri}-${ci}`}
														value={col}
														checked={Boolean(
															answers[question.id] &&
															typeof answers[question.id] === 'object' &&
															!Array.isArray(answers[question.id]) &&
															Array.isArray((answers[question.id] as Record<string, string[]>)[row]) &&
															(answers[question.id] as Record<string, string[]>)[row].includes(col)
														)}
														onchange={(event) => {
															const checked = (event.currentTarget as HTMLInputElement).checked;
															const current =
																answers[question.id] &&
																typeof answers[question.id] === 'object' &&
																!Array.isArray(answers[question.id])
																	? { ...(answers[question.id] as Record<string, string[]>) }
																	: {};
															const rowSelections = Array.isArray(current[row]) ? [...current[row]] : [];
															current[row] = checked
																? Array.from(new Set([...rowSelections, col]))
																: rowSelections.filter((value) => value !== col);
															answers[question.id] = current;
														}}
														disabled={submitting || !allowSubmit}
														class="h-4 w-4 accent-yellow-400"
													/>
												{:else}
													<input
														type="text"
														name={`${question.id}-${ri}-${ci}`}
														value={
															answers[question.id] &&
															typeof answers[question.id] === 'object' &&
															!Array.isArray(answers[question.id]) &&
															(answers[question.id] as Record<string, Record<string, string>>)[row]
																? ((answers[question.id] as Record<string, Record<string, string>>)[row][col] ?? '')
																: ''
														}
														oninput={(event) => {
															const text = (event.currentTarget as HTMLInputElement).value;
															const current =
																answers[question.id] &&
																typeof answers[question.id] === 'object' &&
																!Array.isArray(answers[question.id])
																	? { ...(answers[question.id] as Record<string, Record<string, string>>) }
																	: {};
															const rowMap = { ...(current[row] ?? {}) };
															rowMap[col] = text;
															current[row] = rowMap;
															answers[question.id] = current;
														}}
														class="w-28 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/60"
														placeholder="Enter"
														disabled={submitting || !allowSubmit}
													/>
												{/if}
											</label>
										{/each}
									</div>
								</div>
							{/each}
						</div>

						<div class="hidden overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/40 shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:block">
							<div class="overflow-x-auto">
								<table class="min-w-full border-separate border-spacing-0 text-sm">
							<thead>
								<tr>
									<th class="sticky left-0 z-10 border-b border-r border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs font-semibold text-slate-400"></th>
									{#each cols as col}
										<th class="border-b border-slate-700 bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-slate-200">{col}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each rows as row, ri (ri)}
									<tr class="odd:bg-slate-900/20 even:bg-slate-900/40">
										<td class="sticky left-0 z-10 border-r border-t border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200">{row}</td>
										{#each cols as col, ci (ci)}
											<td class="border-t border-slate-700 px-3 py-2 text-center">
												{#if question.type === 'matrix'}
													<input
														type="radio"
														name={`${question.id}-${ri}`}
														value={col}
														checked={Boolean(
															answers[question.id] &&
															typeof answers[question.id] === 'object' &&
															!Array.isArray(answers[question.id]) &&
															(answers[question.id] as Record<string, string>)[row] === col
														)}
														onchange={() => {
															const current =
																answers[question.id] &&
																typeof answers[question.id] === 'object' &&
																!Array.isArray(answers[question.id])
																	? { ...(answers[question.id] as Record<string, string>) }
																	: {};
															current[row] = col;
															answers[question.id] = current;
														}}
														disabled={submitting || !allowSubmit}
														class="h-4 w-4 accent-yellow-400"
													/>
												{:else if question.type === 'matrix_ms'}
													<input
														type="checkbox"
														name={`${question.id}-${ri}-${ci}`}
														value={col}
														checked={Boolean(
															answers[question.id] &&
															typeof answers[question.id] === 'object' &&
															!Array.isArray(answers[question.id]) &&
															Array.isArray((answers[question.id] as Record<string, string[]>)[row]) &&
															(answers[question.id] as Record<string, string[]>)[row].includes(col)
														)}
														onchange={(event) => {
															const checked = (event.currentTarget as HTMLInputElement).checked;
															const current =
																answers[question.id] &&
																typeof answers[question.id] === 'object' &&
																!Array.isArray(answers[question.id])
																	? { ...(answers[question.id] as Record<string, string[]>) }
																	: {};
															const rowSelections = Array.isArray(current[row]) ? [...current[row]] : [];
															current[row] = checked
																? Array.from(new Set([...rowSelections, col]))
																: rowSelections.filter((value) => value !== col);
															answers[question.id] = current;
														}}
														disabled={submitting || !allowSubmit}
														class="h-4 w-4 accent-yellow-400"
													/>
												{:else}
													<input
														type="text"
														name={`${question.id}-${ri}-${ci}`}
														value={
															answers[question.id] &&
															typeof answers[question.id] === 'object' &&
															!Array.isArray(answers[question.id]) &&
															(answers[question.id] as Record<string, Record<string, string>>)[row]
																? ((answers[question.id] as Record<string, Record<string, string>>)[row][col] ?? '')
																: ''
														}
														oninput={(event) => {
															const text = (event.currentTarget as HTMLInputElement).value;
															const current =
																answers[question.id] &&
																typeof answers[question.id] === 'object' &&
																!Array.isArray(answers[question.id])
																	? { ...(answers[question.id] as Record<string, Record<string, string>>) }
																	: {};
															const rowMap = { ...(current[row] ?? {}) };
															rowMap[col] = text;
															current[row] = rowMap;
															answers[question.id] = current;
														}}
														class="w-full min-w-28 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400/60"
														placeholder="Enter text"
														disabled={submitting || !allowSubmit}
													/>
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
								</table>
							</div>
						</div>
					</div>
				{:else}
					<input
						class="w-full rounded bg-slate-800 px-2 py-2"
						name={question.id}
						value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
						oninput={(event) => (answers[question.id] = (event.currentTarget as HTMLInputElement).value)}
						placeholder="Your answer"
						required
						disabled={submitting || !allowSubmit}
					/>
				{/if}
			</fieldset>
		{/each}

		<div class="flex flex-wrap items-center gap-3">
			<button
				class="rounded bg-yellow-400 px-4 py-2 font-semibold text-slate-900 disabled:opacity-60"
				type="submit"
				disabled={!allowSubmit || submitting || unanswered > 0}
			>
				{!allowSubmit ? 'Quiz already passed' : submitting ? 'Grading…' : result && !result.passed ? 'Resubmit' : 'Submit quiz'}
			</button>
			{#if unanswered > 0}
				<span class="text-xs text-slate-400">{unanswered} question(s) unanswered</span>
			{/if}
			{#if !allowSubmit}
				<span class="text-xs text-slate-400">{lockedMessage || 'No resubmission needed right now.'}</span>
			{/if}
			{#if result && !result.passed}
				<button
					type="button"
					onclick={retake}
					class="rounded border border-slate-800 px-3 py-2 text-sm hover:bg-slate-800"
					>Clear answers</button
				>
			{/if}
		</div>
	</form>
{/if}
