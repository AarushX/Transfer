<script lang="ts">
	import { onMount } from 'svelte';
	import { getOptionalBrowserSupabaseClient } from '$lib/supabase';

	type NotificationRow = {
		id: string;
		type: string;
		title: string;
		body: string | null;
		href: string | null;
		read_at: string | null;
		created_at: string;
	};

	let {
		userId,
		initialUnread = 0,
		align = 'left',
		drop = 'down'
	}: {
		userId: string;
		initialUnread?: number;
		align?: 'left' | 'right';
		drop?: 'down' | 'up';
	} = $props();

	let open = $state(false);
	let unread = $state(0);
	let items = $state<NotificationRow[]>([]);
	let loading = $state(false);
	let wrapper = $state<HTMLDivElement | null>(null);

	$effect(() => {
		unread = initialUnread;
	});

	const timeFormat = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
	const formatTime = (iso: string) => {
		const date = new Date(iso);
		return Number.isNaN(date.getTime()) ? '' : timeFormat.format(date);
	};

	const loadItems = async () => {
		loading = true;
		try {
			const res = await fetch('/api/notifications?limit=20');
			if (res.ok) {
				const payload = await res.json();
				items = payload.notifications ?? [];
			}
		} catch {
			/* keep previous items */
		} finally {
			loading = false;
		}
	};

	const markAllRead = async () => {
		if (unread === 0) return;
		unread = 0;
		items = items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }));
		try {
			await fetch('/api/notifications', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ all: true })
			});
		} catch {
			/* badge refreshes from the layout load on next navigation */
		}
	};

	const toggle = async () => {
		open = !open;
		if (open) {
			await loadItems();
			void markAllRead();
		}
	};

	onMount(() => {
		const supabase = getOptionalBrowserSupabaseClient();
		if (!supabase) return;
		const channel = supabase
			.channel(`notifications-${userId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`
				},
				(payload) => {
					unread += 1;
					if (open) {
						items = [payload.new as NotificationRow, ...items].slice(0, 20);
					}
				}
			)
			.subscribe();
		const onDocClick = (event: MouseEvent) => {
			if (open && wrapper && !wrapper.contains(event.target as Node)) open = false;
		};
		document.addEventListener('click', onDocClick);
		return () => {
			supabase.removeChannel(channel);
			document.removeEventListener('click', onDocClick);
		};
	});
</script>

<div class="relative" bind:this={wrapper}>
	<button
		type="button"
		class="bell-btn relative rounded-lg border p-1.5"
		style="border-color: var(--app-glass-border); color: var(--app-text-muted); background: transparent;"
		aria-label="Notifications{unread > 0 ? ` (${unread} unread)` : ''}"
		aria-expanded={open}
		onclick={toggle}
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-4.5 w-4.5"
		>
			<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
			<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
		</svg>
		{#if unread > 0}
			<span
				data-role="notification-badge"
				class="absolute -top-1.5 -right-1.5 min-w-[16px] rounded-full px-1 text-center text-[10px] leading-4 font-semibold"
				style="background: var(--app-accent); color: var(--app-accent-text);"
			>
				{unread > 99 ? '99+' : unread}
			</span>
		{/if}
	</button>

	{#if open}
		<div
			class="absolute z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border backdrop-blur-xl {align ===
			'right'
				? 'right-0'
				: 'left-0'} {drop === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}"
			style="background: var(--app-surface); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
		>
			<div
				class="flex items-center justify-between border-b px-3 py-2"
				style="border-color: var(--app-glass-border);"
			>
				<p
					class="text-xs font-semibold tracking-wider uppercase"
					style="color: var(--app-text-muted);"
				>
					Notifications
				</p>
			</div>
			<div class="max-h-80 overflow-y-auto">
				{#if loading && items.length === 0}
					<p class="px-3 py-4 text-sm" style="color: var(--app-text-muted);">Loading…</p>
				{:else if items.length === 0}
					<p class="px-3 py-4 text-sm" style="color: var(--app-text-muted);">
						Nothing here yet — you're all caught up.
					</p>
				{:else}
					<ul>
						{#each items as item (item.id)}
							<li class="border-b last:border-b-0" style="border-color: var(--app-glass-border);">
								{#snippet itemBody()}
									<p class="text-sm" style="color: var(--app-text);">{item.title}</p>
									{#if item.body}
										<p class="mt-0.5 text-xs" style="color: var(--app-text-muted);">{item.body}</p>
									{/if}
									<p class="mt-1 text-[11px]" style="color: var(--app-text-dim);">
										{formatTime(item.created_at)}
									</p>
								{/snippet}
								{#if item.href}
									<a
										href={item.href}
										class="notification-item block px-3 py-2.5"
										onclick={() => (open = false)}
									>
										{@render itemBody()}
									</a>
								{:else}
									<div class="notification-item px-3 py-2.5">
										{@render itemBody()}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.bell-btn {
		transition: background 0.15s ease;
	}
	.bell-btn:hover {
		background: var(--app-glass-bg-hover);
	}
	.notification-item {
		transition: background 0.15s ease;
	}
	.notification-item:hover {
		background: var(--app-glass-bg-hover);
	}
</style>
