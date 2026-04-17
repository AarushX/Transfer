<script lang="ts">
	let { item, onApprove, onReview } = $props();

	let busy = $state<'' | 'approve' | 'review'>('');
	let notes = $state('');

	async function approve() {
		if (busy) return;
		busy = 'approve';
		try {
			await onApprove(item, notes.trim());
		} finally {
			busy = '';
		}
	}

	async function review() {
		if (busy) return;
		const ok = confirm(
			`Send back to quiz_pending for ${item.profile?.full_name || item.profile?.email}?`
		);
		if (!ok) return;
		busy = 'review';
		try {
			await onReview(item, notes.trim());
		} finally {
			busy = '';
		}
	}
</script>

<article class="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="font-semibold">{item.profile?.full_name || item.profile?.email}</p>
			<p class="text-xs text-slate-400">{item.profile?.email}</p>
		</div>
		<span class="rounded-full bg-sky-900/40 px-2 py-0.5 text-xs text-sky-200">awaiting</span>
	</div>
	<div>
		<p class="text-sm font-medium text-slate-200">{item.node?.title}</p>
		<p class="mt-1 text-xs text-slate-500">
			Student team: {item.profile?.subteam?.name ?? 'Unassigned'} · Course team: {item.node?.subteam?.name ??
				'Unassigned'}
		</p>
		{#if item.requirement?.title || item.requirement?.directions}
			<p class="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
				{item.requirement?.title || 'Physical checkoff'}
			</p>
			<p class="mt-1 rounded bg-slate-950/60 p-2 text-xs text-slate-300">
				{item.requirement?.directions || 'No student directions provided.'}
			</p>
		{/if}
		{#if (item.requirement?.mentor_checklist ?? []).length}
			<ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
				{#each item.requirement.mentor_checklist as c}
					<li>{c}</li>
				{/each}
			</ul>
		{/if}
		{#if item.submission}
			<div class="mt-2 rounded border border-slate-700 bg-slate-950/40 p-2 text-xs">
				<p class="font-semibold text-slate-200">Student submission</p>
				<p class="mt-1 whitespace-pre-wrap text-slate-300">
					{item.submission.notes || 'No notes submitted.'}
				</p>
				{#if item.submission.photo_data_url}
					<a
						class="mt-2 inline-flex rounded border border-slate-700 px-2 py-1 text-xs text-yellow-300"
						href={item.submission.photo_data_url}
						target="_blank"
						rel="noopener noreferrer">Open submitted photo</a
					>
				{/if}
			</div>
		{:else if item.requirement?.evidence_mode === 'photo_required'}
			<p class="mt-2 rounded border border-amber-700/60 bg-amber-900/20 p-2 text-xs text-amber-200">
				Photo evidence is required but student has not submitted one yet.
			</p>
		{/if}
	</div>
	<label class="flex flex-col gap-1 text-xs text-slate-400">
		<span>Mentor notes (optional)</span>
		<textarea
			class="rounded bg-slate-800 px-2 py-2 text-sm text-slate-100"
			rows="2"
			placeholder="Feedback for the student..."
			bind:value={notes}
			disabled={!!busy}
		></textarea>
	</label>
	<div class="flex flex-wrap gap-2 pt-1">
		<button
			class="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
			onclick={approve}
			disabled={!!busy}
		>
			{busy === 'approve' ? 'Approving…' : 'Approve'}
		</button>
		<button
			class="rounded bg-amber-600 px-3 py-1 text-sm font-semibold hover:bg-amber-500 disabled:opacity-60"
			onclick={review}
			disabled={!!busy}
		>
			{busy === 'review' ? 'Sending back…' : 'Needs Review'}
		</button>
	</div>
</article>
