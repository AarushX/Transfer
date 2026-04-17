<script lang="ts">
	let { item, onApprove, onReview } = $props();

	let busy = $state<'' | 'approve' | 'review'>('');

	async function approve() {
		if (busy) return;
		busy = 'approve';
		try {
			await onApprove(item);
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
			await onReview(item);
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
		{#if item.node?.physical_task}
			<p class="mt-1 rounded bg-slate-950/60 p-2 text-xs text-slate-300">
				{item.node.physical_task}
			</p>
		{/if}
	</div>
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
