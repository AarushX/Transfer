<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	type Question = {
		id: string;
		prompt: string;
		type: 'mc' | 'ms' | 'tf' | 'short';
		options?: string[];
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

	let answers = $state<Record<string, string | string[]>>({});
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
				{:else}
					<input
						class="w-full rounded bg-slate-800 px-2 py-2"
						name={question.id}
						bind:value={answers[question.id]}
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
