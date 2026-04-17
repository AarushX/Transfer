<script lang="ts">
	let { item, onApprove, onReview } = $props();
</script>

<article class="rounded-lg border border-slate-700 bg-slate-900 p-3">
	<p class="font-semibold">{item.profile?.full_name || item.profile?.email}</p>
	<p class="text-sm text-slate-300">{item.node?.title}</p>
	<p class="mt-1 text-xs text-slate-400">{item.node?.physical_task}</p>
	<div class="mt-3 flex gap-2">
		<button class="rounded bg-green-600 px-3 py-1 text-sm" onclick={() => onApprove(item)}
			>Approve</button
		>
		<button class="rounded bg-amber-600 px-3 py-1 text-sm" onclick={() => onReview(item)}
			>Needs Review</button
		>
	</div>
</article>
