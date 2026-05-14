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
	let actionError = $state('');
	let selectedItem = $state<any | null>(null);
	let selectedImage = $state<string | null>(null);
	let scannedQrToken = $state('');
	let scannedStudentId = $state('');
	let scanMessage = $state('');
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
		withEvidence: queue.filter((q) => (q.submission?.photo_data_urls?.length ?? 0) > 0 || q.submission?.photo_data_url).length,
		needsEvidence: queue.filter((q) => q.requirement?.evidence_mode === 'photo_required' && !(q.submission?.photo_data_urls?.length || q.submission?.photo_data_url)).length
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
		// First try direct checkoff-approval QR tokens.
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
				queue = queue.filter((entry: any) => !(String(entry.user_id) === uid && String(entry.node_id) === nid));
			}
			return;
		}

		// Fallback to passport scan flow.
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
		scanMessage = scannedStudentId ? 'Passport verified for checkoff actions.' : 'Passport scan succeeded.';
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
			actionError = body?.error ?? 'Could not approve checkoff.';
			return;
		}
		actionError = '';
		queue = queue.filter((entry: any) => entry.id !== item.id);
		if (selectedItem?.id === item.id) selectedItem = null;
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
			actionError = body?.error ?? 'Could not reset quiz.';
			return;
		}
		actionError = '';
		queue = queue.filter((entry: any) => entry.id !== item.id);
		if (selectedItem?.id === item.id) selectedItem = null;
	};

</script>

<section class="space-y-4">
	<PageHeader title="Pending Checkoffs" description="Review submissions, evidence, and send actionable feedback.">
		<div class="flex items-center gap-2">
			<Button variant="secondary" href="/scan">Scan hub</Button>
			<Button variant="secondary" href="/mentor/courses">Manage courses →</Button>
		</div>
	</PageHeader>
	{#if data.error || actionError}
		<div class="rounded-xl border p-3 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">
			{data.error || actionError}
		</div>
	{/if}
	<div class="rounded-xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<form method="GET" class="flex flex-wrap items-center gap-2">
			<label for="scope" class="text-xs" style="color: var(--app-text-muted);">Scope</label>
			<select id="scope" name="scope" class="rounded-lg border px-2 py-1.5 text-sm backdrop-blur-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
				<option value="mine" selected={data.scope === 'mine'}>My teams</option>
				<option value="all" selected={data.scope === 'all'}>All teams</option>
			</select>
			<select name="team" class="rounded-lg border px-2 py-1.5 text-sm backdrop-blur-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);">
				<option value="">All course teams</option>
				{#each data.subteams as team}
					<option value={team.id} selected={team.id === data.selectedTeamId}>{team.name}</option>
				{/each}
			</select>
			<Button variant="secondary" size="sm" type="submit">Apply</Button>
			<Button variant="ghost" size="sm" href="/mentor">Reset</Button>
			<a href="/teams" class="ml-auto text-xs underline" style="color: var(--app-link);">Edit team preferences</a>
		</form>
		{#if data.scope === 'mine' && data.mentorTeamIds?.length === 0}
			<p class="mt-2 text-xs" style="color: var(--app-warning);">
				No mentor teams selected yet, so "My teams" currently shows all checkoffs.
			</p>
		{/if}
	</div>
	<div class="grid gap-2 md:grid-cols-3">
		<MetricCard label="Pending" value={summary.total} tone="info" />
		<MetricCard label="With evidence" value={summary.withEvidence} tone="success" />
		<MetricCard label="Missing required evidence" value={summary.needsEvidence} tone="warning" />
	</div>
	<SurfaceCard compact={true}>
		<SearchField bind:value={queueSearch} placeholder="Search by student, course, or team..." />
	</SurfaceCard>
	{#if !filteredQueue.length}
		<p style="color: var(--app-text-muted);">No students are waiting for checkoff.</p>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each filteredQueue as item}
				<div
					class="glass-queue-card space-y-2 rounded-xl border p-3 backdrop-blur-xl transition"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
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
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate font-semibold" style="color: var(--app-text);">{item.profile?.full_name || item.profile?.email}</p>
							<p class="truncate text-xs" style="color: var(--app-text-muted);">{item.node?.title}</p>
						</div>
						<StatusChip label="Pending" tone="info" />
					</div>
					{#if photosFor(item.submission).length}
						<div class="grid grid-cols-3 gap-1">
							{#each photosFor(item.submission).slice(0, 3) as photo}
								<button
									type="button"
									onclick={(event) => {
										event.stopPropagation();
										selectedImage = photo;
									}}
								>
									<img src={photo} alt="Evidence" class="h-14 w-full rounded object-cover" />
								</button>
							{/each}
						</div>
					{/if}
					<div class="flex gap-2 pt-1">
						<button
							class="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition"
							style="background: var(--app-success); color: white;"
							onclick={(event) => {
								event.stopPropagation();
								onApprove(item);
							}}
						>
							Accept
						</button>
						<button
							class="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition"
							style="background: var(--app-warning); color: white;"
							onclick={(event) => {
								event.stopPropagation();
								onResetQuiz(item);
							}}
						>
							Reject/Reset
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<GlassCard>
		<div class="mb-2 flex items-center justify-between">
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Past Checkoffs</h2>
			<span class="text-xs" style="color: var(--app-text-muted);">
				Most recent first · {data.historyTotal} total · page {data.historyPage} of {data.historyTotalPages}
			</span>
		</div>
		<ul class="space-y-2 text-sm">
			{#each data.history as h}
				<li class="rounded-lg border p-2" style="background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent); border-color: var(--app-glass-border);">
					<div class="flex items-center justify-between gap-2">
						<p style="color: var(--app-text);">
							<span class="font-medium">{h.user?.full_name || h.user?.email}</span>
							· {h.node?.title}
						</p>
						<span class="text-xs" style="color: var(--app-text-muted);">{new Date(h.updated_at).toLocaleString()}</span>
					</div>
					<p class="mt-1 text-xs" style="color: var(--app-text-muted);">
						{h.kind === 'approved'
							? 'Approved'
							: h.kind === 'blocked'
								? 'Blocked'
								: h.kind === 'needs_review'
									? 'Requested checkoff retry'
									: 'Status update'}
					</p>
					{#if getHistoryNotes(h)}
						<p class="mt-1 text-xs" style="color: var(--app-text);">{getHistoryNotes(h)}</p>
					{/if}
				</li>
			{:else}
				<li style="color: var(--app-text-muted);">No past checkoffs yet.</li>
			{/each}
		</ul>
		{#if data.historyTotalPages > 1}
			<div class="mt-3 flex items-center justify-end gap-2 text-sm">
				<a
					href={historyHref(Math.max(1, data.historyPage - 1))}
					aria-disabled={data.historyPage <= 1}
					class={`rounded-lg border px-3 py-1.5 transition ${
						data.historyPage <= 1
							? 'pointer-events-none opacity-40'
							: ''
					}`}
					style="border-color: var(--app-glass-border); color: var(--app-text);"
				>
					Previous
				</a>
				<span class="text-xs" style="color: var(--app-text-muted);">{data.historyPage} / {data.historyTotalPages}</span>
				<a
					href={historyHref(Math.min(data.historyTotalPages, data.historyPage + 1))}
					aria-disabled={data.historyPage >= data.historyTotalPages}
					class={`rounded-lg border px-3 py-1.5 transition ${
						data.historyPage >= data.historyTotalPages
							? 'pointer-events-none opacity-40'
							: ''
					}`}
					style="border-color: var(--app-glass-border); color: var(--app-text);"
				>
					Next
				</a>
			</div>
		{/if}
	</GlassCard>

	{#if selectedItem}
		<div
			class="fixed inset-0 z-40 flex items-center justify-center p-4"
			style="background: var(--app-overlay-scrim); background-color: color-mix(in srgb, var(--app-overlay-scrim) 70%, transparent);"
			role="button"
			tabindex="0"
			onclick={() => (selectedItem = null)}
			onkeydown={(event) => {
				if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') selectedItem = null;
			}}
		>
			<div
				class="max-h-[95vh] w-full max-w-4xl overflow-auto rounded-xl border p-4 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
				onclick={(event) => event.stopPropagation()}
			>
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-lg font-semibold" style="color: var(--app-text);">Full Review</h2>
					<Button
						variant="secondary"
						size="sm"
						onclick={(event) => {
							event.stopPropagation();
							selectedItem = null;
						}}
					>Close</Button>
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
	{/if}

	{#if selectedImage}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
			role="button"
			tabindex="0"
			onclick={() => (selectedImage = null)}
			onkeydown={(event) => {
				if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') selectedImage = null;
			}}
		>
			<img
				src={selectedImage}
				alt="Submission evidence full screen"
				class="max-h-full max-w-full object-contain"
			/>
		</div>
	{/if}
</section>

<style>
	.glass-queue-card {
		transition: background 0.2s ease, border-color 0.2s ease;
	}
	.glass-queue-card:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
</style>
