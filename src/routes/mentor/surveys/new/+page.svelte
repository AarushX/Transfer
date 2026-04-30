<script lang="ts">
	import { TEMPLATE_QUESTIONS, WORKFLOW_META, type WorkflowKind } from '$lib/surveys/workflows';

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
	let questions = $state<SurveyQuestion[]>([
		{ id: 'q1', prompt: '', type: 'short', correct: '', short_ignore_case: true, short_ignore_punctuation: false }
	]);
	let workflowKind = $state<WorkflowKind>('leadership');
	let saveAsTemplate = $state(false);
	const questionsJson = $derived(JSON.stringify(questions));
	const applyTemplate = (kind: WorkflowKind) => {
		workflowKind = kind;
		if (kind === 'custom') return;
		const template = TEMPLATE_QUESTIONS[kind].map((q) => ({ ...q }));
		questions = template;
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
</script>

<section class="space-y-4">
	<div>
		<a href="/mentor/surveys" class="text-xs text-slate-400">← Surveys</a>
		<h1 class="text-2xl font-semibold">New Survey</h1>
	</div>
	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}
	<form method="POST" action="?/createSurvey" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		{#if (data.templates ?? []).length > 0}
			<div class="rounded border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
				{data.templates.length} saved template{data.templates.length === 1 ? '' : 's'} available for future expansion.
			</div>
		{/if}
		<div class="space-y-2 rounded border border-slate-800 bg-slate-950/60 p-3">
			<p class="text-sm font-semibold">Workflow template</p>
			<div class="grid gap-2 md:grid-cols-3">
				{#each Object.entries(WORKFLOW_META) as [kind, meta]}
					<button
						type="button"
						class={`rounded border px-3 py-2 text-left text-xs ${workflowKind === kind ? 'border-yellow-400 bg-yellow-900/20 text-yellow-100' : 'border-slate-700 text-slate-200'}`}
						onclick={() => applyTemplate(kind as WorkflowKind)}
					>
						<p class="font-semibold">{meta.label}</p>
						<p class="mt-1 text-slate-400">{meta.description}</p>
					</button>
				{/each}
				<button
					type="button"
					class={`rounded border px-3 py-2 text-left text-xs ${workflowKind === 'custom' ? 'border-yellow-400 bg-yellow-900/20 text-yellow-100' : 'border-slate-700 text-slate-200'}`}
					onclick={() => (workflowKind = 'custom')}
				>
					<p class="font-semibold">Custom</p>
					<p class="mt-1 text-slate-400">Build your own question flow.</p>
				</button>
			</div>
		</div>
		<label class="flex flex-col gap-1 text-sm">
			<span>Title</span>
			<input class="rounded bg-slate-800 px-2 py-2" name="title" required />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Slug</span>
			<input class="rounded bg-slate-800 px-2 py-2" name="slug" placeholder="leadership-application" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span>Description</span>
			<textarea class="rounded bg-slate-800 px-2 py-2" rows="3" name="description"></textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm md:max-w-xs">
			<span>Max submissions per student</span>
			<input type="number" min="1" class="rounded bg-slate-800 px-2 py-2" name="max_submissions" value="1" required />
		</label>
		<div class="grid gap-2 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm">
				<span>Visible from (optional)</span>
				<input type="datetime-local" class="rounded bg-slate-800 px-2 py-2" name="visible_from" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span>Visible until (optional)</span>
				<input type="datetime-local" class="rounded bg-slate-800 px-2 py-2" name="visible_until" />
			</label>
		</div>
		<div class="flex flex-wrap gap-4 text-sm">
			<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked /> Active</label>
			<label class="inline-flex items-center gap-2">
				<input type="checkbox" name="show_when_inactive" />
				Show to users when inactive
			</label>
			<label class="inline-flex items-center gap-2">
				<input type="checkbox" name="allow_student_view_submissions" checked />
				Allow students to view submissions
			</label>
			<label class="inline-flex items-center gap-2">
				<input type="checkbox" name="allow_student_edits" />
				Allow student edits
			</label>
		</div>
		<label class="flex flex-col gap-1 text-sm md:max-w-sm">
			<span>Student edit deadline (optional)</span>
			<input type="datetime-local" class="rounded bg-slate-800 px-2 py-2" name="student_edit_deadline" />
		</label>
		<div>
			<p class="mb-1 text-sm">Module prerequisites</p>
			<div class="grid max-h-52 gap-1 overflow-auto rounded border border-slate-800 bg-slate-950 p-2">
				{#each data.nodes as node (node.id)}
					<label class="inline-flex items-center gap-2 text-sm">
						<input type="checkbox" name="prereq_node_ids" value={node.id} />
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
		<input type="hidden" name="workflow_kind" value={workflowKind} />
		<div class="space-y-2 rounded border border-slate-800 bg-slate-950/60 p-3">
			<label class="inline-flex items-center gap-2 text-sm">
				<input type="checkbox" name="save_as_template" bind:checked={saveAsTemplate} />
				Save this as a template
			</label>
			{#if saveAsTemplate}
				<input
					class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
					name="template_name"
					placeholder="Template name"
					required
				/>
			{/if}
		</div>
		<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Create survey</button>
	</form>
</section>
