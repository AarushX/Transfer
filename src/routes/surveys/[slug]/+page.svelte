<script lang="ts">
	import { WORKFLOW_META } from '$lib/surveys/workflows';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();

	type AnswerValue = string | string[];
	let answers = $state<Record<string, AnswerValue>>(
		(data.submission?.answers as Record<string, AnswerValue> | undefined) ?? {}
	);

	function updateMs(questionId: string, value: string, checked: boolean) {
		const current = Array.isArray(answers[questionId]) ? (answers[questionId] as string[]) : [];
		answers[questionId] = checked
			? Array.from(new Set([...current, value]))
			: current.filter((v) => v !== value);
	}
	const maxSelectFor = (question: any): number | null => {
		const raw = Number(question?.max_select);
		return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : null;
	};
	const optionDisabled = (question: any, option: string) => {
		const max = maxSelectFor(question);
		if (max == null) return false;
		const selected = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
		if (selected.includes(option)) return false;
		return selected.length >= max;
	};
</script>

<section class="space-y-4">
	<div>
		<a href="/surveys" class="text-xs" style="color: var(--app-text-muted);">← Applications & Signups</a>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">{data.survey.title}</h1>
		<p class="text-xs" style="color: var(--app-text-muted);">
			{data.workflowKind === 'custom' ? 'Custom workflow' : WORKFLOW_META[data.workflowKind]?.label}
		</p>
		{#if data.survey.description}
			<p class="text-sm" style="color: var(--app-text-muted);">{data.survey.description}</p>
		{/if}
	</div>

	{#if data.submissionBlocked}
		<div class="rounded-xl border p-4 text-sm" style="border-color: color-mix(in srgb, var(--app-warning) 50%, transparent); background: color-mix(in srgb, var(--app-warning) 12%, transparent); color: color-mix(in srgb, var(--app-warning) 80%, white);">
			<p class="font-semibold">Submission limit reached</p>
			<p class="mt-1 text-xs" style="opacity: 0.85;">
				This survey allows {data.maxSubmissions} submission{data.maxSubmissions === 1 ? '' : 's'}.
				Contact a mentor if you need another attempt.
			</p>
		</div>
	{/if}
	{#if data.editAllowed && data.submission}
		<div class="rounded border p-3 text-xs" style="border-color: color-mix(in srgb, var(--app-info) 50%, transparent); background: color-mix(in srgb, var(--app-info) 12%, transparent); color: color-mix(in srgb, var(--app-info) 80%, white);">
			Editing is enabled for this application. Re-submitting updates your latest submission.
		</div>
	{/if}

	{#if form?.error}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-danger) 60%, transparent); background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border p-2 text-sm" style="border-color: color-mix(in srgb, var(--app-success) 60%, transparent); background: color-mix(in srgb, var(--app-success) 15%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">
			Survey submitted.
		</p>
	{/if}

	{#if data.prereqs.length > 0}
		<div class="rounded border p-3 text-sm backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			<p class="mb-1 font-semibold" style="color: var(--app-text);">Prerequisite modules</p>
			<ul class="space-y-1">
				{#each data.prereqs as row}
					<li class="flex items-center justify-between gap-2">
						<a class="underline" href={`/learn/${row.slug}`} style="color: var(--app-link);">{row.title}</a>
						<span
							class={`rounded px-2 py-0.5 text-xs ${row.completed ? 'bg-emerald-900/30 text-emerald-200' : 'bg-amber-900/30 text-amber-200'}`}
						>
							{row.completed ? 'Completed' : 'Required'}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if data.missingPrereqs.length > 0}
		<div class="rounded border p-3 text-sm" style="border-color: color-mix(in srgb, var(--app-warning) 50%, transparent); background: color-mix(in srgb, var(--app-warning) 15%, transparent);">
			<p class="font-semibold" style="color: color-mix(in srgb, var(--app-warning) 80%, white);">Complete prerequisites first</p>
			<ul class="mt-1 list-disc pl-5" style="color: color-mix(in srgb, var(--app-warning) 70%, white);">
				{#each data.missingPrereqs as row}
					<li><a class="underline" href={`/learn/${row.slug}`}>{row.title}</a></li>
				{/each}
			</ul>
		</div>
	{:else if !data.submissionBlocked}
		<form
			method="POST"
			action="?/submitSurvey"
			class="space-y-3 rounded-xl border p-4 backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			{#each data.survey.questions ?? [] as question, idx (question.id ?? idx)}
				<fieldset class="space-y-2 rounded border p-3" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<legend class="px-1 text-xs" style="color: var(--app-text-muted);">Question {idx + 1}</legend>
					<p class="font-medium" style="color: var(--app-text);">{question.prompt}</p>
					{#if question.type === 'mc'}
						<div class="space-y-1">
							{#each question.options ?? [] as option, oi (oi)}
								<label class="flex items-center gap-2 text-sm">
									<input
										type="radio"
										name={question.id}
										value={option}
										checked={answers[question.id] === option}
										onchange={() => (answers[question.id] = option)}
										required
									/>
									{option}
								</label>
							{/each}
						</div>
					{:else if question.type === 'ms'}
						<div class="space-y-1">
							{#each question.options ?? [] as option, oi (oi)}
								<label class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										checked={Array.isArray(answers[question.id]) &&
											(answers[question.id] as string[]).includes(option)}
										disabled={optionDisabled(question, option)}
										onchange={(e) =>
											updateMs(question.id, option, (e.currentTarget as HTMLInputElement).checked)}
									/>
									{option}
								</label>
							{/each}
							{#if maxSelectFor(question) != null}
								<p class="text-xs" style="color: var(--app-text-muted);">
									Select up to {maxSelectFor(question)} option{maxSelectFor(question) === 1
										? ''
										: 's'}.
								</p>
							{/if}
							<input
								type="hidden"
								name={question.id}
								value={JSON.stringify(
									Array.isArray(answers[question.id]) ? answers[question.id] : []
								)}
							/>
						</div>
					{:else if question.type === 'tf'}
						<div class="flex gap-3">
							{#each ['true', 'false'] as value}
								<label class="inline-flex items-center gap-1 text-sm">
									<input
										type="radio"
										name={question.id}
										{value}
										checked={answers[question.id] === value}
										onchange={() => (answers[question.id] = value)}
										required
									/>
									{value === 'true' ? 'True' : 'False'}
								</label>
							{/each}
						</div>
					{:else}
						<input
							name={question.id}
							class="w-full rounded px-2 py-2"
							style="background: var(--app-input-bg); color: var(--app-input-text); border: 1px solid var(--app-glass-border);"
							value={typeof answers[question.id] === 'string'
								? (answers[question.id] as string)
								: ''}
							oninput={(e) => (answers[question.id] = (e.currentTarget as HTMLInputElement).value)}
							required
						/>
					{/if}
				</fieldset>
			{/each}
			<Button variant="primary" type="submit">
				{data.workflowKind === 'carpool'
					? 'Submit availability'
					: data.workflowKind === 'leadership'
						? 'Submit application'
						: 'Submit form'}
			</Button>
		</form>
	{/if}
	{#if data.showSubmissions && (data.submissions ?? []).length > 0}
		<div class="space-y-2 rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<div class="flex items-center justify-between">
				<p class="text-sm font-semibold" style="color: var(--app-text);">Your submissions</p>
				<p class="text-xs" style="color: var(--app-text-muted);">{data.submissions.length} total</p>
			</div>
			{#each data.submissions as submission, idx (submission.id ?? idx)}
				<div class="rounded border p-3" style="background: var(--app-surface-alt); border-color: var(--app-glass-border);">
					<p class="text-xs" style="color: var(--app-text-muted);">{new Date(submission.submitted_at).toLocaleString()}</p>
				</div>
			{/each}
		</div>
	{/if}
</section>
