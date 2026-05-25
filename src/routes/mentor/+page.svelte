<script lang="ts">
	import CheckoffCard from '$lib/components/CheckoffCard.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchField from '$lib/components/ui/SearchField.svelte';
	import SurfaceCard from '$lib/components/ui/SurfaceCard.svelte';
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import { createBrowserClient } from '@supabase/ssr';
	import { env as publicEnv } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	let { data } = $props();
	let queue = $state<any[]>([]);
	let queueSearch = $state('');
	let cardErrors = $state<Record<string, string>>({});
	let selectedItem = $state<any | null>(null);
	let selectedImage = $state<string | null>(null);
	let scannedQrToken = $state('');
	let scannedStudentId = $state('');
	let scanMessage = $state('');
	let historyTab = $state<'unfinished' | 'finished'>('unfinished');
	const isFinished = (h: any) => h.kind === 'approved';
	const filteredHistory = $derived(
		(data.history ?? []).filter((h: any) =>
			historyTab === 'finished' ? isFinished(h) : !isFinished(h)
		)
	);
	const historyCounts = $derived.by(() => {
		const all = data.history ?? [];
		const finished = all.filter(isFinished).length;
		return { finished, unfinished: all.length - finished };
	});
	const getHistoryNotes = (entry: any) => entry?.mentor_notes ?? '';
	const historyHref = (page: number) => {
		const params = new URLSearchParams();
		if (data.scope === 'all') params.set('scope', 'all');
		if (data.selectedTeamId) params.set('team', data.selectedTeamId);
		if (page > 1) params.set('historyPage', String(page));
		const query = params.toString();
		return query ? `/mentor?${query}` : '/mentor';
	};
	const summary = $derived({
		total: queue.length,
		withEvidence: queue.filter(
			(q) => (q.submission?.photo_data_urls?.length ?? 0) > 0 || q.submission?.photo_data_url
		).length,
		needsEvidence: queue.filter(
			(q) =>
				q.requirement?.evidence_mode === 'photo_required' &&
				!(q.submission?.photo_data_urls?.length || q.submission?.photo_data_url)
		).length
	});
	const photosFor = (submission: any): string[] => {
		if (Array.isArray(submission?.photo_data_urls) && submission.photo_data_urls.length > 0) {
			return submission.photo_data_urls;
		}
		if (submission?.photo_data_url) return [submission.photo_data_url];
		return [];
	};
	const filteredQueue = $derived.by(() => {
		const needle = queueSearch.trim().toLowerCase();
		if (!needle) return queue;
		return queue.filter((item) => {
			const name = (item.profile?.full_name ?? item.profile?.email ?? '').toLowerCase();
			const course = (item.node?.title ?? '').toLowerCase();
			const team = (item.node?.subteam?.name ?? '').toLowerCase();
			return name.includes(needle) || course.includes(needle) || team.includes(needle);
		});
	});
	const PUBLIC_SUPABASE_URL = publicEnv.PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
	const PUBLIC_SUPABASE_ANON_KEY = publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key';

	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

	onMount(() => {
		queue = data.queue ?? [];
		const channel = supabase
			.channel('mentor-queue')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'certifications' },
				async () => {
					const res = await fetch('/mentor');
					if (res.ok) location.reload();
				}
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'checkoff_submissions' },
				async () => {
					const res = await fetch('/mentor');
					if (res.ok) location.reload();
				}
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'checkoff_reviews' },
				async () => {
					const res = await fetch('/mentor');
					if (res.ok) location.reload();
				}
			)
			.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	});

	const onDecodedForCheckoff = async (token: string) => {
		const approveRes = await fetch('/api/mentor/checkoff', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'approve', checkoffToken: token })
		});
		if (approveRes.ok) {
			const body = await approveRes.json().catch(() => null);
			scanMessage = 'Checkoff approved from QR.';
			const uid = String(body?.userId ?? '');
			const nid = String(body?.nodeId ?? '');
			if (uid && nid) {
				queue = queue.filter(
					(entry: any) => !(String(entry.user_id) === uid && String(entry.node_id) === nid)
				);
			}
			return;
		}

		const res = await fetch('/api/mentor/resolve-qr', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token })
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			scanMessage = body?.error ?? 'Could not validate QR.';
			return;
		}
		scannedQrToken = token;
		scannedStudentId = body?.profile?.id ?? '';
		scanMessage = scannedStudentId
			? 'Passport verified for checkoff actions.'
			: 'Passport scan succeeded.';
	};

	const onApprove = async (item: any, notes = '', checklist_results: any[] = []) => {
		const res = await fetch('/api/mentor/checkoff', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				nodeId: item.node_id,
				userId: item.user_id,
				blockId: item.active_block_id ?? null,
				action: 'approve',
				notes,
				checklist_results,
				qrToken: scannedQrToken
			})
		});
		if (!res.ok) {
			const body = await res.json().catch(() => null);
			const message = body?.error ?? 'Could not approve checkoff.';
			cardErrors = { ...cardErrors, [item.id]: message };
			return message;
		}
		cardErrors = Object.fromEntries(Object.entries(cardErrors).filter(([k]) => k !== item.id));
		queue = queue.filter((entry: any) => entry.id !== item.id);
		if (selectedItem?.id === item.id) selectedItem = null;
		return '';
	};

	const onResetQuiz = async (item: any, notes = '', checklist_results: any[] = []) => {
		const res = await fetch('/api/mentor/checkoff', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				nodeId: item.node_id,
				userId: item.user_id,
				blockId: item.active_block_id ?? null,
				action: 'reset_quiz',
				notes,
				checklist_results,
				qrToken: scannedQrToken
			})
		});
		if (!res.ok) {
			const body = await res.json().catch(() => null);
			const message = body?.error ?? 'Could not reset quiz.';
			cardErrors = { ...cardErrors, [item.id]: message };
			return message;
		}
		cardErrors = Object.fromEntries(Object.entries(cardErrors).filter(([k]) => k !== item.id));
		queue = queue.filter((entry: any) => entry.id !== item.id);
		if (selectedItem?.id === item.id) selectedItem = null;
		return '';
	};
</script>

<section class="space-y-5">
	<PageHeader
		title="Pending Checkoffs"
		description="Review submissions, evidence, and send actionable feedback."
	>
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-2">
				<span class="live-dot" style="color: var(--app-success);"></span>
				<span class="text-xs font-medium" style="color: var(--app-text-muted);">Live</span>
			</div>
			<Button variant="secondary" href="/scan">Scan hub</Button>
			<Button variant="secondary" href="/mentor/courses">Manage courses</Button>
		</div>
	</PageHeader>

	{#if data.error}
		<div
			class="fade-up rounded-2xl border p-4 text-sm"
			style="border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{data.error}
		</div>
	{/if}

	<div
		class="fade-up rounded-2xl border p-4 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
	>
		<div
			class="pointer-events-none absolute inset-0 rounded-2xl"
			style="background: var(--app-glass-shine);"
		></div>
		<form method="GET" class="relative flex flex-wrap items-center gap-3">
			<p class="eyebrow-label">Scope</p>
			<select
				id="scope"
				name="scope"
				class="rounded-xl border px-3 py-2 text-sm backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
			>
				<option value="mine" selected={data.scope === 'mine'}>My teams</option>
				<option value="all" selected={data.scope === 'all'}>All teams</option>
			</select>
			<select
				name="team"
				class="rounded-xl border px-3 py-2 text-sm backdrop-blur-sm"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
			>
				<option value="">All course teams</option>
				{#each data.subteams as team}
					<option value={team.id} selected={team.id === data.selectedTeamId}>{team.name}</option>
				{/each}
			</select>
			<Button variant="secondary" size="sm" type="submit">Apply</Button>
			<Button variant="ghost" size="sm" href="/mentor">Reset</Button>
			<a href="/teams" class="ml-auto text-xs underline" style="color: var(--app-link);"
				>Edit team preferences</a
			>
		</form>
		{#if data.scope === 'mine' && data.mentorTeamIds?.length === 0}
			<p class="relative mt-2 text-xs" style="color: var(--app-warning);">
				No mentor teams selected yet, so "My teams" currently shows all checkoffs.
			</p>
		{/if}
	</div>

	<div class="fade-up grid gap-3 md:grid-cols-3" style="animation-delay: 0.05s;">
		<MetricCard label="Pending" value={summary.total} tone="info" />
		<MetricCard label="With evidence" value={summary.withEvidence} tone="success" />
		<MetricCard label="Missing required evidence" value={summary.needsEvidence} tone="warning" />
	</div>

	<div class="fade-up" style="animation-delay: 0.1s;">
		<GlassCard compact={true}>
			<SearchField bind:value={queueSearch} placeholder="Search by student, course, or team..." />
		</GlassCard>
	</div>

	{#if !filteredQueue.length}
		<div
			class="fade-up rounded-2xl border p-8 text-center backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); animation-delay: 0.15s;"
		>
			<p class="text-sm" style="color: var(--app-text-muted);">
				No students are waiting for checkoff.
			</p>
		</div>
	{:else}
		<div class="fade-up grid gap-4 md:grid-cols-2 xl:grid-cols-3" style="animation-delay: 0.15s;">
			{#each filteredQueue as item}
				<div
					class="queue-card group relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition duration-200"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
					role="button"
					tabindex="0"
					onclick={() => (selectedItem = item)}
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							selectedItem = item;
						}
					}}
				>
					<div
						class="pointer-events-none absolute inset-0 rounded-2xl"
						style="background: var(--app-glass-shine);"
					></div>
					<div class="relative space-y-3">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-[15px] font-semibold" style="color: var(--app-text);">
									{item.profile?.full_name || item.profile?.email}
								</p>
								<p class="truncate text-xs" style="color: var(--app-text-muted);">
									{item.node?.title}
								</p>
								{#if item.node?.subteam?.name}
									<span
										class="chip-violet mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
									>
										{item.node.subteam.name}
									</span>
								{/if}
							</div>
							<StatusChip label="Pending" tone="info" />
						</div>
						{#if photosFor(item.submission).length}
							<div class="grid grid-cols-3 gap-1.5">
								{#each photosFor(item.submission).slice(0, 3) as photo}
									<button
										type="button"
										class="overflow-hidden rounded-lg transition duration-200 hover:opacity-80"
										onclick={(event) => {
											event.stopPropagation();
											selectedImage = photo;
										}}
									>
										<img src={photo} alt="Evidence" class="h-16 w-full rounded-lg object-cover" />
									</button>
								{/each}
							</div>
						{/if}
						{#if cardErrors[item.id]}
							<div
								class="rounded-lg border px-2.5 py-1.5 text-[11px]"
								style="border-color: color-mix(in srgb, var(--app-danger) 45%, transparent); background: color-mix(in srgb, var(--app-danger) 12%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
								role="alert"
							>
								{cardErrors[item.id]}
							</div>
						{/if}
						<div class="flex gap-2 pt-1">
							<button
								class="queue-btn-approve flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200"
								onclick={(event) => {
									event.stopPropagation();
									onApprove(item);
								}}
							>
								Accept
							</button>
							<button
								class="queue-btn-reject flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition duration-200"
								onclick={(event) => {
									event.stopPropagation();
									onResetQuiz(item);
								}}
							>
								Reject/Reset
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="fade-up" style="animation-delay: 0.2s;">
		<GlassCard>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<p class="eyebrow-label" style="margin-bottom: 4px;">History</p>
					<h2 class="text-lg font-semibold tracking-tight" style="color: var(--app-text);">
						Past Checkoffs
					</h2>
				</div>
				<span class="mono text-xs" style="color: var(--app-text-dim);">
					{data.historyTotal} total · page {data.historyPage}/{data.historyTotalPages}
				</span>
			</div>
			<div
				class="history-tabs mb-3 inline-flex rounded-xl border p-1"
				style="background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent); border-color: var(--app-glass-border);"
			>
				<button
					type="button"
					class="history-tab"
					data-active={historyTab === 'unfinished'}
					onclick={() => (historyTab = 'unfinished')}
				>
					Unfinished <span class="tab-count">{historyCounts.unfinished}</span>
				</button>
				<button
					type="button"
					class="history-tab"
					data-active={historyTab === 'finished'}
					onclick={() => (historyTab = 'finished')}
				>
					Finished <span class="tab-count">{historyCounts.finished}</span>
				</button>
			</div>
			<ul class="space-y-2 text-sm">
				{#each filteredHistory as h}
					<li
						class="history-row rounded-xl border p-3 transition duration-200"
						style="background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent); border-color: var(--app-glass-border);"
					>
						<div class="flex items-center justify-between gap-2">
							<div class="flex min-w-0 items-center gap-2">
								<span
									class="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium {h.kind ===
									'approved'
										? 'chip-emerald'
										: h.kind === 'blocked'
											? 'chip-rose'
											: 'chip-amber'}"
								>
									{h.kind === 'approved'
										? 'Approved'
										: h.kind === 'blocked'
											? 'Blocked'
											: h.kind === 'needs_review'
												? 'Retry'
												: 'Update'}
								</span>
								<p class="truncate" style="color: var(--app-text);">
									<span class="font-medium">{h.user?.full_name || h.user?.email}</span>
									<span style="color: var(--app-text-dim);">·</span>
									<span style="color: var(--app-text-muted);">{h.node?.title}</span>
								</p>
							</div>
							<span class="mono shrink-0 text-[11px]" style="color: var(--app-text-dim);"
								>{new Date(h.updated_at).toLocaleString()}</span
							>
						</div>
						{#if getHistoryNotes(h)}
							<p class="mt-1.5 text-xs" style="color: var(--app-text-muted);">
								{getHistoryNotes(h)}
							</p>
						{/if}
					</li>
				{:else}
					<li class="py-4 text-center text-sm" style="color: var(--app-text-dim);">
						{historyTab === 'finished'
							? 'No approved checkoffs on this page.'
							: 'No retries or blocked checkoffs on this page.'}
					</li>
				{/each}
			</ul>
			{#if data.historyTotalPages > 1}
				<div class="mt-4 flex items-center justify-end gap-2 text-sm">
					<a
						href={historyHref(Math.max(1, data.historyPage - 1))}
						aria-disabled={data.historyPage <= 1}
						class={`pagination-link rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 ${
							data.historyPage <= 1 ? 'pointer-events-none opacity-40' : ''
						}`}
						style="border-color: var(--app-glass-border); color: var(--app-text); background: var(--app-glass-bg);"
					>
						Previous
					</a>
					<span class="mono text-xs" style="color: var(--app-text-dim);"
						>{data.historyPage} / {data.historyTotalPages}</span
					>
					<a
						href={historyHref(Math.min(data.historyTotalPages, data.historyPage + 1))}
						aria-disabled={data.historyPage >= data.historyTotalPages}
						class={`pagination-link rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 ${
							data.historyPage >= data.historyTotalPages ? 'pointer-events-none opacity-40' : ''
						}`}
						style="border-color: var(--app-glass-border); color: var(--app-text); background: var(--app-glass-bg);"
					>
						Next
					</a>
				</div>
			{/if}
		</GlassCard>
	</div>

	{#if selectedItem}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center p-4"
			style="background-color: color-mix(in srgb, var(--app-overlay-scrim) 80%, transparent);"
			role="button"
			tabindex="0"
			onclick={() => (selectedItem = null)}
			onkeydown={(event) => {
				if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')
					selectedItem = null;
			}}
		>
			<div
				class="modal-panel relative max-h-[95vh] w-full max-w-4xl overflow-auto rounded-2xl border p-5 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
				onclick={(event) => event.stopPropagation()}
			>
				<div
					class="pointer-events-none absolute inset-0 rounded-2xl"
					style="background: var(--app-glass-shine);"
				></div>
				<div class="relative">
					<div class="mb-4 flex items-center justify-between">
						<div>
							<p class="eyebrow-label" style="margin-bottom: 4px;">Review</p>
							<h2 class="text-lg font-semibold tracking-tight" style="color: var(--app-text);">
								Full Review
							</h2>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onclick={(event) => {
								event.stopPropagation();
								selectedItem = null;
							}}>Close</Button
						>
					</div>
					<CheckoffCard
						item={selectedItem}
						{onApprove}
						onReview={onResetQuiz}
						onOpen={() => {}}
						onImageOpen={(url: string) => (selectedImage = url)}
					/>
				</div>
			</div>
		</div>
	{/if}

	{#if selectedImage}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4"
			style="background-color: color-mix(in srgb, black 92%, transparent);"
			role="button"
			tabindex="0"
			onclick={() => (selectedImage = null)}
			onkeydown={(event) => {
				if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ')
					selectedImage = null;
			}}
		>
			<img
				src={selectedImage}
				alt="Submission evidence full screen"
				class="max-h-full max-w-full rounded-xl object-contain"
			/>
		</div>
	{/if}
</section>

<style>
	.queue-card {
		cursor: pointer;
	}
	.queue-card:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.queue-btn-approve {
		background: var(--aurora);
		color: white;
	}
	.queue-btn-approve:hover {
		filter: brightness(1.15);
	}
	.queue-btn-reject {
		background: color-mix(in srgb, var(--app-danger) 20%, transparent);
		border: 1px solid color-mix(in srgb, var(--app-danger) 40%, transparent);
		color: color-mix(in srgb, var(--app-danger) 80%, white);
	}
	.queue-btn-reject:hover {
		background: color-mix(in srgb, var(--app-danger) 35%, transparent);
		border-color: color-mix(in srgb, var(--app-danger) 60%, transparent);
	}
	.history-row:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.pagination-link:hover {
		background: var(--app-glass-bg-hover) !important;
		border-color: var(--app-glass-border-hover) !important;
	}
	.modal-panel {
		animation: fadeUp 0.25s cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}
	.history-tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 12px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--app-text-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.history-tab:hover {
		color: var(--app-text);
	}
	.history-tab[data-active='true'] {
		background: color-mix(in srgb, var(--app-accent) 22%, transparent);
		color: var(--app-text);
	}
	.history-tab .tab-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		padding: 0 5px;
		height: 16px;
		font-size: 10px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--app-text-muted) 22%, transparent);
		color: var(--app-text);
	}
	.history-tab[data-active='true'] .tab-count {
		background: color-mix(in srgb, var(--app-accent) 35%, transparent);
	}
</style>
