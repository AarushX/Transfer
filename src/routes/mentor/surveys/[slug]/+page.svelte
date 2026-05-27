<script lang="ts">
	import { WORKFLOW_META } from '$lib/surveys/workflows';
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
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
			{
				id: `q${questions.length + 1}`,
				prompt: '',
				type: 'mc',
				options: ['', ''],
				correct: '',
				randomize_options: false
			}
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
				.map(([label, count]) => ({
					label,
					count,
					percent: totalResponses ? Math.round((count / totalResponses) * 100) : 0
				}))
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
				.map(([label, count]) => ({
					label,
					count,
					percent: totalResponses ? Math.round((count / totalResponses) * 100) : 0
				}))
				.sort((a, b) => b.count - a.count);
		}
		return answers.map((row) => ({
			label: row.label,
			count: 1,
			percent: 0,
			submission: row.submission
		}));
	});

	const gi = 'rounded-lg border px-2 py-2 backdrop-blur-sm';
	const gs =
		'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);';
</script>

<section class="space-y-5">
	<div class="fade-up">
		<a href="/mentor/surveys" class="text-xs" style="color: var(--app-text-muted);">← Surveys</a>
		<p class="eyebrow-label" style="margin-top: 4px; margin-bottom: 2px;">Edit Survey</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">{survey.title}</span>
		</h1>
		<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
			{survey.slug} · Workflow: {data.workflowKind === 'custom'
				? 'Custom'
				: (WORKFLOW_META[data.workflowKind]?.label ?? 'Custom')}
		</p>
	</div>
	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{:else if form?.ok}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Saved.
		</p>
	{/if}
	<form
		method="POST"
		action="?/saveSurvey"
		class="fade-up space-y-3 rounded-2xl border p-5 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;"
	>
		<label class="flex flex-col gap-1 text-sm"
			><span style="color: var(--app-text);">Title</span><input
				class={gi}
				style={gs}
				name="title"
				value={survey.title}
				required
			/></label
		>
		<label class="flex flex-col gap-1 text-sm"
			><span style="color: var(--app-text);">Description</span><textarea
				class={gi}
				style={gs}
				rows="3"
				name="description">{survey.description ?? ''}</textarea
			></label
		>
		<label class="flex flex-col gap-1 text-sm md:max-w-xs"
			><span style="color: var(--app-text);">Max submissions per student</span><input
				type="number"
				min="1"
				class={gi}
				style={gs}
				name="max_submissions"
				value={Number(survey.max_submissions ?? 1)}
				required
			/></label
		>
		<div class="grid gap-2 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm"
				><span style="color: var(--app-text);">Visible from (optional)</span><input
					type="datetime-local"
					class={gi}
					style={gs}
					name="visible_from"
					value={dateValue(survey.visible_from)}
				/></label
			>
			<label class="flex flex-col gap-1 text-sm"
				><span style="color: var(--app-text);">Visible until (optional)</span><input
					type="datetime-local"
					class={gi}
					style={gs}
					name="visible_until"
					value={dateValue(survey.visible_until)}
				/></label
			>
		</div>
		<div class="flex flex-wrap gap-4 text-sm" style="color: var(--app-text);">
			<label class="inline-flex items-center gap-2"
				><input type="checkbox" name="is_active" checked={survey.is_active} /> Active</label
			>
			<label class="inline-flex items-center gap-2"
				><input type="checkbox" name="show_when_inactive" checked={survey.show_when_inactive} /> Show
				to users when inactive</label
			>
			<label class="inline-flex items-center gap-2"
				><input
					type="checkbox"
					name="allow_student_view_submissions"
					checked={survey.allow_student_view_submissions}
				/> Allow students to view submissions</label
			>
			<label class="inline-flex items-center gap-2"
				><input type="checkbox" name="allow_student_edits" checked={survey.allow_student_edits} /> Allow
				student edits</label
			>
		</div>
		<label class="flex flex-col gap-1 text-sm md:max-w-sm"
			><span style="color: var(--app-text);">Student edit deadline (optional)</span><input
				type="datetime-local"
				class={gi}
				style={gs}
				name="student_edit_deadline"
				value={dateValue(survey.student_edit_deadline)}
			/></label
		>
		<div>
			<p class="mb-1 text-sm" style="color: var(--app-text);">Module prerequisites</p>
			<div
				class="grid max-h-52 gap-1 overflow-auto rounded-lg border p-2"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				{#each data.nodes as node (node.id)}
					<label class="inline-flex items-center gap-2 text-sm" style="color: var(--app-text);"
						><input
							type="checkbox"
							name="prereq_node_ids"
							value={node.id}
							checked={selectedPrereqs.has(node.id)}
						/>
						{node.title}</label
					>
				{/each}
			</div>
		</div>
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold" style="color: var(--app-text);">Questions</p>
				<Button variant="secondary" size="sm" onclick={addQuestion}>+ Add question</Button>
			</div>
			{#each questions as q, idx (q.id)}
				<div
					class="space-y-2 rounded-lg border p-3"
					style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
				>
					<div class="flex items-center justify-between">
						<p class="text-xs" style="color: var(--app-text-muted);">Q{idx + 1}</p>
						<button
							type="button"
							class="text-xs"
							style="color: var(--app-danger);"
							onclick={() => removeQuestion(idx)}>Remove</button
						>
					</div>
					<input
						class={'w-full ' + gi + ' text-sm'}
						style={gs}
						placeholder="Prompt"
						bind:value={q.prompt}
					/>
					<select
						class={gi + ' text-sm'}
						style={gs}
						bind:value={q.type}
						onchange={() => onTypeChange(q)}
					>
						<option value="mc">Multiple choice</option>
						<option value="ms">Multiple select</option>
						<option value="tf">True / False</option>
						<option value="short">Short answer</option>
					</select>
					{#if q.type === 'mc'}
						{#each q.options ?? [] as _o, oi (oi)}
							<div class="flex items-center gap-2">
								<input
									type="radio"
									name={`mc-${idx}`}
									checked={q.correct === q.options?.[oi]}
									onchange={() => (q.correct = q.options?.[oi] ?? '')}
								/><input
									class={'flex-1 ' + gi + ' py-1 text-sm'}
									style={gs}
									bind:value={q.options![oi]}
									placeholder={`Option ${oi + 1}`}
								/>
							</div>
						{/each}
						<div class="flex items-center gap-3">
							<button
								type="button"
								class="rounded-lg border px-2 py-1 text-xs"
								style="border-color: var(--app-glass-border);"
								onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button
							>
							<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);"
								><input
									type="checkbox"
									checked={q.randomize_options ?? false}
									onchange={(e) =>
										(q.randomize_options = (e.currentTarget as HTMLInputElement).checked)}
								/> Randomize options</label
							>
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
										q.correct = checked
											? Array.from(new Set([...current, option]))
											: current.filter((v) => v !== option);
									}}
								/><input
									class={'flex-1 ' + gi + ' py-1 text-sm'}
									style={gs}
									bind:value={q.options![oi]}
									placeholder={`Option ${oi + 1}`}
								/>
							</div>
						{/each}
						<div class="flex flex-wrap items-center gap-3">
							<button
								type="button"
								class="rounded-lg border px-2 py-1 text-xs"
								style="border-color: var(--app-glass-border);"
								onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button
							>
							<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);"
								><input
									type="checkbox"
									checked={q.randomize_options ?? false}
									onchange={(e) =>
										(q.randomize_options = (e.currentTarget as HTMLInputElement).checked)}
								/> Randomize options</label
							>
							<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);"
								>Max selections <input
									type="number"
									min="1"
									max={Math.max(1, (q.options ?? []).length)}
									class="w-20 rounded-lg border px-2 py-1 backdrop-blur-sm"
									style={gs}
									value={q.max_select ?? ''}
									oninput={(e) => {
										const raw = (e.currentTarget as HTMLInputElement).value.trim();
										q.max_select = raw
											? Math.max(1, Math.min(Number(raw) || 1, (q.options ?? []).length))
											: undefined;
									}}
								/></label
							>
						</div>
					{:else if q.type === 'tf'}
						<div class="flex gap-2">
							<button
								type="button"
								class="rounded-lg border px-3 py-1 text-xs transition"
								style={q.correct === 'true'
									? 'border-color: var(--app-accent);'
									: 'border-color: var(--app-glass-border);'}
								onclick={() => (q.correct = 'true')}>True</button
							>
							<button
								type="button"
								class="rounded-lg border px-3 py-1 text-xs transition"
								style={q.correct === 'false'
									? 'border-color: var(--app-accent);'
									: 'border-color: var(--app-glass-border);'}
								onclick={() => (q.correct = 'false')}>False</button
							>
						</div>
					{:else}
						<input
							class={'w-full ' + gi + ' text-sm'}
							style={gs}
							placeholder="Expected answer"
							value={typeof q.correct === 'string' ? q.correct : ''}
							oninput={(e) => (q.correct = (e.currentTarget as HTMLInputElement).value)}
						/>
						<div class="flex gap-4 text-xs" style="color: var(--app-text);">
							<label class="inline-flex items-center gap-2"
								><input
									type="checkbox"
									checked={q.short_ignore_case ?? true}
									onchange={(e) =>
										(q.short_ignore_case = (e.currentTarget as HTMLInputElement).checked)}
								/>Ignore capitalization</label
							>
							<label class="inline-flex items-center gap-2"
								><input
									type="checkbox"
									checked={q.short_ignore_punctuation ?? false}
									onchange={(e) =>
										(q.short_ignore_punctuation = (e.currentTarget as HTMLInputElement).checked)}
								/>Ignore punctuation</label
							>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<input type="hidden" name="questions_json" value={questionsJson} />
		<div class="flex gap-2">
			<Button variant="primary" type="submit">Save survey</Button>
			<button
				type="submit"
				formmethod="POST"
				formaction="?/deleteSurvey"
				class="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium"
				style="background: color-mix(in srgb, var(--app-danger) 85%, transparent); color: white; border: 1px solid color-mix(in srgb, var(--app-danger) 50%, transparent);"
				>Delete</button
			>
		</div>
	</form>

	<GlassCard>
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Responses</h2>
			<p class="text-xs" style="color: var(--app-text-muted);">{totalResponses} submission(s)</p>
		</div>

		<div class="mt-3 grid gap-3 md:grid-cols-3">
			<div
				class="rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="text-xs" style="color: var(--app-text-muted);">Total responses</p>
				<p class="text-xl font-semibold" style="color: var(--app-text);">{totalResponses}</p>
			</div>
			<div
				class="rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="text-xs" style="color: var(--app-text-muted);">Questions</p>
				<p class="text-xl font-semibold" style="color: var(--app-text);">
					{responseQuestions.length}
				</p>
			</div>
			<div
				class="rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="text-xs" style="color: var(--app-text-muted);">Avg completion</p>
				<p class="text-xl font-semibold" style="color: var(--app-text);">{avgCompletionRate}%</p>
			</div>
		</div>

		<div class="mt-3 flex flex-wrap gap-2">
			{#each [['summary', 'Summary'], ['question', 'Question view'], ['individual', 'Individual responses']] as [view, label]}
				<button
					type="button"
					class="rounded-lg border px-3 py-1.5 text-xs transition"
					style={responsesView === view
						? 'border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-text);'
						: 'border-color: var(--app-glass-border); color: var(--app-text);'}
					onclick={() => (responsesView = view as any)}>{label}</button
				>
			{/each}
		</div>

		{#if totalResponses === 0}
			<p class="mt-3 text-sm" style="color: var(--app-text-muted);">No responses yet.</p>
		{:else if responsesView === 'summary'}
			<div
				class="mt-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<p class="mb-2 text-sm font-semibold" style="color: var(--app-text);">Recent submissions</p>
				<div class="space-y-2">
					{#each submissions.slice(0, 10) as submission (submission.id)}
						<div
							class="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
							style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
						>
							<p style="color: var(--app-text);">
								{submission.profile?.full_name || submission.profile?.email || submission.user_id}
							</p>
							<p class="text-xs" style="color: var(--app-text-muted);">
								{new Date(submission.submitted_at).toLocaleString()}
							</p>
						</div>
					{/each}
				</div>
			</div>
		{:else if responsesView === 'question'}
			<div
				class="mt-3 space-y-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<label class="flex flex-col gap-1 text-sm">
					<span style="color: var(--app-text);">Question</span>
					<select class={gi + ' text-sm'} style={gs} bind:value={selectedQuestionId}>
						{#each responseQuestions as q, idx (q.id)}
							<option value={q.id}>Q{idx + 1}. {q.prompt || '(untitled question)'}</option>
						{/each}
					</select>
				</label>
				{#if selectedQuestion}
					<p class="text-sm" style="color: var(--app-text);">{selectedQuestion.prompt}</p>
					{#if selectedQuestion.type === 'short'}
						<div class="space-y-2">
							{#each questionSummaryRows as row, i (i)}
								<div
									class="rounded-lg border p-2 text-sm"
									style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent); color: var(--app-text);"
								>
									{row.label}
								</div>
							{/each}
						</div>
					{:else}
						<div class="space-y-2">
							{#each questionSummaryRows as row (row.label)}
								<div
									class="space-y-1 rounded-lg border p-2"
									style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
								>
									<div class="flex items-center justify-between text-sm">
										<p style="color: var(--app-text);">{row.label}</p>
										<p class="text-xs" style="color: var(--app-text-muted);">
											{row.count} ({row.percent}%)
										</p>
									</div>
									<ProgressBar value={row.percent} max={100} size="sm" />
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div
				class="mt-3 space-y-3 rounded-lg border p-3"
				style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
			>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<p class="text-sm font-semibold" style="color: var(--app-text);">
						Response {selectedResponseIndex + 1} of {totalResponses}
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="secondary"
							size="sm"
							onclick={() => (selectedResponseIndex = Math.max(0, selectedResponseIndex - 1))}
							disabled={selectedResponseIndex <= 0}>Previous</Button
						>
						<Button
							variant="secondary"
							size="sm"
							onclick={() =>
								(selectedResponseIndex = Math.min(totalResponses - 1, selectedResponseIndex + 1))}
							disabled={selectedResponseIndex >= totalResponses - 1}>Next</Button
						>
					</div>
				</div>
				{#if selectedSubmission}
					<div
						class="rounded-lg border p-3 text-sm"
						style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
					>
						<p class="font-medium" style="color: var(--app-text);">
							{selectedSubmission.profile?.full_name ||
								selectedSubmission.profile?.email ||
								selectedSubmission.user_id}
						</p>
						<p class="text-xs" style="color: var(--app-text-muted);">
							Submitted {new Date(selectedSubmission.submitted_at).toLocaleString()}
						</p>
					</div>
					<div class="space-y-2">
						{#each responseQuestions as q, idx (q.id)}
							<div
								class="rounded-lg border p-3"
								style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);"
							>
								<p class="text-xs" style="color: var(--app-text-muted);">Q{idx + 1}</p>
								<p class="text-sm font-medium" style="color: var(--app-text);">{q.prompt}</p>
								<p class="mt-1 text-sm" style="color: var(--app-text);">
									{answerDisplay((selectedSubmission.answers ?? {})[q.id])}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</GlassCard>
</section>
