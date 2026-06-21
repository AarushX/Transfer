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
		short_required?: boolean;
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
			| string
			| string[]
			| Record<string, string>
			| Record<string, string[]>
			| Record<string, Record<string, string>>
		>
	>({});
	let submitting = $state(false);
	let result = $state<null | { passed: boolean; score: number }>(null);
	let errorMsg = $state('');
	let randomizeEpoch = $state(0);
	let currentStep = $state(0);

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

	const getMaxSelect = (question: Question): number | null => {
		const value = Number(question.max_select);
		return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
	};
	const isMsOptionDisabled = (question: Question, option: string): boolean => {
		const maxSelect = getMaxSelect(question);
		if (maxSelect == null) return false;
		const selected = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
		if (selected.includes(option)) return false;
		return selected.length >= maxSelect;
	};

	function isAnswered(q: Question): boolean {
		if (q.type === 'ms') {
			const selected = answers[q.id];
			return Array.isArray(selected) && selected.length > 0;
		}
		if (q.type === 'matrix') {
			const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : [];
			const value = answers[q.id];
			if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
			return !rows.some((row) => !String((value as Record<string, string>)[row] ?? '').trim());
		}
		if (q.type === 'matrix_ms') {
			const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : [];
			const value = answers[q.id];
			if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
			return !rows.some((row) => !Array.isArray((value as Record<string, string[]>)[row]) || (value as Record<string, string[]>)[row].length === 0);
		}
		if (q.type === 'short_grid') {
			const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : [];
			const cols = Array.isArray(q.columns) ? q.columns.map((c) => String(c).trim()).filter(Boolean) : [];
			const value = answers[q.id];
			if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
			const map = value as Record<string, Record<string, string>>;
			return !rows.some((row) => cols.some((col) => !String((map[row] ?? {})[col] ?? '').trim()));
		}
		if (q.type === 'short' && q.short_required === false) return true;
		return Boolean(String(answers[q.id] ?? '').trim());
	}

	const currentQuestion = $derived(questions[currentStep]);
	const currentAnswered = $derived(currentQuestion ? isAnswered(currentQuestion) : false);
	const isLastStep = $derived(currentStep === questions.length - 1);
	const allAnswered = $derived(questions.every(isAnswered));

	async function submitAll() {
		if (submitting) return;
		submitting = true;
		errorMsg = '';
		const fd = new FormData();
		fd.set('nodeId', nodeId);
		if (segmentId) fd.set('segmentId', segmentId);
		if (blockId) fd.set('blockId', blockId);
		for (const q of questions) {
			if (q.type === 'ms') {
				fd.set(q.id, JSON.stringify(Array.isArray(answers[q.id]) ? answers[q.id] : []));
			} else if (q.type === 'matrix' || q.type === 'matrix_ms') {
				fd.set(q.id, JSON.stringify(answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) ? answers[q.id] : {}));
			} else if (q.type === 'short_grid') {
				fd.set(q.id, JSON.stringify(answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) ? answers[q.id] : {}));
			} else {
				fd.set(q.id, String(answers[q.id] ?? ''));
			}
		}
		try {
			const res = await fetch('/api/quiz/grade', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				errorMsg = typeof body?.error === 'string' ? body.error : 'Grading failed. Please try again.';
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

	function handleNext() {
		if (!currentAnswered) return;
		if (isLastStep) {
			submitAll();
		} else {
			currentStep++;
		}
	}

	function retake() {
		answers = {};
		result = null;
		errorMsg = '';
		randomizeEpoch += 1;
		currentStep = 0;
	}
</script>

{#if result?.passed}
	<div
		class="rounded-2xl border p-6 text-center"
		style="background: color-mix(in srgb, var(--app-success) 8%, var(--app-surface)); border-color: color-mix(in srgb, var(--app-success) 30%, transparent);"
	>
		<div
			class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full"
			style="background: color-mix(in srgb, var(--app-success) 15%, transparent);"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6" style="color: var(--app-success);"><polyline points="4 12 10 18 20 6" /></svg>
		</div>
		<p class="text-xl font-bold" style="color: var(--app-success);">Passed — {result.score}%</p>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			A mentor checkoff request has been sent. Check your
			<a class="underline" href="/passport">passport</a> or dashboard.
		</p>
	</div>
{:else}
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<p class="eyebrow-label">Knowledge check</p>
		<span class="mono text-[12px]" style="color: var(--app-text-muted);">
			Q {currentStep + 1} OF {questions.length} · PASS ≥ {passingScore}%
		</span>
	</div>

	{#if result && !result.passed}
		<div
			class="mb-4 rounded-xl border p-3 text-sm"
			style="border-color: color-mix(in srgb, var(--app-warning) 35%, transparent); background: color-mix(in srgb, var(--app-warning) 8%, transparent); color: var(--app-warning);"
		>
			You scored {result.score}% — need {passingScore}% to pass. Review your answers and try again.
		</div>
	{/if}
	{#if errorMsg}
		<div
			class="mb-4 rounded-xl border p-3 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 35%, transparent); background: color-mix(in srgb, var(--app-danger) 8%, transparent); color: var(--app-danger);"
		>
			{errorMsg}
		</div>
	{/if}

	{#if currentQuestion}
		{@const q = currentQuestion}
		<div
			class="rounded-2xl border p-5"
			style="background: var(--app-surface); border-color: var(--app-border);"
		>
			<!-- Question text -->
			<p class="mb-4 text-[15px] font-semibold leading-snug" style="color: var(--app-text);">{q.prompt}</p>

			<!-- MC options -->
			{#if q.type === 'mc'}
				<div class="flex flex-col gap-2">
					{#each displayOptions[q.id] ?? [] as option, oi (oi)}
						{@const selected = answers[q.id] === option}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition-all"
							style="background: {selected ? 'color-mix(in srgb, var(--app-accent) 10%, white)' : 'var(--app-surface)'}; border-color: {selected ? 'var(--app-accent)' : 'var(--app-border)'}; color: {selected ? 'var(--app-accent)' : 'var(--app-text)'}; font-weight: {selected ? '600' : '400'}; cursor: {submitting || !allowSubmit ? 'not-allowed' : 'pointer'}; opacity: {submitting || !allowSubmit ? 0.6 : 1};"
							onclick={() => { if (!submitting && allowSubmit) answers[q.id] = option; }}
							disabled={submitting || !allowSubmit}
						>
							<span
								class="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2"
								style="border-color: {selected ? 'var(--app-accent)' : 'var(--app-border)'}; background: {selected ? 'var(--app-accent)' : 'transparent'};"
							>
								{#if selected}
									<span class="h-2 w-2 rounded-full" style="background: white;"></span>
								{/if}
							</span>
							{option}
						</button>
					{/each}
				</div>

			<!-- MS (multi-select) options -->
			{:else if q.type === 'ms'}
				{#if getMaxSelect(q) != null}
					<p class="mb-2 text-[12px]" style="color: var(--app-text-dim);">Select up to {getMaxSelect(q)}.</p>
				{/if}
				<div class="flex flex-col gap-2">
					{#each displayOptions[q.id] ?? [] as option, oi (oi)}
						{@const checked = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(option)}
						{@const disabled = submitting || !allowSubmit || isMsOptionDisabled(q, option)}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition-all"
							style="background: {checked ? 'color-mix(in srgb, var(--app-accent) 10%, white)' : 'var(--app-surface)'}; border-color: {checked ? 'var(--app-accent)' : 'var(--app-border)'}; color: {checked ? 'var(--app-accent)' : 'var(--app-text)'}; font-weight: {checked ? '600' : '400'}; cursor: {disabled ? 'not-allowed' : 'pointer'}; opacity: {disabled && !checked ? 0.45 : 1};"
							onclick={() => {
								if (disabled && !checked) return;
								if (submitting || !allowSubmit) return;
								const cur = Array.isArray(answers[q.id]) ? ([...(answers[q.id] as string[])] as string[]) : [];
								answers[q.id] = checked ? cur.filter((v) => v !== option) : Array.from(new Set([...cur, option]));
							}}
						>
							<span
								class="grid h-5 w-5 shrink-0 place-items-center rounded"
								style="border: 2px solid {checked ? 'var(--app-accent)' : 'var(--app-border)'}; background: {checked ? 'var(--app-accent)' : 'transparent'};"
							>
								{#if checked}
									<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><polyline points="4 12 10 18 20 6" /></svg>
								{/if}
							</span>
							{option}
						</button>
					{/each}
				</div>

			<!-- True/False -->
			{:else if q.type === 'tf'}
				<div class="flex gap-3">
					{#each ['true', 'false'] as v (v)}
						{@const selected = answers[q.id] === v}
						<button
							type="button"
							class="flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all"
							style="background: {selected ? 'color-mix(in srgb, var(--app-accent) 10%, white)' : 'var(--app-surface)'}; border-color: {selected ? 'var(--app-accent)' : 'var(--app-border)'}; color: {selected ? 'var(--app-accent)' : 'var(--app-text-muted)'}; cursor: {submitting || !allowSubmit ? 'not-allowed' : 'pointer'};"
							onclick={() => { if (!submitting && allowSubmit) answers[q.id] = v; }}
							disabled={submitting || !allowSubmit}
						>
							{v === 'true' ? 'True' : 'False'}
						</button>
					{/each}
				</div>

			<!-- Matrix / Matrix MS -->
			{:else if q.type === 'matrix' || q.type === 'matrix_ms' || q.type === 'short_grid'}
				{@const rows = Array.isArray(q.rows) ? q.rows.map((r) => String(r).trim()).filter(Boolean) : []}
				{@const cols = Array.isArray(q.columns) ? q.columns.map((c) => String(c).trim()).filter(Boolean) : []}
				<div class="overflow-x-auto rounded-xl border" style="border-color: var(--app-border);">
					<table class="min-w-full border-separate border-spacing-0 text-sm">
						<thead>
							<tr>
								<th class="border-b border-r px-3 py-2 text-left text-xs font-semibold" style="border-color: var(--app-border); color: var(--app-text-dim); background: var(--app-surface-alt);"></th>
								{#each cols as col}
									<th class="border-b px-3 py-2 text-center text-xs font-semibold" style="border-color: var(--app-border); color: var(--app-text-muted); background: var(--app-surface-alt);">{col}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each rows as row, ri (ri)}
								<tr style="background: {ri % 2 === 0 ? 'var(--app-surface)' : 'var(--app-surface-alt)'};">
									<td class="border-t border-r px-3 py-2 text-xs font-medium" style="border-color: var(--app-border); color: var(--app-text);">{row}</td>
									{#each cols as col, ci (ci)}
										<td class="border-t px-3 py-2 text-center" style="border-color: var(--app-border);">
											{#if q.type === 'matrix'}
												<input
													type="radio"
													name={`${q.id}-${ri}`}
													value={col}
													checked={Boolean(answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) && (answers[q.id] as Record<string, string>)[row] === col)}
													onchange={() => {
														const cur = answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) ? { ...(answers[q.id] as Record<string, string>) } : {};
														cur[row] = col;
														answers[q.id] = cur;
													}}
													disabled={submitting || !allowSubmit}
													class="h-4 w-4"
													style="accent-color: var(--app-accent);"
												/>
											{:else if q.type === 'matrix_ms'}
												<input
													type="checkbox"
													name={`${q.id}-${ri}-${ci}`}
													value={col}
													checked={Boolean(answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) && Array.isArray((answers[q.id] as Record<string, string[]>)[row]) && (answers[q.id] as Record<string, string[]>)[row].includes(col))}
													onchange={(event) => {
														const chk = (event.currentTarget as HTMLInputElement).checked;
														const cur = answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) ? { ...(answers[q.id] as Record<string, string[]>) } : {};
														const rs = Array.isArray(cur[row]) ? [...cur[row]] : [];
														cur[row] = chk ? Array.from(new Set([...rs, col])) : rs.filter((v) => v !== col);
														answers[q.id] = cur;
													}}
													disabled={submitting || !allowSubmit}
													class="h-4 w-4"
													style="accent-color: var(--app-accent);"
												/>
											{:else}
												<input
													type="text"
													value={answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) && (answers[q.id] as Record<string, Record<string, string>>)[row] ? ((answers[q.id] as Record<string, Record<string, string>>)[row][col] ?? '') : ''}
													oninput={(event) => {
														const text = (event.currentTarget as HTMLInputElement).value;
														const cur = answers[q.id] && typeof answers[q.id] === 'object' && !Array.isArray(answers[q.id]) ? { ...(answers[q.id] as Record<string, Record<string, string>>) } : {};
														const rm = { ...(cur[row] ?? {}) };
														rm[col] = text;
														cur[row] = rm;
														answers[q.id] = cur;
													}}
													class="w-full min-w-24 rounded-lg border px-2 py-1.5 text-xs"
													style="border-color: var(--app-border); background: var(--app-surface); color: var(--app-text);"
													placeholder="Enter"
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

			<!-- Short answer -->
			{:else}
				<input
					class="w-full rounded-xl border px-4 py-3 text-[14px]"
					style="border-color: var(--app-border); background: var(--app-surface); color: var(--app-text);"
					value={typeof answers[q.id] === 'string' ? answers[q.id] : ''}
					oninput={(event) => (answers[q.id] = (event.currentTarget as HTMLInputElement).value)}
					placeholder="Your answer…"
					required={q.short_required !== false}
					disabled={submitting || !allowSubmit}
				/>
			{/if}
		</div>

		<!-- Step navigation -->
		<div class="mt-4 flex items-center justify-between gap-3">
			<button
				type="button"
				class="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
				style="background: transparent; border: none; color: {currentStep > 0 ? 'var(--app-text-muted)' : 'transparent'}; cursor: {currentStep > 0 ? 'pointer' : 'default'};"
				onclick={() => { if (currentStep > 0) currentStep--; }}
				disabled={currentStep === 0}
			>
				← Back
			</button>
			{#if !allowSubmit}
				<span class="text-xs" style="color: var(--app-text-dim);">{lockedMessage || 'Quiz already passed.'}</span>
			{:else}
				<button
					type="button"
					class="rounded-xl px-5 py-2.5 text-sm font-bold transition-all"
					style="background: {currentAnswered ? 'var(--app-accent)' : 'var(--app-border)'}; color: {currentAnswered ? 'white' : 'var(--app-text-dim)'}; border: none; cursor: {currentAnswered && !submitting ? 'pointer' : 'not-allowed'};"
					onclick={handleNext}
					disabled={!currentAnswered || submitting}
				>
					{#if submitting}
						Grading…
					{:else if isLastStep}
						Submit quiz →
					{:else}
						Record answer →
					{/if}
				</button>
			{/if}
		</div>

		{#if result && !result.passed}
			<div class="mt-3 flex justify-center">
				<button
					type="button"
					onclick={retake}
					class="text-sm underline"
					style="background: none; border: none; color: var(--app-text-muted); cursor: pointer;"
				>
					Clear answers &amp; retry
				</button>
			</div>
		{/if}
	{/if}
{/if}
