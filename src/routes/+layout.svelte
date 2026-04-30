<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import { isAdmin, isMentor, isParentGuardian, roleBadgeParts } from '$lib/roles';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	let { children, data } = $props();
	const canMentor = $derived(isMentor(data.profile));
	const canAdmin = $derived(isAdmin(data.profile));
	const canParent = $derived(isParentGuardian(data.profile));
	const roleLabel = $derived(roleBadgeParts(data.profile).join(' · '));

	let mobileOpen = $state(false);
	let installPromptEvent = $state<any>(null);
	let showInstallButton = $state(false);

	type NavItem = { href: string; label: string; match?: (p: string) => boolean };

	const memberPrimary: NavItem[] = [
		...(data.needsOnboarding
			? [{ href: '/onboarding', label: 'Onboarding', match: (p: string) => p.startsWith('/onboarding') }]
			: []),
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/ranked', label: 'Ranked', match: (p) => p.startsWith('/ranked') },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/surveys', label: 'Applications', match: (p) => p.startsWith('/surveys') },
		{ href: '/carpool', label: 'Carpool', match: (p) => p.startsWith('/carpool') },
		{ href: '/forms', label: 'Forms', match: (p) => p.startsWith('/forms') },
		{ href: '/scan', label: 'Scan', match: (p) => p.startsWith('/scan') }
	];
	const parentPrimary: NavItem[] = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/carpool', label: 'Carpool', match: (p) => p.startsWith('/carpool') },
		{ href: '/forms', label: 'Forms', match: (p) => p.startsWith('/forms') }
	];
	const primary: NavItem[] = canParent ? parentPrimary : memberPrimary;

	const mentorNav: NavItem[] = [
		{ href: '/mentor', label: 'Checkoffs queue', match: (p) => p === '/mentor' },
		{
			href: '/mentor/courses',
			label: 'Course management',
			match: (p) => p.startsWith('/mentor/courses')
		},
		{
			href: '/mentor/surveys',
			label: 'Survey management',
			match: (p) => p.startsWith('/mentor/surveys')
		},
		{
			href: '/mentor/forms',
			label: 'Forms management',
			match: (p) => p.startsWith('/mentor/forms')
		},
		{
			href: '/mentor/carpool',
			label: 'Carpool management',
			match: (p) => p.startsWith('/mentor/carpool')
		},
		{
			href: '/mentor/machines',
			label: 'Machine shop',
			match: (p) => p.startsWith('/mentor/machines')
		},
		{ href: '/roster', label: 'Roster', match: (p) => p.startsWith('/roster') }
	];

	const adminNav: NavItem[] = [
		{ href: '/admin/settings', label: 'Workspace' },
		{ href: '/admin/settings/teams', label: 'Teams', match: (p) => p.startsWith('/admin/settings/teams') },
		{ href: '/admin/content', label: 'Content' },
		{ href: '/admin/parents', label: 'Parent approvals', match: (p) => p.startsWith('/admin/parents') },
		{ href: '/admin/attendance', label: 'Attendance' },
		{ href: '/admin/audit', label: 'Audit log' }
	];

	const isActive = (item: NavItem, p: string) => (item.match ? item.match(p) : p === item.href);
	const isAttendanceKiosk = $derived(page.url.pathname === '/attendance');
	const themeVars = $derived(
		`--app-bg:${data.orgTheme?.background ?? '#0b1220'};` +
			`--app-surface:${data.orgTheme?.surface ?? '#121a2b'};` +
			`--app-surface-alt:${data.orgTheme?.surfaceAlt ?? '#1a2438'};` +
			`--app-border:${data.orgTheme?.border ?? '#2a3754'};` +
			`--app-text:${data.orgTheme?.text ?? '#e6edf7'};` +
			`--app-text-muted:${data.orgTheme?.textMuted ?? '#9fb0cc'};` +
			`--app-accent:${data.orgTheme?.accent ?? '#8b5cf6'};` +
			`--app-accent-text:${data.orgTheme?.accentText ?? '#ffffff'};` +
			`--app-success:${data.orgTheme?.success ?? '#22c55e'};` +
			`--app-warning:${data.orgTheme?.warning ?? '#f59e0b'};` +
			`--app-danger:${data.orgTheme?.danger ?? '#f43f5e'};` +
			`--app-info:${data.orgTheme?.info ?? '#06b6d4'};` +
			`--app-link:${data.orgTheme?.link ?? '#60a5fa'};` +
			`--app-link-hover:${data.orgTheme?.linkHover ?? '#3b82f6'};` +
			`--app-input-bg:${data.orgTheme?.inputBg ?? '#111a2e'};` +
			`--app-input-text:${data.orgTheme?.inputText ?? '#e6edf7'};` +
			`--app-table-header-bg:${data.orgTheme?.tableHeaderBg ?? '#1a2438'};` +
			`--app-table-row-hover:${data.orgTheme?.tableRowHover ?? '#182136'};` +
			`--app-overlay-scrim:${data.orgTheme?.overlayScrim ?? '#020617'};` +
			`--app-focus-ring:${data.orgTheme?.focusRing ?? '#a78bfa'};` +
			`--app-button-secondary-bg:${data.orgTheme?.buttonSecondaryBg ?? '#1a2438'};` +
			`--app-button-secondary-text:${data.orgTheme?.buttonSecondaryText ?? '#d6e2f5'};` +
			`--app-button-secondary-border:${data.orgTheme?.buttonSecondaryBorder ?? '#334766'};`
	);

	const handleInstallClick = async () => {
		if (!installPromptEvent) return;
		await installPromptEvent.prompt();
		const choice = await installPromptEvent.userChoice?.catch(() => null);
		if (choice?.outcome === 'accepted' || choice?.outcome === 'dismissed') {
			installPromptEvent = null;
			showInstallButton = false;
		}
	};

	$effect(() => {
		const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
		const shouldLockBackground = mobileOpen && isMobileViewport;
		document.body.style.overflow = shouldLockBackground ? 'hidden' : '';
		document.body.style.touchAction = shouldLockBackground ? 'none' : '';
		return () => {
			document.body.style.overflow = '';
			document.body.style.touchAction = '';
		};
	});

	$effect(() => {
		const media = window.matchMedia('(max-width: 767px)');
		const syncMobileFlag = () => {
			showInstallButton = media.matches && Boolean(installPromptEvent);
		};
		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			installPromptEvent = event as any;
			syncMobileFlag();
		};
		const onInstalled = () => {
			installPromptEvent = null;
			showInstallButton = false;
		};
		syncMobileFlag();
		media.addEventListener('change', syncMobileFlag);
		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			media.removeEventListener('change', syncMobileFlag);
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});
</script>

<svelte:head>
	<title>{data.orgName} · Transfer</title>
	<link rel="icon" href={data.orgIconDataUrl || favicon} />
	<meta name="theme-color" content="#020617" />
</svelte:head>

{#if isAttendanceKiosk}
	<main class="min-h-dvh bg-slate-950 text-slate-100" style={themeVars}>
		{@render children()}
	</main>
{:else}
	<div
		class="flex min-h-dvh bg-slate-950 text-slate-100 md:h-screen md:overflow-hidden"
		style={`${themeVars} background: var(--app-bg); color: var(--app-text);`}
	>
		<!-- Sidebar -->
		<aside
			class={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-700 bg-slate-900 pb-[env(safe-area-inset-bottom)] transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:pb-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
			style="background: var(--app-surface); border-color: var(--app-border); color: var(--app-text);"
		>
			<div class="flex items-center justify-between border-b border-slate-700 px-5 py-5">
				<a href="/dashboard" class="block leading-tight">
					<p class="text-[11px] font-medium tracking-[0.18em] text-slate-500 uppercase">Transfer</p>
					<p class="mt-0.5 text-sm font-semibold text-slate-100">{data.orgName}</p>
				</a>
				<button
					type="button"
					class="rounded p-1 text-slate-400 hover:bg-slate-800 md:hidden"
					aria-label="Close navigation"
					onclick={() => (mobileOpen = false)}
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5"
						><path
							fill-rule="evenodd"
							d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 1 0-1.06-1.06L10 8.94 5.28 4.22Z"
							clip-rule="evenodd"
						/></svg
					>
				</button>
			</div>

			<nav class="flex-1 overflow-y-auto px-3 py-4 text-sm">
				<p class="px-2 pb-2 text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase">
					Workspace
				</p>
				<ul class="space-y-0.5">
					{#each primary as item (item.href)}
						<li>
							<a
								href={item.href}
								onclick={() => (mobileOpen = false)}
								class={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
									item.href === '/onboarding'
										? isActive(item, page.url.pathname)
											? 'shadow-sm'
											: ''
										: isActive(item, page.url.pathname)
											? 'bg-slate-700 text-white shadow-sm'
											: 'text-slate-300 hover:bg-slate-800'
								}`}
								style={
									item.href === '/onboarding'
										? isActive(item, page.url.pathname)
											? `background: var(--app-accent); color: var(--app-accent-text);`
											: `background: color-mix(in srgb, var(--app-accent) 22%, transparent); color: color-mix(in srgb, var(--app-accent) 55%, white);`
										: ''
								}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>

				{#if canMentor}
					<p
						class="mt-6 px-2 pb-2 text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase"
					>
						Mentor
					</p>
					<ul class="space-y-0.5">
						{#each mentorNav as item (item.href)}
							<li>
								<a
									href={item.href}
									onclick={() => (mobileOpen = false)}
									class={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${isActive(item, page.url.pathname) ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				{#if canAdmin}
					<p
						class="mt-6 px-2 pb-2 text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase"
					>
						Admin
					</p>
					<ul class="space-y-0.5">
						{#each adminNav as item (item.href)}
							<li>
								<a
									href={item.href}
									onclick={() => (mobileOpen = false)}
									class={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${isActive(item, page.url.pathname) ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</nav>

			{#if data.user && data.profile}
				<div class="border-t border-slate-700 p-3">
					{#if canParent}
						<div class="flex items-center gap-3 rounded-md p-2">
							<Avatar
								name={data.profile.full_name}
								email={data.profile.email}
								url={data.profile.avatar_url}
								size="md"
								ring={isMentor(data.profile)}
								ringClass="ring-sky-400"
							/>
							<div class="min-w-0 flex-1 leading-tight">
								<p class="truncate text-sm font-medium text-slate-100">
									{data.profile.full_name || data.profile.email}
								</p>
								<p class="truncate text-[11px] tracking-wider text-slate-500 uppercase">
									{roleLabel}
								</p>
							</div>
						</div>
					{:else}
						<a
							href="/profile"
							onclick={() => (mobileOpen = false)}
							class="flex touch-manipulation items-center gap-3 rounded-md p-2 hover:bg-slate-800"
						>
							<Avatar
								name={data.profile.full_name}
								email={data.profile.email}
								url={data.profile.avatar_url}
								size="md"
								ring={isMentor(data.profile)}
								ringClass="ring-sky-400"
							/>
							<div class="min-w-0 flex-1 leading-tight">
								<p class="truncate text-sm font-medium text-slate-100">
									{data.profile.full_name || data.profile.email}
								</p>
								<p class="truncate text-[11px] tracking-wider text-slate-500 uppercase">
									{roleLabel}
								</p>
							</div>
						</a>
					{/if}
					<form method="POST" action="/auth/signout" class="mt-2">
						<button
							type="submit"
							class="w-full rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
						>
							Sign out
						</button>
					</form>
				</div>
			{/if}
		</aside>

		<!-- Scrim on mobile -->
		{#if mobileOpen}
			<button
				class="fixed inset-0 z-30 bg-black/30 md:hidden"
				aria-label="Close navigation"
				onclick={() => (mobileOpen = false)}
			></button>
		{/if}

		<div class="flex min-h-dvh min-w-0 flex-1 flex-col md:min-h-0">
			<!-- Mobile top bar -->
			<header
				class="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3 md:hidden"
				style="background: var(--app-surface); border-color: var(--app-border); color: var(--app-text);"
			>
				<button
					type="button"
					class="rounded p-1 text-slate-300 hover:bg-slate-800"
					aria-label="Open navigation"
					onclick={() => (mobileOpen = true)}
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5"
						><path
							fill-rule="evenodd"
							d="M3.75 5.25a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75Zm0 4.75a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 0 1.5h-11a.75.75 0 0 1-.75-.75Zm.75 4a.75.75 0 0 0 0 1.5h11a.75.75 0 0 0 0-1.5h-11Z"
							clip-rule="evenodd"
						/></svg
					>
				</button>
				<p class="min-w-0 flex-1 truncate px-3 text-center text-sm font-semibold">
					Transfer · {data.orgName}
				</p>
				{#if data.profile}
					<a href={canParent ? '/dashboard' : '/profile'} class="shrink-0 touch-manipulation rounded p-0.5">
						<Avatar
							name={data.profile.full_name}
							email={data.profile.email}
							url={data.profile.avatar_url}
							size="sm"
						/>
					</a>
				{:else}
					<span class="w-8"></span>
				{/if}
			</header>
			{#if showInstallButton}
				<div class="border-b border-slate-800 bg-slate-900 px-4 py-2 md:hidden">
					<button
						type="button"
						onclick={handleInstallClick}
						class="w-full rounded-md border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 active:bg-sky-500/20"
					>
						Install app
					</button>
				</div>
			{/if}

			<main class="flex-1 bg-slate-950 px-6 py-8 md:min-h-0 md:overflow-y-auto md:px-10 md:py-10" style="background: var(--app-bg); color: var(--app-text);">
				<div class="mx-auto w-full max-w-6xl">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
{/if}
