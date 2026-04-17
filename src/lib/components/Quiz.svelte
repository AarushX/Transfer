<script lang="ts">
	import { enhance } from '$app/forms';
	let { questions, nodeId }: { questions: any[]; nodeId: string } = $props();
	let submitMessage = $state('');
</script>

<form
	method="POST"
	action="/api/quiz/grade"
	use:enhance={({ formData }) => {
		formData.set('nodeId', nodeId);
		return async ({ result }) => {
			if (result.type === 'success') submitMessage = 'Quiz submitted.';
			if (result.type === 'failure') submitMessage = 'Could not grade quiz.';
		};
	}}
	class="space-y-4"
>
	<input type="hidden" name="nodeId" value={nodeId} />
	{#each questions as question}
		<div class="rounded border border-slate-700 p-3">
			<p class="mb-2 font-medium">{question.prompt}</p>
			{#if question.type === 'mc'}
				{#each question.options ?? [] as option}
					<label class="mb-1 flex gap-2">
						<input type="radio" name={question.id} value={option} required />
						<span>{option}</span>
					</label>
				{/each}
			{:else if question.type === 'tf'}
				<label class="mr-3"
					><input type="radio" name={question.id} value="true" required /> True</label
				>
				<label><input type="radio" name={question.id} value="false" required /> False</label>
			{:else}
				<input class="w-full rounded bg-slate-800 px-2 py-1" name={question.id} required />
			{/if}
		</div>
	{/each}
	<button class="rounded bg-yellow-400 px-4 py-2 font-semibold text-slate-900" type="submit"
		>Submit quiz</button
	>
	{#if submitMessage}<p class="text-sm text-slate-300">{submitMessage}</p>{/if}
</form>
