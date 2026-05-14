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
	type NavGroup = { label: string; items: NavItem[] };

	const memberPrimary: NavItem[] = [
		...(data.needsOnboarding
			? [{ href: '/onboarding', label: 'Onboarding', match: (p: string) => p.startsWith('/onboarding') }]
			: []),
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/clickup', label: 'ClickUp', match: (p) => p.startsWith('/clickup') },
		{ href: '/scan', label: 'Scan', match: (p) => p.startsWith('/scan') }
	];
	const teamSection: NavItem[] = [
		{ href: '/team', label: 'Team Page', match: (p) => p === '/team' || p.startsWith('/team/') && !p.startsWith('/team/manage') }
	];
	const leadSection: NavItem[] = (data.leadTeamName || data.leadSubteamName)
		? [{ href: '/team/manage', label: 'Manage Pages', match: (p) => p.startsWith('/team/manage') }]
		: [];
	const parentPrimary: NavItem[] = [
		{ href: '/parent/dashboard', label: 'Dashboard', match: (p) => p.startsWith('/parent/dashboard') || p === '/parent' || p === '/parent/course' },
		{ href: '/parent/volunteer', label: 'Volunteering', match: (p) => p.startsWith('/parent/volunteer') || p.startsWith('/parent/carpool') }
	];
	const primary: NavItem[] = canParent ? parentPrimary : memberPrimary;

	const mentorNav: NavGroup[] = [
		{
			label: 'Queue',
			items: [
				{ href: '/mentor', label: 'Checkoffs', match: (p) => p === '/mentor' },
				{ href: '/admin/volunteer', label: 'Volunteer verification', match: (p) => p.startsWith('/admin/volunteer') }
			]
		},
		{
			label: 'Manage',
			items: [
				{ href: '/mentor/courses', label: 'Courses', match: (p) => p.startsWith('/mentor/courses') },
				{ href: '/mentor/surveys', label: 'Surveys', match: (p) => p.startsWith('/mentor/surveys') },
				{ href: '/mentor/forms', label: 'Forms', match: (p) => p.startsWith('/mentor/forms') },
				{ href: '/mentor/carpool', label: 'Carpool', match: (p) => p.startsWith('/mentor/carpool') },
				{ href: '/mentor/machines', label: 'Machines', match: (p) => p.startsWith('/mentor/machines') }
			]
		},
		{
			label: 'Roster',
			items: [
				{ href: '/roster', label: 'Roster', match: (p) => p.startsWith('/roster') }
			]
		}
	];

	const adminNav: NavGroup[] = [
		{
			label: 'Workspace',
			items: [
				{ href: '/admin/settings', label: 'Settings' },
				{ href: '/admin/settings/teams', label: 'Teams', match: (p) => p.startsWith('/admin/settings/teams') },
				{ href: '/admin/content', label: 'Content' },
				{ href: '/admin/audit', label: 'Audit log' }
			]
		},
		{
			label: 'People',
			items: [
				{ href: '/admin/users', label: 'Users & leads', match: (p) => p.startsWith('/admin/users') },
				{ href: '/admin/parents', label: 'Parent approvals', match: (p) => p.startsWith('/admin/parents') },
				{ href: '/admin/attendance', label: 'Attendance' }
			]
		},
		{
			label: 'Season',
			items: [
				{ href: '/admin/volunteer', label: 'Volunteering', match: (p) => p.startsWith('/admin/volunteer') },
				{ href: '/admin/lettering', label: 'Lettering rules', match: (p) => p.startsWith('/admin/lettering') }
			]
		}
	];

	const isActive = (item: NavItem, p: string) => (item.match ? item.match(p) : p === item.href);
	const isAttendanceKiosk = $derived(page.url.pathname === '/attendance');
	const isLoggedOut = $derived(!data.user);
	const isLoginPage = $derived(page.url.pathname === '/login');
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

{#if isAttendanceKiosk || isLoggedOut || isLoginPage}
	<main class="flex min-h-dvh items-center justify-center" style="{themeVars} background: var(--app-bg); color: var(--app-text);">
		{@render children()}
	</main>
{:else}
	<div
		class="mesh-bg flex min-h-dvh md:h-screen md:overflow-hidden"
		style={`${themeVars} background: var(--app-bg); color: var(--app-text);`}
	>
		<!-- Sidebar -->
		<aside
			class={`sidebar-glass fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r pb-[env(safe-area-inset-bottom)] transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:pb-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
		>
			<div class="flex items-center justify-between border-b px-5 py-5" style="border-color: var(--app-glass-border);">
				<a href="/dashboard" class="block leading-tight">
					<p class="text-[11px] font-medium tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">Transfer</p>
					<p class="mt-0.5 text-sm font-semibold" style="color: var(--app-text);">{data.orgName}</p>
				</a>
				<button
					type="button"
					class="nav-btn rounded p-1 md:hidden"
					style="color: var(--app-text-muted);"
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
				<ul class="space-y-0.5">
					{#each primary as item (item.href)}
						<li>
							<a
								href={item.href}
								onclick={() => (mobileOpen = false)}
								class="nav-link flex items-center gap-2 rounded-lg px-2.5 py-1.5"
								style={
									item.href === '/onboarding'
										? isActive(item, page.url.pathname)
											? `background: var(--app-accent); color: var(--app-accent-text);`
											: `background: color-mix(in srgb, var(--app-accent) 22%, transparent); color: color-mix(in srgb, var(--app-accent) 55%, white);`
										: isActive(item, page.url.pathname)
											? `background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);`
											: `color: var(--app-text-muted);`
								}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>

				{#if !canParent && data.primaryTeamName}
					<p class="mt-6 px-2 pb-1 text-[10px] font-medium tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
						{data.primaryTeamName}
					</p>
					<ul class="space-y-0.5">
						{#each teamSection as item (item.href)}
							<li>
								<a
									href={item.href}
									onclick={() => (mobileOpen = false)}
									class="nav-link flex items-center gap-2 rounded-lg px-2.5 py-1.5"
									style={isActive(item, page.url.pathname)
										? `background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);`
										: `color: var(--app-text-muted);`}
								>
									{item.label}
								</a>
							</li>
						{/each}
						{#each leadSection as item (item.href)}
							<li>
								<a
									href={item.href}
									onclick={() => (mobileOpen = false)}
									class="nav-link flex items-center gap-2 rounded-lg px-2.5 py-1.5"
									style={isActive(item, page.url.pathname)
										? `background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);`
										: `color: var(--app-text-muted);`}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				{/if}

				{#if canMentor}
					<p class="mt-6 px-2 pb-1 text-[10px] font-medium tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
						Mentor
					</p>
					{#each mentorNav as group (group.label)}
						<p class="mt-2 px-2 pb-1 text-[9px] font-medium tracking-[0.14em] uppercase" style="color: color-mix(in srgb, var(--app-text-dim) 80%, transparent);">{group.label}</p>
						<ul class="space-y-0.5">
							{#each group.items as item (item.href)}
								<li>
									<a
										href={item.href}
										onclick={() => (mobileOpen = false)}
										class="nav-link flex items-center gap-2 rounded-lg px-2.5 py-1.5"
										style={isActive(item, page.url.pathname)
											? `background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);`
											: `color: var(--app-text-muted);`}
									>
										{item.label}
									</a>
								</li>
							{/each}
						</ul>
					{/each}
				{/if}

				{#if canAdmin}
					<p class="mt-6 px-2 pb-1 text-[10px] font-medium tracking-[0.18em] uppercase" style="color: var(--app-text-muted);">
						Admin
					</p>
					{#each adminNav as group (group.label)}
						<p class="mt-2 px-2 pb-1 text-[9px] font-medium tracking-[0.14em] uppercase" style="color: color-mix(in srgb, var(--app-text-dim) 80%, transparent);">{group.label}</p>
						<ul class="space-y-0.5">
							{#each group.items as item (item.href)}
								<li>
									<a
										href={item.href}
										onclick={() => (mobileOpen = false)}
										class="nav-link flex items-center gap-2 rounded-lg px-2.5 py-1.5"
										style={isActive(item, page.url.pathname)
											? `background: color-mix(in srgb, var(--app-accent) 18%, transparent); color: var(--app-text);`
											: `color: var(--app-text-muted);`}
									>
										{item.label}
									</a>
								</li>
							{/each}
						</ul>
					{/each}
				{/if}
			</nav>

			{#if data.user && data.profile}
				<div class="border-t p-3" style="border-color: var(--app-glass-border);">
					{#if canParent}
						<div class="flex items-center gap-3 rounded-lg p-2">
							<Avatar
								name={data.profile.full_name}
								email={data.profile.email}
								url={data.profile.avatar_url}
								size="md"
								ring={isMentor(data.profile)}
								ringClass="ring-sky-400"
							/>
							<div class="min-w-0 flex-1 leading-tight">
								<p class="truncate text-sm font-medium" style="color: var(--app-text);">
									{data.profile.full_name || data.profile.email}
								</p>
								<p class="truncate text-[11px] tracking-wider uppercase" style="color: var(--app-text-muted);">
									{roleLabel}
								</p>
							</div>
						</div>
					{:else}
						<a
							href="/profile"
							onclick={() => (mobileOpen = false)}
							class="nav-btn flex touch-manipulation items-center gap-3 rounded-lg p-2"
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
								<p class="truncate text-sm font-medium" style="color: var(--app-text);">
									{data.profile.full_name || data.profile.email}
								</p>
								<p class="truncate text-[11px] tracking-wider uppercase" style="color: var(--app-text-muted);">
									{roleLabel}
								</p>
							</div>
						</a>
					{/if}
					<form method="POST" action="/auth/signout" class="mt-2">
						<button
							type="submit"
							class="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
							style="border-color: var(--app-glass-border); color: var(--app-text-muted); background: transparent;"
							onmouseenter={(e) => { e.currentTarget.style.background = 'var(--app-glass-bg-hover)'; }}
							onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; }}
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
				class="fixed inset-0 z-30 backdrop-blur-sm md:hidden"
				style="background: color-mix(in srgb, var(--app-overlay-scrim) 40%, transparent);"
				aria-label="Close navigation"
				onclick={() => (mobileOpen = false)}
			></button>
		{/if}

		<div class="flex min-h-dvh min-w-0 flex-1 flex-col md:min-h-0">
			<!-- Mobile top bar -->
			<header
				class="flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl md:hidden"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
			>
				<button
					type="button"
					class="nav-btn rounded p-1"
					style="color: var(--app-text-muted);"
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
				<p class="min-w-0 flex-1 truncate px-3 text-center text-sm font-semibold" style="color: var(--app-text);">
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
				<div class="border-b px-4 py-2 md:hidden" style="border-color: var(--app-glass-border); background: var(--app-glass-bg);">
					<button
						type="button"
						onclick={handleInstallClick}
						class="w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
						style="border-color: color-mix(in srgb, var(--app-info) 40%, transparent); background: color-mix(in srgb, var(--app-info) 10%, transparent); color: color-mix(in srgb, var(--app-info) 60%, white);"
					>
						Install app
					</button>
				</div>
			{/if}

			<main class="relative z-[1] flex-1 px-6 py-8 md:min-h-0 md:overflow-y-auto md:px-10 md:py-10" style="color: var(--app-text);">
				<div class="mx-auto w-full max-w-6xl">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
{/if}

<style>
	.sidebar-glass {
		background: var(--app-glass-bg);
		border-color: var(--app-glass-border);
		color: var(--app-text);
		backdrop-filter: blur(24px) saturate(1.4);
		-webkit-backdrop-filter: blur(24px) saturate(1.4);
	}
	.nav-link {
		transition: all 0.15s ease;
	}
	.nav-link:hover {
		background: var(--app-glass-bg-hover) !important;
		color: var(--app-text) !important;
	}
	.nav-btn {
		transition: background 0.15s ease;
	}
	.nav-btn:hover {
		background: var(--app-glass-bg-hover);
	}
</style>
