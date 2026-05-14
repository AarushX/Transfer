<script lang="ts">
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import EvidenceGallery from '$lib/components/ui/EvidenceGallery.svelte';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';

	let { item, onApprove, onReview, onOpen, onImageOpen } = $props();

	let busy = $state<'' | 'approve' | 'review'>('');
	let notes = $state('');
	let checklistStates = $state<Record<string, boolean>>({});
	let showResetConfirm = $state(false);

	const photosFor = (submission: any): string[] => {
		if (Array.isArray(submission?.photo_data_urls) && submission.photo_data_urls.length > 0) {
			return submission.photo_data_urls;
		}
		if (submission?.photo_data_url) return [submission.photo_data_url];
		return [];
	};

	$effect(() => {
		const initial: Record<string, boolean> = {};
		for (const row of item.review?.checklist_results ?? []) {
			const key = String(row?.item ?? '');
			if (key) initial[key] = !!row?.passed;
		}
		if (!Object.keys(initial).length) {
			for (const row of item.requirement?.mentor_checklist ?? []) {
				initial[String(row)] = false;
			}
		}
		checklistStates = initial;
		notes = item.review?.mentor_notes ?? '';
	});

	async function approve() {
		if (busy) return;
		busy = 'approve';
		try {
			const checklist_results = Object.entries(checklistStates).map(([item, passed]) => ({ item, passed }));
			await onApprove(item, notes.trim(), checklist_results);
		} finally {
			busy = '';
		}
	}

	async function review() {
		if (busy) return;
		busy = 'review';
		try {
			const checklist_results = Object.entries(checklistStates).map(([item, passed]) => ({ item, passed }));
			await onReview(item, notes.trim(), checklist_results);
		} finally {
			busy = '';
			showResetConfirm = false;
		}
	}

	const statusLabel = $derived.by(() => {
		switch (item.derivedCheckoffStatus) {
			case 'approved':
				return 'approved';
			case 'blocked':
				return 'blocked';
			case 'needs_review':
				return 'needs review';
			case 'submitted':
				return 'awaiting checkoff';
			default:
				return 'not submitted';
		}
	});
</script>

<div
	class="checkoff-card relative overflow-hidden space-y-3 rounded-2xl border p-4 backdrop-blur-xl transition duration-200"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	role="button"
	tabindex="0"
	onclick={() => onOpen?.(item)}
	onkeydown={(event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onOpen?.(item);
		}
	}}
>
	<div class="pointer-events-none absolute inset-0 rounded-2xl" style="background: var(--app-glass-shine);"></div>
	<div class="relative space-y-3">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-[15px] font-semibold" style="color: var(--app-text);">{item.profile?.full_name || item.profile?.email}</p>
				<p class="text-xs" style="color: var(--app-text-dim);">{item.profile?.email}</p>
			</div>
			<StatusChip label={statusLabel} tone={
				item.derivedCheckoffStatus === 'approved'
					? 'success'
					: item.derivedCheckoffStatus === 'needs_review'
						? 'warning'
						: item.derivedCheckoffStatus === 'blocked'
							? 'danger'
							: item.derivedCheckoffStatus === 'submitted'
								? 'info'
								: 'neutral'
			} />
		</div>

		<div class="space-y-3">
			<div>
				<p class="text-sm font-semibold" style="color: var(--app-text);">{item.node?.title}</p>
				<p class="mt-1 text-xs" style="color: var(--app-text-dim);">
					Student team: {item.profile?.subteam?.name ?? 'Unassigned'} · Course team: {item.node?.subteam?.name ?? 'Unassigned'}
				</p>
			</div>

			{#if item.requirement?.title || item.requirement?.directions}
				<div class="rounded-xl border p-3" style="background: color-mix(in srgb, var(--app-glass-bg) 70%, transparent); border-color: var(--app-glass-border);">
					<p class="eyebrow-label" style="margin-bottom: 6px;">
						{item.requirement?.title || 'Physical checkoff'}
					</p>
					<p class="text-xs" style="color: var(--app-text-muted);">
						{item.requirement?.directions || 'No student directions provided.'}
					</p>
				</div>
			{/if}

			{#if (item.requirement?.mentor_checklist ?? []).length}
				<div class="rounded-xl border p-3" style="background: color-mix(in srgb, var(--app-glass-bg) 70%, transparent); border-color: var(--app-glass-border);">
					<p class="eyebrow-label" style="margin-bottom: 8px;">Mentor checklist</p>
					<div class="space-y-1">
						{#each item.requirement.mentor_checklist as c}
							<label class="checklist-row flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition duration-150">
								<input
									type="checkbox"
									class="checklist-check mt-0.5"
									checked={!!checklistStates[c]}
									onchange={(event) =>
										(checklistStates[c] = (event.currentTarget as HTMLInputElement).checked)}
								/>
								<span style="color: var(--app-text-muted);">{c}</span>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			{#if item.submission}
				<div class="rounded-xl border p-3" style="background: color-mix(in srgb, var(--app-glass-bg) 70%, transparent); border-color: var(--app-glass-border);">
					<p class="eyebrow-label" style="margin-bottom: 6px;">Student submission</p>
					<p class="whitespace-pre-wrap text-xs" style="color: var(--app-text-muted);">
						{item.submission.notes || 'No notes submitted.'}
					</p>
					{#if photosFor(item.submission).length}
						<div class="mt-2">
							<EvidenceGallery images={photosFor(item.submission)} maxPreview={6} onOpen={onImageOpen} />
						</div>
					{/if}
				</div>
			{:else if item.requirement?.evidence_mode === 'photo_required'}
				<div class="rounded-xl border p-3 text-xs" style="background: color-mix(in srgb, var(--app-warning) 10%, transparent); border-color: color-mix(in srgb, var(--app-warning) 30%, transparent); color: color-mix(in srgb, var(--app-warning) 60%, white);">
					Photo evidence is required but student has not submitted one yet.
				</div>
			{/if}

			{#if item.review}
				<p class="text-[11px]" style="color: var(--app-text-dim);">
					Last review: {item.review.status} · {new Date(item.review.updated_at).toLocaleString()}
				</p>
			{/if}
		</div>

		<label class="flex flex-col gap-1.5">
			<span class="eyebrow-label">Mentor feedback</span>
			<textarea
				class="rounded-xl border px-3 py-2.5 text-sm backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				rows="2"
				placeholder="Feedback for the student..."
				bind:value={notes}
				disabled={!!busy}
			></textarea>
		</label>

		<div class="flex flex-wrap gap-2 pt-1">
			<button
				class="btn-approve rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 disabled:opacity-60"
				onclick={(event) => {
					event.stopPropagation();
					approve();
				}}
				disabled={!!busy}
			>
				{busy === 'approve' ? 'Approving...' : 'Approve'}
			</button>
			<button
				class="btn-reject rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 disabled:opacity-60"
				onclick={(event) => {
					event.stopPropagation();
					showResetConfirm = true;
				}}
				disabled={!!busy}
			>
				{busy === 'review' ? 'Rejecting...' : 'Reject / Reset'}
			</button>
		</div>
	</div>
</div>

<ConfirmDialog
	open={showResetConfirm}
	title="Reset student quiz?"
	message={`Reset quiz and send ${item.profile?.full_name || item.profile?.email} to try again?`}
	confirmLabel={busy === 'review' ? 'Resetting...' : 'Yes, reset'}
	cancelLabel="Cancel"
	danger={true}
	onCancel={() => (showResetConfirm = false)}
	onConfirm={() => review()}
/>

<style>
	.checkoff-card:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.checklist-row:hover {
		background: color-mix(in srgb, var(--app-glass-bg) 80%, transparent);
	}
	.checklist-check {
		accent-color: var(--app-accent);
	}
	.btn-approve {
		background: var(--aurora);
		color: white;
	}
	.btn-approve:hover:not(:disabled) {
		filter: brightness(1.15);
	}
	.btn-reject {
		background: color-mix(in srgb, var(--app-danger) 20%, transparent);
		border: 1px solid color-mix(in srgb, var(--app-danger) 40%, transparent);
		color: color-mix(in srgb, var(--app-danger) 80%, white);
	}
	.btn-reject:hover:not(:disabled) {
		background: color-mix(in srgb, var(--app-danger) 35%, transparent);
		border-color: color-mix(in srgb, var(--app-danger) 60%, transparent);
	}
</style>
