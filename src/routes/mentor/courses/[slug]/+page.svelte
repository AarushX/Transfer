<script lang="ts">
	type Question = {
		id: string;
		prompt: string;
		type: 'mc' | 'tf' | 'short';
		options?: string[];
		correct: string;
	};

	let { data, form } = $props();

	let questions = $state<Question[]>(
		Array.isArray(data.assessment?.questions) ? (data.assessment.questions as Question[]) : []
	);
	const questionsJson = $derived(JSON.stringify(questions));

	let prereqFilter = $state('');
	const filteredNodes = $derived.by(() => {
		const needle = prereqFilter.trim().toLowerCase();
		if (!needle) return data.allNodes;
		return data.allNodes.filter((n: { title: string; slug: string }) =>
			(n.title + ' ' + n.slug).toLowerCase().includes(needle)
		);
	});

	function nextQuestionId(): string {
		const used = new Set(questions.map((q) => q.id));
		let i = questions.length + 1;
		while (used.has(`q${i}`)) i += 1;
		return `q${i}`;
	}

	function addQuestion() {
		questions.push({
			id: nextQuestionId(),
			prompt: '',
			type: 'mc',
			options: ['', ''],
			correct: ''
		});
	}

	function removeQuestion(i: number) {
		questions.splice(i, 1);
	}

	function ensureOptions(q: Question) {
		if (!Array.isArray(q.options)) q.options = ['', ''];
	}

	function addOption(i: number) {
		const q = questions[i];
		ensureOptions(q);
		q.options = [...(q.options ?? []), ''];
	}

	function removeOption(i: number, oi: number) {
		const q = questions[i];
		const removed = (q.options ?? [])[oi];
		q.options = (q.options ?? []).filter((_, idx) => idx !== oi);
		if (q.correct && removed !== undefined && q.correct === removed) q.correct = '';
	}

	function onTypeChange(q: Question) {
		if (q.type === 'mc') {
			if (!Array.isArray(q.options) || q.options.length < 2) q.options = ['', ''];
			if (!q.options.includes(q.correct)) q.correct = '';
		} else if (q.type === 'tf') {
			q.options = undefined;
			if (q.correct !== 'true' && q.correct !== 'false') q.correct = 'true';
		} else {
			q.options = undefined;
		}
	}

	function warningFor(q: Question): string | null {
		if (!q.prompt.trim()) return 'Prompt is empty.';
		if (q.type === 'mc') {
			const opts = (q.options ?? []).map((o) => o.trim());
			if (opts.filter(Boolean).length < 2) return 'Add at least two non-empty options.';
			if (!q.correct) return 'Pick the correct option.';
			if (!opts.includes(q.correct)) return 'Correct answer must match one of the options.';
		} else if (q.type === 'tf') {
			if (q.correct !== 'true' && q.correct !== 'false') return 'Select True or False as the answer.';
		} else {
			if (!q.correct.trim()) return 'Short answer needs an expected answer.';
		}
		return null;
	}

	function handleDeleteSubmit(event: SubmitEvent) {
		const ok = confirm(
			'Delete this course? Student progress, the quiz, and prerequisites pointing to it will be removed. This cannot be undone.'
		);
		if (!ok) event.preventDefault();
	}

	const message = $derived.by(() => {
		if (form?.error) return { tone: 'error' as const, text: form.error };
		if (form?.ok) return { tone: 'ok' as const, text: 'Saved.' };
		return null;
	});
</script>

<section class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<a href="/mentor/courses" class="text-xs text-slate-400">← All courses</a>
			<h1 class="text-2xl font-semibold">{data.node.title}</h1>
			<p class="text-xs text-slate-400">
				<code class="rounded bg-slate-800 px-1 py-0.5">{data.node.slug}</code>
			</p>
		</div>
		<div class="flex items-center gap-2">
			<a
				href={`/learn/${data.node.slug}`}
				class="rounded border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
				>Preview as student</a
			>
			<form method="POST" action="?/deleteNode" onsubmit={handleDeleteSubmit}>
				<button
					type="submit"
					class="rounded border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-200 hover:bg-red-900/60"
				>
					Delete
				</button>
			</form>
		</div>
	</div>

	{#if message}
		<div
			class="rounded border p-3 text-sm {message.tone === 'error'
				? 'border-red-700 bg-red-900/30 text-red-200'
				: 'border-emerald-700 bg-emerald-900/30 text-emerald-200'}"
		>
			{message.text}
		</div>
	{/if}

	<form
		method="POST"
		action="?/updateNode"
		class="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-2"
	>
		<h2 class="text-lg font-semibold md:col-span-2">Details</h2>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span class="text-slate-300">Title</span>
			<input
				class="rounded bg-slate-800 px-2 py-2"
				name="title"
				value={data.node.title}
				required
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Slug</span>
			<input class="rounded bg-slate-800 px-2 py-2" name="slug" value={data.node.slug} required />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Subteam</span>
			<select class="rounded bg-slate-800 px-2 py-2" name="subteam_id" required>
				{#each data.subteams as team}
					<option value={team.id} selected={team.id === data.node.subteam_id}>{team.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span class="text-slate-300">Video URL</span>
			<input
				class="rounded bg-slate-800 px-2 py-2"
				name="video_url"
				value={data.node.video_url ?? ''}
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Tier</span>
			<input
				class="rounded bg-slate-800 px-2 py-2"
				name="tier"
				type="number"
				min="1"
				value={data.node.tier}
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Order</span>
			<input
				class="rounded bg-slate-800 px-2 py-2"
				name="ordering"
				type="number"
				min="0"
				value={data.node.ordering}
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span class="text-slate-300">Physical task (Do step)</span>
			<input
				class="rounded bg-slate-800 px-2 py-2"
				name="physical_task"
				value={data.node.physical_task ?? ''}
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm md:col-span-2">
			<span class="text-slate-300">Description</span>
			<textarea class="rounded bg-slate-800 px-2 py-2" name="description" rows="3"
				>{data.node.description ?? ''}</textarea
			>
		</label>
		<div class="flex justify-end md:col-span-2">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900"
				>Save details</button
			>
		</div>
	</form>

	<form
		method="POST"
		action="?/saveAssessment"
		class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h2 class="text-lg font-semibold">Quiz</h2>
				<p class="text-xs text-slate-400">
					Author the "Say" assessment. Students must score at or above the passing score.
				</p>
			</div>
			<button
				type="button"
				onclick={addQuestion}
				class="rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600">+ Add question</button
			>
		</div>
		<label class="flex max-w-xs flex-col gap-1 text-sm">
			<span class="text-slate-300">Passing score (%)</span>
			<input
				class="rounded bg-slate-800 px-2 py-2"
				name="passing_score"
				type="number"
				min="1"
				max="100"
				value={data.assessment.passing_score}
			/>
		</label>
		<div class="grid gap-2 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">Min seconds between attempts</span>
				<input
					class="rounded bg-slate-800 px-2 py-2"
					name="min_seconds_between_attempts"
					type="number"
					min="0"
					max="3600"
					value={data.assessment.min_seconds_between_attempts ?? 15}
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">Failed-attempt window (minutes)</span>
				<input
					class="rounded bg-slate-800 px-2 py-2"
					name="fail_window_minutes"
					type="number"
					min="1"
					max="1440"
					value={data.assessment.fail_window_minutes ?? 10}
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">Max failed attempts in window</span>
				<input
					class="rounded bg-slate-800 px-2 py-2"
					name="max_failed_in_window"
					type="number"
					min="1"
					max="200"
					value={data.assessment.max_failed_in_window ?? 5}
				/>
			</label>
			<div class="rounded border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-400">
				Helps prevent rapid guessing while still allowing legitimate retries.
			</div>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">Short answer min characters</span>
				<input
					class="rounded bg-slate-800 px-2 py-2"
					name="short_answer_min_chars"
					type="number"
					min="0"
					max="5000"
					value={data.assessment.short_answer_min_chars ?? 3}
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">Short answer max characters</span>
				<input
					class="rounded bg-slate-800 px-2 py-2"
					name="short_answer_max_chars"
					type="number"
					min="1"
					max="5000"
					value={data.assessment.short_answer_max_chars ?? 300}
				/>
			</label>
		</div>
		<input type="hidden" name="questions" value={questionsJson} />
		<div class="space-y-3">
			{#each questions as q, i (i)}
				{@const warn = warningFor(q)}
				<div class="space-y-3 rounded border border-slate-800 bg-slate-950/60 p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-semibold text-slate-200">Question {i + 1}</span>
						<button
							type="button"
							onclick={() => removeQuestion(i)}
							class="text-xs text-red-300 hover:text-red-200">Remove</button
						>
					</div>
					<label class="flex flex-col gap-1 text-xs text-slate-400">
						<span>Prompt</span>
						<input
							class="w-full rounded bg-slate-800 px-2 py-2 text-sm text-slate-100"
							placeholder="What do you want to ask?"
							bind:value={q.prompt}
						/>
					</label>
					<label class="flex flex-col gap-1 text-xs text-slate-400 md:w-1/2">
						<span>Question type</span>
						<select
							class="rounded bg-slate-800 px-2 py-2 text-sm text-slate-100"
							bind:value={q.type}
							onchange={() => onTypeChange(q)}
						>
							<option value="mc">Multiple choice</option>
							<option value="tf">True / False</option>
							<option value="short">Short answer</option>
						</select>
					</label>

					{#if q.type === 'mc'}
						<div class="space-y-2">
							<p class="text-xs text-slate-400">Options</p>
							<div class="space-y-1">
								{#each q.options ?? [] as _opt, oi (oi)}
									<div class="flex items-center gap-2">
										<input
											type="radio"
											name={`correct-${i}`}
											class="accent-yellow-400"
											checked={q.correct !== '' && q.correct === q.options![oi]}
											onchange={() => (q.correct = q.options![oi])}
											title="Mark as correct answer"
										/>
										<input
											class="flex-1 rounded bg-slate-800 px-2 py-1 text-sm"
											placeholder={`Option ${oi + 1}`}
											bind:value={q.options![oi]}
											oninput={() => {
												if (q.correct && !q.options!.includes(q.correct)) q.correct = '';
											}}
										/>
										<button
											type="button"
											onclick={() => removeOption(i, oi)}
											class="px-2 text-xs text-slate-400 hover:text-slate-200"
											aria-label="Remove option">×</button
										>
									</div>
								{/each}
							</div>
							<button
								type="button"
								onclick={() => addOption(i)}
								class="text-xs text-slate-300 hover:text-slate-100">+ Add option</button
							>
							<p class="text-[11px] text-slate-500">
								The radio marks which option is correct. Click any radio to set or change it.
							</p>
						</div>
					{:else if q.type === 'tf'}
						<div class="flex flex-col gap-1 text-xs text-slate-400">
							<span>Correct answer</span>
							<div class="inline-flex overflow-hidden rounded border border-slate-700">
								<button
									type="button"
									class={`px-4 py-2 text-sm ${q.correct === 'true' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
									onclick={() => (q.correct = 'true')}>True</button
								>
								<button
									type="button"
									class={`px-4 py-2 text-sm ${q.correct === 'false' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
									onclick={() => (q.correct = 'false')}>False</button
								>
							</div>
						</div>
					{:else}
						<label class="flex flex-col gap-1 text-xs text-slate-400">
							<span>Expected answer</span>
							<input
								class="rounded bg-slate-800 px-2 py-2 text-sm text-slate-100"
								placeholder="e.g. reduce heat"
								bind:value={q.correct}
							/>
							<span class="text-[11px] text-slate-500"
								>Matched against the student's answer with case-insensitive exact match.</span
							>
						</label>
					{/if}

					{#if warn}
						<p class="rounded border border-amber-700/50 bg-amber-900/20 px-2 py-1 text-xs text-amber-200">
							{warn}
						</p>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-slate-400">No questions yet. Click "Add question" to start.</p>
			{/each}
		</div>
		<div class="flex justify-end">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900"
				>Save quiz</button
			>
		</div>
	</form>

	<form
		method="POST"
		action="?/savePrereqs"
		class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
	>
		<div>
			<h2 class="text-lg font-semibold">Prerequisites</h2>
			<p class="text-xs text-slate-400">
				Select courses that students must complete before starting this one.
			</p>
		</div>
		<input
			bind:value={prereqFilter}
			placeholder="Filter by title or slug..."
			class="w-full rounded bg-slate-800 px-2 py-2 text-sm"
		/>
		<div class="grid max-h-80 gap-1 overflow-y-auto md:grid-cols-2">
			{#each filteredNodes as n (n.id)}
				<label
					class="flex items-center gap-2 rounded border border-slate-800 px-2 py-1 text-sm hover:bg-slate-800/50"
				>
					<input
						type="checkbox"
						name="prereq_ids"
						value={n.id}
						checked={data.prereqIds.includes(n.id)}
					/>
					<span class="truncate">{n.title}</span>
					<span class="ml-auto text-xs text-slate-500">T{n.tier}</span>
				</label>
			{:else}
				<p class="text-sm text-slate-400">No matching courses.</p>
			{/each}
		</div>
		<div class="flex justify-end">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900"
				>Save prerequisites</button
			>
		</div>
	</form>
</section>
