<script lang="ts">
	import { TEMPLATE_QUESTIONS, WORKFLOW_META, type WorkflowKind } from '$lib/surveys/workflows';
	import Button from '$lib/components/ui/Button.svelte';

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

	const gi = "rounded-lg border px-2 py-2 backdrop-blur-sm";
	const gs = "background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);";
</script>

<section class="space-y-4">
	<div>
		<a href="/mentor/surveys" class="text-xs" style="color: var(--app-text-muted);">← Surveys</a>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">New Survey</h1>
	</div>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{/if}
	<form method="POST" action="?/createSurvey" class="space-y-3 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		{#if (data.templates ?? []).length > 0}
			<div class="rounded-lg border p-3 text-xs" style="border-color: var(--app-glass-border); background: var(--app-surface-alt); color: var(--app-text);">
				{data.templates.length} saved template{data.templates.length === 1 ? '' : 's'} available for future expansion.
			</div>
		{/if}
		<div class="space-y-2 rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<p class="text-sm font-semibold" style="color: var(--app-text);">Workflow template</p>
			<div class="grid gap-2 md:grid-cols-3">
				{#each Object.entries(WORKFLOW_META) as [kind, meta]}
					<button
						type="button"
						class="rounded-lg border px-3 py-2 text-left text-xs transition"
						style={workflowKind === kind ? 'border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-text);' : 'border-color: var(--app-glass-border); color: var(--app-text);'}
						onclick={() => applyTemplate(kind as WorkflowKind)}
					>
						<p class="font-semibold">{meta.label}</p>
						<p class="mt-1" style="color: var(--app-text-muted);">{meta.description}</p>
					</button>
				{/each}
				<button
					type="button"
					class="rounded-lg border px-3 py-2 text-left text-xs transition"
					style={workflowKind === 'custom' ? 'border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-text);' : 'border-color: var(--app-glass-border); color: var(--app-text);'}
					onclick={() => (workflowKind = 'custom')}
				>
					<p class="font-semibold">Custom</p>
					<p class="mt-1" style="color: var(--app-text-muted);">Build your own question flow.</p>
				</button>
			</div>
		</div>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Title</span>
			<input class={gi} style={gs} name="title" required />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Slug</span>
			<input class={gi} style={gs} name="slug" placeholder="leadership-application" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Description</span>
			<textarea class={gi} style={gs} rows="3" name="description"></textarea>
		</label>
		<label class="flex flex-col gap-1 text-sm md:max-w-xs">
			<span style="color: var(--app-text);">Max submissions per student</span>
			<input type="number" min="1" class={gi} style={gs} name="max_submissions" value="1" required />
		</label>
		<div class="grid gap-2 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm">
				<span style="color: var(--app-text);">Visible from (optional)</span>
				<input type="datetime-local" class={gi} style={gs} name="visible_from" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span style="color: var(--app-text);">Visible until (optional)</span>
				<input type="datetime-local" class={gi} style={gs} name="visible_until" />
			</label>
		</div>
		<div class="flex flex-wrap gap-4 text-sm" style="color: var(--app-text);">
			<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked /> Active</label>
			<label class="inline-flex items-center gap-2"><input type="checkbox" name="show_when_inactive" /> Show to users when inactive</label>
			<label class="inline-flex items-center gap-2"><input type="checkbox" name="allow_student_view_submissions" checked /> Allow students to view submissions</label>
			<label class="inline-flex items-center gap-2"><input type="checkbox" name="allow_student_edits" /> Allow student edits</label>
		</div>
		<label class="flex flex-col gap-1 text-sm md:max-w-sm">
			<span style="color: var(--app-text);">Student edit deadline (optional)</span>
			<input type="datetime-local" class={gi} style={gs} name="student_edit_deadline" />
		</label>
		<div>
			<p class="mb-1 text-sm" style="color: var(--app-text);">Module prerequisites</p>
			<div class="grid max-h-52 gap-1 overflow-auto rounded-lg border p-2" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
				{#each data.nodes as node (node.id)}
					<label class="inline-flex items-center gap-2 text-sm" style="color: var(--app-text);">
						<input type="checkbox" name="prereq_node_ids" value={node.id} />
						{node.title}
					</label>
				{/each}
			</div>
		</div>
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold" style="color: var(--app-text);">Questions</p>
				<Button variant="secondary" size="sm" onclick={addQuestion}>+ Add question</Button>
			</div>
			{#each questions as q, idx (q.id)}
				<div class="space-y-2 rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
					<div class="flex items-center justify-between">
						<p class="text-xs" style="color: var(--app-text-muted);">Q{idx + 1}</p>
						<button type="button" class="text-xs" style="color: var(--app-danger);" onclick={() => removeQuestion(idx)}>Remove</button>
					</div>
					<input class={"w-full " + gi + " text-sm"} style={gs} placeholder="Prompt" bind:value={q.prompt} />
					<select class={gi + " text-sm"} style={gs} bind:value={q.type} onchange={() => onTypeChange(q)}>
						<option value="mc">Multiple choice</option>
						<option value="ms">Multiple select</option>
						<option value="tf">True / False</option>
						<option value="short">Short answer</option>
					</select>
					{#if q.type === 'mc'}
						{#each q.options ?? [] as _o, oi (oi)}
							<div class="flex items-center gap-2">
								<input type="radio" name={`mc-${idx}`} checked={q.correct === q.options?.[oi]} onchange={() => (q.correct = q.options?.[oi] ?? '')} />
								<input class={"flex-1 " + gi + " py-1 text-sm"} style={gs} bind:value={q.options![oi]} placeholder={`Option ${oi + 1}`} />
							</div>
						{/each}
						<div class="flex items-center gap-3">
							<button type="button" class="rounded-lg border px-2 py-1 text-xs" style="border-color: var(--app-glass-border);" onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button>
							<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);">
								<input type="checkbox" checked={q.randomize_options ?? false} onchange={(e) => (q.randomize_options = (e.currentTarget as HTMLInputElement).checked)} /> Randomize options
							</label>
						</div>
					{:else if q.type === 'ms'}
						{#each q.options ?? [] as _o, oi (oi)}
							<div class="flex items-center gap-2">
								<input type="checkbox" checked={Array.isArray(q.correct) && q.correct.includes(q.options![oi])} onchange={(e) => { const checked = (e.currentTarget as HTMLInputElement).checked; const current = Array.isArray(q.correct) ? q.correct : []; const option = q.options![oi]; q.correct = checked ? Array.from(new Set([...current, option])) : current.filter((v) => v !== option); }} />
								<input class={"flex-1 " + gi + " py-1 text-sm"} style={gs} bind:value={q.options![oi]} placeholder={`Option ${oi + 1}`} />
							</div>
						{/each}
						<div class="flex flex-wrap items-center gap-3">
							<button type="button" class="rounded-lg border px-2 py-1 text-xs" style="border-color: var(--app-glass-border);" onclick={() => (q.options = [...(q.options ?? []), ''])}>+ Option</button>
							<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);"><input type="checkbox" checked={q.randomize_options ?? false} onchange={(e) => (q.randomize_options = (e.currentTarget as HTMLInputElement).checked)} /> Randomize options</label>
							<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);">Max selections <input type="number" min="1" max={Math.max(1, (q.options ?? []).length)} class="w-20 rounded-lg border px-2 py-1 backdrop-blur-sm" style={gs} value={q.max_select ?? ''} oninput={(e) => { const raw = (e.currentTarget as HTMLInputElement).value.trim(); q.max_select = raw ? Math.max(1, Math.min(Number(raw) || 1, (q.options ?? []).length)) : undefined; }} /></label>
						</div>
					{:else if q.type === 'tf'}
						<div class="flex gap-2">
							<button type="button" class="rounded-lg border px-3 py-1 text-xs transition" style={q.correct === 'true' ? 'border-color: var(--app-accent);' : 'border-color: var(--app-glass-border);'} onclick={() => (q.correct = 'true')}>True</button>
							<button type="button" class="rounded-lg border px-3 py-1 text-xs transition" style={q.correct === 'false' ? 'border-color: var(--app-accent);' : 'border-color: var(--app-glass-border);'} onclick={() => (q.correct = 'false')}>False</button>
						</div>
					{:else}
						<input class={"w-full " + gi + " text-sm"} style={gs} placeholder="Expected answer" value={typeof q.correct === 'string' ? q.correct : ''} oninput={(e) => (q.correct = (e.currentTarget as HTMLInputElement).value)} />
						<div class="flex gap-4 text-xs" style="color: var(--app-text);">
							<label class="inline-flex items-center gap-2"><input type="checkbox" checked={q.short_ignore_case ?? true} onchange={(e) => (q.short_ignore_case = (e.currentTarget as HTMLInputElement).checked)} />Ignore capitalization</label>
							<label class="inline-flex items-center gap-2"><input type="checkbox" checked={q.short_ignore_punctuation ?? false} onchange={(e) => (q.short_ignore_punctuation = (e.currentTarget as HTMLInputElement).checked)} />Ignore punctuation</label>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<input type="hidden" name="questions_json" value={questionsJson} />
		<input type="hidden" name="workflow_kind" value={workflowKind} />
		<div class="space-y-2 rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
			<label class="inline-flex items-center gap-2 text-sm" style="color: var(--app-text);">
				<input type="checkbox" name="save_as_template" bind:checked={saveAsTemplate} /> Save this as a template
			</label>
			{#if saveAsTemplate}
				<input class={"w-full " + gi + " text-sm"} style={gs} name="template_name" placeholder="Template name" required />
			{/if}
		</div>
		<Button variant="primary" type="submit">Create survey</Button>
	</form>
</section>
