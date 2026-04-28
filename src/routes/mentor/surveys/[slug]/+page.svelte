<script lang="ts">
	let { data, form } = $props();
	type SurveyQuestion = {
		id: string;
		prompt: string;
		type: 'mc' | 'ms' | 'tf' | 'short';
		options?: string[];
		correct?: string | string[];
		randomize_options?: boolean;
		max_select?: number;
		short_ignore_case?: boolean;
		short_ignore_punctuation?: boolean;
	};

	const survey = data.survey;
	const outcomeRulesJson = String((data as { outcomeRulesJson?: string }).outcomeRulesJson ?? '[]');
	const selectedPrereqs = new Set(data.prereqIds as string[]);
	let questions = $state<SurveyQuestion[]>(
		Array.isArray(survey.questions) ? (survey.questions as SurveyQuestion[]) : []
	);
	const questionsJson = $derived(JSON.stringify(questions));
	const dateValue = (value: string | null) => {
		if (!value) return '';
		const d = new Date(value);
		const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
		return local.toISOString().slice(0, 16);
	};
	const addQuestion = () => {
		questions = [
			...questions,
			{ id: `q${questions.length + 1}`, prompt: '', type: 'mc', options: ['', ''], correct: '', randomize_options: false }
		];
	};
	const removeQuestion = (idx: number) => {
		questions = questions.filter((_, i) => i !== idx);
	};
	const onTypeChange = (q: SurveyQuestion) => {
		if (q.type === 'mc') {
			q.options = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['', ''];
			q.correct = typeof q.correct === 'string' ? q.correct : '';
			q.randomize_options = q.randomize_options ?? false;
		} else if (q.type === 'ms') {
			q.options = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['', ''];
			q.correct = Array.isArray(q.correct) ? q.correct : [];
			q.max_select = q.max_select ?? undefined;
			q.randomize_options = q.randomize_options ?? false;
		} else if (q.type === 'tf') {
			q.options = undefined;
			q.correct = q.correct === 'false' ? 'false' : 'true';
		} else {
			q.options = undefined;
			q.correct = typeof q.correct === 'string' ? q.correct : '';
			q.short_ignore_case = q.short_ignore_case ?? true;
			q.short_ignore_punctuation = q.short_ignore_punctuation ?? false;
		}
	};
	const prettyJson = (value: unknown) => {
		try {
			return JSON.stringify(value ?? {}, null, 2);
		} catch {
			return '{}';
		}
	};
	type Submission = (typeof data.submissions)[number];
	let responsesView = $state<'summary' | 'question' | 'individual'>('summary');
	let selectedQuestionId = $state<string>('');
	let selectedResponseIndex = $state(0);
	const responseQuestions = $derived<SurveyQuestion[]>(
		Array.isArray(survey.questions) ? (survey.questions as SurveyQuestion[]) : []
	);
	$effect(() => {
		if (!selectedQuestionId && responseQuestions.length > 0) {
			selectedQuestionId = responseQuestions[0].id;
		}
	});
	const submissions = $derived((data.submissions as Submission[]) ?? []);
	const totalResponses = $derived(submissions.length);
	const completedQuestionsPerResponse = (submission: Submission) => {
		const answers = (submission.answers ?? {}) as Record<string, unknown>;
		let count = 0;
		for (const q of responseQuestions) {
			const raw = answers[q.id];
			if (Array.isArray(raw)) {
				if (raw.length > 0) count += 1;
			} else if (String(raw ?? '').trim()) {
				count += 1;
			}
		}
		return count;
	};
	const avgCompletionRate = $derived.by(() => {
		if (submissions.length === 0 || responseQuestions.length === 0) return 0;
		const totalPossible = submissions.length * responseQuestions.length;
		const completed = submissions.reduce((sum, s) => sum + completedQuestionsPerResponse(s), 0);
		return Math.round((completed / totalPossible) * 100);
	});
	const selectedQuestion = $derived(
		responseQuestions.find((q) => q.id === selectedQuestionId) ?? null
	);
	const selectedSubmission = $derived(
		submissions.length > 0
			? submissions[Math.max(0, Math.min(selectedResponseIndex, submissions.length - 1))]
			: null
	);
	const answerDisplay = (value: unknown): string => {
		if (Array.isArray(value)) return value.join(', ');
		return String(value ?? '').trim() || 'No response';
	};
	const questionSummaryRows = $derived.by(() => {
		if (!selectedQuestion) return [];
		const answers = submissions.map((submission) => {
			const value = (submission.answers ?? {})[selectedQuestion.id];
			return {
				value,
				label: answerDisplay(value),
				submission
			};
		});
		if (selectedQuestion.type === 'mc' || selectedQuestion.type === 'tf') {
			const map = new Map<string, number>();
			for (const row of answers) {
				const key = String(row.value ?? '').trim() || 'No response';
				map.set(key, (map.get(key) ?? 0) + 1);
			}
			return Array.from(map.entries())
				.map(([label, count]) => ({ label, count, percent: totalResponses ? Math.round((count / totalResponses) * 100) : 0 }))
				.sort((a, b) => b.count - a.count);
		}
		if (selectedQuestion.type === 'ms') {
			const map = new Map<string, number>();
			for (const row of answers) {
				const list = Array.isArray(row.value) ? row.value : [];
				if (list.length === 0) {
					map.set('No response', (map.get('No response') ?? 0) + 1);
					continue;
				}
				for (const item of list) {
					const key = String(item ?? '').trim();
					if (!key) continue;
					map.set(key, (map.get(key) ?? 0) + 1);
				}
			}
			return Array.from(map.entries())
				.map(([label, count]) => ({ label, count, percent: totalResponses ? Math.round((count / totalResponses) * 100) : 0 }))
				.sort((a, b) => b.count - a.count);
		}
		return answers.map((row) => ({
			label: row.label,
			count: 1,
			percent: 0,
			submission: row.submission
		}));
	});
</script>

<section class="space-y-4">
	<div>
		<a href="/mentor/surveys" class="text-xs text-slate-400">← Surveys</a>
		<h1 class="text-2xl font-semibold">Edit Survey</h1>
		<p class="text-xs text-slate-400">{survey.slug}</p>
	</div>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}
	<form method="POST" action="?/saveSurvey" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span>Title</span>
			<input class="rounded bg-slate-800 px-2 py-2" name="title" value={survey.title} required />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Description</span>
			<textarea class="rounded bg-slate-800 px-2 py-2" rows="3" name="description">{survey.description ?? ''}</textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm md:max-w-xs">
			<span>Max submissions per student</span>
			<input
				type="number"
				min="1"
				class="rounded bg-slate-800 px-2 py-2"
				name="max_submissions"
				value={Number(survey.max_submissions ?? 1)}
				required
			/>
		</label>
		<label class="inline-flex items-center gap-2 text-sm">
			<input type="checkbox" name="allow_role_mapping" checked={survey.allow_role_mapping === true} />
			Allow mapping answers to profile roles (use only with trusted surveys)
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Outcome rules (JSON)</span>
			<p class="text-xs text-slate-500">
				Array of rules: each sets exactly one of <code class="text-slate-300">team_slug</code>,
				<code class="text-slate-300">tag_slug</code>, or <code class="text-slate-300">target_role</code>.
			</p>
			<textarea class="font-mono rounded bg-slate-800 px-2 py-2 text-xs" rows="12" name="outcome_rules_json">{outcomeRulesJson}</textarea>
		</label>
		<div class="grid gap-2 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm">
				<span>Visible from (optional)</span>
				<input type="datetime-local" class="rounded bg-slate-800 px-2 py-2" name="visible_from" value={dateValue(survey.visible_from)} />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span>Visible until (optional)</span>
				<input type="datetime-local" class="rounded bg-slate-800 px-2 py-2" name="visible_until" value={dateValue(survey.visible_until)} />
			</label>
		</div>
		<div class="flex flex-wrap gap-4 text-sm">
			<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked={survey.is_active} /> Active</label>
			<label class="inline-flex items-center gap-2">
				<input type="checkbox" name="show_when_inactive" checked={survey.show_when_inactive} />
				Show to users when inactive
			</label>
		</div>
		<div>
			<p class="mb-1 text-sm">Module prerequisites</p>
			<div class="grid max-h-52 gap-1 overflow-auto rounded border border-slate-800 bg-slate-950 p-2">
				{#each data.nodes as node (node.id)}
					<label class="inline-flex items-center gap-2 text-sm">
						<input type="checkbox" name="prereq_node_ids" value={node.id} checked={selectedPrereqs.has(node.id)} />
						{node.title}
					</label>
				{/each}
			</div>
		</div>
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold">Questions</p>
				<button type="button" class="rounded border border-slate-700 px-2 py-1 text-xs" onclick={addQuestion}>+ Add question</button>
			</div>
			{#each questions as q, idx (q.id)}
				<div class="space-y-2 rounded border border-slate-800 bg-slate-950/60 p-3">
					<div class="flex items-center justify-between">
						<p class="text-xs text-slate-400">Q{idx + 1}</p>
						<button type="button" class="text-xs text-red-300" onclick={() => removeQuestion(idx)}>Remove</button>
					</div>
					<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" placeholder="Prompt" bind:value={q.prompt} />
					<select class="rounded bg-slate-800 px-2 py-2 text-sm" bind:value={q.type} onchange={() => onTypeChange(q)}>
						<option value="mc">Multiple choice</option>
						<option value="ms">Multiple select</option>
						<option value="tf">True / False</option>
						<option value="short">Short answer</option>
					</select>
					{#if q.type === 'mc'}
						{#each q.options ?? [] as _o, oi (oi)}
							<div class="flex items-center gap-2">
								<input type="radio" name={`mc-${idx}`} checked={q.correct === q.options?.[oi]} onchange={() => (q.correct = q.options?.[oi] ?? '')} />
								<input class="flex-1 rounded bg-slate-800 px-2 py-1 text-sm" bind:value={q.options![oi]} placeholder={`Option ${oi + 1}`} />
							</div>
						{/each}
						<div class="flex items-center gap-3">
							<button type="button" class="rounded border border-slate-700 px-2 py-1 text-xs" onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button>
							<label class="inline-flex items-center gap-2 text-xs">
								<input type="checkbox" checked={q.randomize_options ?? false} onchange={(e) => (q.randomize_options = (e.currentTarget as HTMLInputElement).checked)} />
								Randomize options
							</label>
						</div>
					{:else if q.type === 'ms'}
						{#each q.options ?? [] as _o, oi (oi)}
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={Array.isArray(q.correct) && q.correct.includes(q.options![oi])}
									onchange={(e) => {
										const checked = (e.currentTarget as HTMLInputElement).checked;
										const current = Array.isArray(q.correct) ? q.correct : [];
										const option = q.options![oi];
										q.correct = checked ? Array.from(new Set([...current, option])) : current.filter((v) => v !== option);
									}}
								/>
								<input class="flex-1 rounded bg-slate-800 px-2 py-1 text-sm" bind:value={q.options![oi]} placeholder={`Option ${oi + 1}`} />
							</div>
						{/each}
						<div class="flex flex-wrap items-center gap-3">
							<button type="button" class="rounded border border-slate-700 px-2 py-1 text-xs" onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button>
							<label class="inline-flex items-center gap-2 text-xs">
								<input type="checkbox" checked={q.randomize_options ?? false} onchange={(e) => (q.randomize_options = (e.currentTarget as HTMLInputElement).checked)} />
								Randomize options
							</label>
							<label class="inline-flex items-center gap-2 text-xs">
								Max selections
								<input
									type="number"
									min="1"
									max={Math.max(1, (q.options ?? []).length)}
									class="w-20 rounded bg-slate-800 px-2 py-1"
									value={q.max_select ?? ''}
									oninput={(e) => {
										const raw = (e.currentTarget as HTMLInputElement).value.trim();
										q.max_select = raw ? Math.max(1, Math.min(Number(raw) || 1, (q.options ?? []).length)) : undefined;
									}}
								/>
							</label>
						</div>
					{:else if q.type === 'tf'}
						<div class="flex gap-2">
							<button type="button" class={`rounded border px-3 py-1 text-xs ${q.correct === 'true' ? 'border-yellow-400' : 'border-slate-700'}`} onclick={() => (q.correct = 'true')}>True</button>
							<button type="button" class={`rounded border px-3 py-1 text-xs ${q.correct === 'false' ? 'border-yellow-400' : 'border-slate-700'}`} onclick={() => (q.correct = 'false')}>False</button>
						</div>
					{:else}
						<input class="w-full rounded bg-slate-800 px-2 py-2 text-sm" placeholder="Expected answer" value={typeof q.correct === 'string' ? q.correct : ''} oninput={(e) => (q.correct = (e.currentTarget as HTMLInputElement).value)} />
						<div class="flex gap-4 text-xs">
							<label class="inline-flex items-center gap-2"><input type="checkbox" checked={q.short_ignore_case ?? true} onchange={(e) => (q.short_ignore_case = (e.currentTarget as HTMLInputElement).checked)} />Ignore capitalization</label>
							<label class="inline-flex items-center gap-2"><input type="checkbox" checked={q.short_ignore_punctuation ?? false} onchange={(e) => (q.short_ignore_punctuation = (e.currentTarget as HTMLInputElement).checked)} />Ignore punctuation</label>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<input type="hidden" name="questions_json" value={questionsJson} />
		<div class="flex gap-2">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Save survey</button>
			<button formmethod="POST" formaction="?/deleteSurvey" class="rounded border border-red-700 px-4 py-2 text-sm text-red-200">Delete</button>
		</div>
	</form>

	<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Responses</h2>
			<p class="text-xs text-slate-400">{totalResponses} submission(s)</p>
		</div>

		<div class="grid gap-3 md:grid-cols-3">
			<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-xs text-slate-400">Total responses</p>
				<p class="text-xl font-semibold">{totalResponses}</p>
			</div>
			<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-xs text-slate-400">Questions</p>
				<p class="text-xl font-semibold">{responseQuestions.length}</p>
			</div>
			<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
				<p class="text-xs text-slate-400">Avg completion</p>
				<p class="text-xl font-semibold">{avgCompletionRate}%</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class={`rounded border px-3 py-1.5 text-xs ${responsesView === 'summary' ? 'border-yellow-400 bg-yellow-900/30 text-yellow-200' : 'border-slate-700'}`}
				onclick={() => (responsesView = 'summary')}>Summary</button
			>
			<button
				type="button"
				class={`rounded border px-3 py-1.5 text-xs ${responsesView === 'question' ? 'border-yellow-400 bg-yellow-900/30 text-yellow-200' : 'border-slate-700'}`}
				onclick={() => (responsesView = 'question')}>Question view</button
			>
			<button
				type="button"
				class={`rounded border px-3 py-1.5 text-xs ${responsesView === 'individual' ? 'border-yellow-400 bg-yellow-900/30 text-yellow-200' : 'border-slate-700'}`}
				onclick={() => (responsesView = 'individual')}>Individual responses</button
			>
		</div>

		{#if totalResponses === 0}
			<p class="text-sm text-slate-400">No responses yet.</p>
		{:else if responsesView === 'summary'}
			<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
				<p class="mb-2 text-sm font-semibold">Recent submissions</p>
				<div class="space-y-2">
					{#each submissions.slice(0, 10) as submission (submission.id)}
						<div class="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
							<p>{submission.profile?.full_name || submission.profile?.email || submission.user_id}</p>
							<p class="text-xs text-slate-400">{new Date(submission.submitted_at).toLocaleString()}</p>
						</div>
					{/each}
				</div>
			</div>
		{:else if responsesView === 'question'}
			<div class="space-y-3 rounded border border-slate-800 bg-slate-950/60 p-3">
				<label class="flex flex-col gap-1 text-sm">
					<span>Question</span>
					<select class="rounded bg-slate-800 px-2 py-2 text-sm" bind:value={selectedQuestionId}>
						{#each responseQuestions as q, idx (q.id)}
							<option value={q.id}>Q{idx + 1}. {q.prompt || '(untitled question)'}</option>
						{/each}
					</select>
				</label>
				{#if selectedQuestion}
					<p class="text-sm text-slate-300">{selectedQuestion.prompt}</p>
					{#if selectedQuestion.type === 'short'}
						<div class="space-y-2">
							{#each questionSummaryRows as row, i (i)}
								<div class="rounded border border-slate-800 bg-slate-900/60 p-2 text-sm">
									{row.label}
								</div>
							{/each}
						</div>
					{:else}
						<div class="space-y-2">
							{#each questionSummaryRows as row (row.label)}
								<div class="space-y-1 rounded border border-slate-800 bg-slate-900/60 p-2">
									<div class="flex items-center justify-between text-sm">
										<p>{row.label}</p>
										<p class="text-xs text-slate-400">{row.count} ({row.percent}%)</p>
									</div>
									<div class="h-2 rounded bg-slate-800">
										<div class="h-2 rounded bg-yellow-500" style={`width:${Math.min(100, Math.max(0, row.percent))}%`}></div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="space-y-3 rounded border border-slate-800 bg-slate-950/60 p-3">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<p class="text-sm font-semibold">Response {selectedResponseIndex + 1} of {totalResponses}</p>
					<div class="flex items-center gap-2">
						<button
							type="button"
							class="rounded border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
							onclick={() => (selectedResponseIndex = Math.max(0, selectedResponseIndex - 1))}
							disabled={selectedResponseIndex <= 0}>Previous</button
						>
						<button
							type="button"
							class="rounded border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
							onclick={() =>
								(selectedResponseIndex = Math.min(totalResponses - 1, selectedResponseIndex + 1))}
							disabled={selectedResponseIndex >= totalResponses - 1}>Next</button
						>
					</div>
				</div>
				{#if selectedSubmission}
					<div class="rounded border border-slate-800 bg-slate-900/60 p-3 text-sm">
						<p class="font-medium">
							{selectedSubmission.profile?.full_name ||
								selectedSubmission.profile?.email ||
								selectedSubmission.user_id}
						</p>
						<p class="text-xs text-slate-400">
							Submitted {new Date(selectedSubmission.submitted_at).toLocaleString()}
						</p>
					</div>
					<div class="space-y-2">
						{#each responseQuestions as q, idx (q.id)}
							<div class="rounded border border-slate-800 bg-slate-900/60 p-3">
								<p class="text-xs text-slate-400">Q{idx + 1}</p>
								<p class="text-sm font-medium">{q.prompt}</p>
								<p class="mt-1 text-sm text-slate-200">
									{answerDisplay((selectedSubmission.answers ?? {})[q.id])}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
