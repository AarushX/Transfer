<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import NotificationsBell from '$lib/components/NotificationsBell.svelte';
	import SidebarIcons from '$lib/components/SidebarIcons.svelte';
	import {
		isAdmin,
		isMentor,
		isParentGuardian,
		canManageCourses,
		roleBadgeParts
	} from '$lib/roles';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	injectSpeedInsights();

	let { children, data } = $props();
	const canMentor = $derived(isMentor(data.profile));
	const canAdmin = $derived(isAdmin(data.profile));
	const canParent = $derived(isParentGuardian(data.profile));
	// Course studio is capability-gated (mentor / admin / subteam lead), not a /mentor route.
	const canCourseStudio = $derived(canManageCourses(data.profile));
	const roleLabel = $derived(roleBadgeParts(data.profile).join(' · '));

	let mobileOpen = $state(false);
	let installPromptEvent = $state<any>(null);
	let showInstallButton = $state(false);

	type NavItem = { href: string; label: string; icon: string; match?: (p: string) => boolean };

	const primary: NavItem[] = canParent
		? [
				{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
				{
					href: '/parent/volunteer',
					label: 'Volunteering',
					icon: 'heart',
					match: (p) => p.startsWith('/parent/volunteer') || p.startsWith('/parent/carpool')
				},
				{ href: '/media', label: 'Media', icon: 'image', match: (p) => p.startsWith('/media') }
			]
		: [
				{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
				{
					href: '/coursework',
					label: 'Coursework',
					icon: 'courses',
					match: (p: string) => p.startsWith('/coursework')
				},
				{
					href: '/graph',
					label: 'Skill map',
					icon: 'graph',
					match: (p: string) => p.startsWith('/graph')
				},
				{ href: '/scan', label: 'Scan', icon: 'scan', match: (p: string) => p.startsWith('/scan') },
				{
					href: '/lettering',
					label: 'Season',
					icon: 'award',
					match: (p: string) => p.startsWith('/lettering')
				},
				{
					href: '/media',
					label: 'Media',
					icon: 'image',
					match: (p: string) => p.startsWith('/media')
				}
			];

	const teamSection: NavItem[] = [];

	const subteamLinks: NavItem[] = (data.userSubteams ?? []).map(
		(s: { slug: string; name: string }) => ({
			href: `/team/${s.slug}`,
			label: s.name,
			icon: 'team',
			match: (p: string) => p === `/team/${s.slug}`
		})
	);

	const courseStudioNav: NavItem[] = [
		{
			href: '/courses',
			label: 'Course studio',
			icon: 'courses',
			match: (p) => p.startsWith('/courses')
		}
	];

	const mentorNav: NavItem[] = [
		{ href: '/mentor', label: 'Checkoffs', icon: 'checkoffs', match: (p) => p === '/mentor' },
		{
			href: '/mentor/machines',
			label: 'Machines',
			icon: 'machines',
			match: (p) => p.startsWith('/mentor/machines')
		},
		{ href: '/roster', label: 'Roster', icon: 'roster', match: (p) => p.startsWith('/roster') },
		{
			href: '/admin/volunteer',
			label: 'Volunteer verification',
			icon: 'shieldcheck',
			match: (p) => p.startsWith('/admin/volunteer')
		}
	];

	const adminNav: NavItem[] = [
		{ href: '/admin/settings', label: 'Settings', icon: 'settings' },
		{
			href: '/admin/settings/teams',
			label: 'Teams',
			icon: 'building',
			match: (p) => p.startsWith('/admin/settings/teams')
		},
		{ href: '/admin/attendance', label: 'Attendance', icon: 'calendar' },
		{
			href: '/admin/course-veterans',
			label: 'Course veterans',
			icon: 'courses',
			match: (p) => p.startsWith('/admin/course-veterans')
		},
		{
			href: '/admin/lettering',
			label: 'Lettering rules',
			icon: 'award',
			match: (p) => p.startsWith('/admin/lettering')
		}
	];

	const isActive = (item: NavItem, p: string) => (item.match ? item.match(p) : p === item.href);
	const isAttendanceKiosk = $derived(page.url.pathname === '/attendance');
	const isLoggedOut = $derived(!data.user);
	const isLoginPage = $derived(page.url.pathname === '/login');
	// Users mid-onboarding can't navigate anywhere else (hooks.server.ts redirects
	// them back), so hide the sidebar entirely until onboarding completes.
	const onboardingFocus = $derived(
		Boolean(data.user) && !canParent && Boolean(data.needsOnboarding)
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
	<meta name="theme-color" content="#f4f6f3" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
	<link
		href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if isAttendanceKiosk || isLoggedOut || isLoginPage}
	<main
		class="flex min-h-dvh items-center justify-center"
		style="background: var(--app-bg); color: var(--app-text);"
	>
		{@render children()}
	</main>
{:else if onboardingFocus}
	<div
		class="mesh-bg flex min-h-dvh flex-col"
		style="background: var(--app-bg); color: var(--app-text);"
	>
		<header
			class="relative z-[1] flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl md:px-8"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text);"
		>
			<div class="flex min-w-0 items-center gap-2.5">
				{#if data.orgIconDataUrl}
					<img src={data.orgIconDataUrl} alt="" class="h-6 w-6 rounded" />
				{:else}
					<div class="h-6 w-6 rounded" style="background: var(--app-accent);"></div>
				{/if}
				<div class="min-w-0 leading-tight">
					<p
						class="text-[9px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
						Transfer
					</p>
					<p class="truncate text-[13px] font-semibold" style="color: var(--app-text);">
						{data.orgName}
					</p>
				</div>
			</div>
			<div class="flex shrink-0 items-center gap-3">
				{#if data.profile}
					<Avatar
						name={data.profile.full_name}
						email={data.profile.email}
						url={data.profile.avatar_url}
						size="sm"
					/>
				{/if}
				<form method="POST" action="/auth/signout">
					<button
						type="submit"
						class="rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
						style="border-color: var(--app-glass-border); color: var(--app-text-muted); background: transparent;"
						onmouseenter={(e) => {
							e.currentTarget.style.background = 'var(--app-glass-bg-hover)';
						}}
						onmouseleave={(e) => {
							e.currentTarget.style.background = 'transparent';
						}}
					>
						Sign out
					</button>
				</form>
			</div>
		</header>
		<main class="relative z-[1] flex-1 px-6 py-8 md:px-10 md:py-10" style="color: var(--app-text);">
			<div class="mx-auto w-full max-w-4xl">
				{@render children()}
			</div>
		</main>
	</div>
{:else}
	<div
		class="mesh-bg flex min-h-dvh md:h-screen md:overflow-hidden"
		style="background: var(--app-bg); color: var(--app-text);"
	>
		<!-- Sidebar -->
		<aside
			class={`sidebar-glass fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r pb-[env(safe-area-inset-bottom)] transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:pb-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
		>
			<!-- Workspace header -->
			<a
				href="/dashboard"
				class="flex items-center gap-2.5 border-b px-4 py-4"
				style="border-color: var(--app-glass-border);"
			>
				{#if data.orgIconDataUrl}
					<img src={data.orgIconDataUrl} alt="" class="h-6 w-6 rounded" />
				{:else}
					<div class="h-6 w-6 rounded" style="background: var(--app-accent);"></div>
				{/if}
				<div class="min-w-0 flex-1 leading-tight">
					<p
						class="text-[9px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
						Transfer
					</p>
					<p class="truncate text-[13px] font-semibold" style="color: var(--app-text);">
						{data.orgName}
					</p>
				</div>
				<button
					type="button"
					class="nav-btn ml-auto shrink-0 rounded p-1 md:hidden"
					style="color: var(--app-text-muted);"
					aria-label="Close navigation"
					onclick={(e) => {
						e.preventDefault();
						mobileOpen = false;
					}}
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5"
						><path
							fill-rule="evenodd"
							d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 1 0-1.06-1.06L10 8.94 5.28 4.22Z"
							clip-rule="evenodd"
						/></svg
					>
				</button>
			</a>

			<nav class="flex-1 overflow-y-auto px-2 py-3 text-sm">
				{#snippet navRow(item: NavItem, opts: { badge?: number } = {})}
					<a
						href={item.href}
						onclick={() => (mobileOpen = false)}
						class="nav-link group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
						style={isActive(item, page.url.pathname)
							? `background: linear-gradient(90deg, color-mix(in srgb, var(--app-accent) 35%, transparent), color-mix(in srgb, var(--app-accent) 20%, transparent)); color: var(--app-text);`
							: `color: var(--app-text-muted);`}
					>
						<SidebarIcons name={item.icon as any} />
						<span class="truncate">{item.label}</span>
						{#if opts.badge && opts.badge > 0}
							<span
								data-role="queue-badge"
								class="ml-auto rounded-md px-1.5 py-0 text-[10px] font-semibold"
								style="background: color-mix(in srgb, var(--app-accent) 25%, transparent); color: var(--app-accent);"
								>{opts.badge}</span
							>
						{/if}
					</a>
				{/snippet}

				{#snippet sectionLabel(label: string, pill: string = '')}
					<div class="relative mx-1 mt-4 mb-1.5 pt-2">
						<div
							class="absolute inset-x-2 top-0 h-px"
							style="background: linear-gradient(90deg, transparent, var(--app-glass-border), transparent);"
						></div>
						<div class="flex items-center gap-1.5 px-2">
							<p class="text-[11px] font-semibold" style="color: var(--app-text-muted);">{label}</p>
							{#if pill}
								<span
									class="rounded-md px-1.5 py-0 text-[9px] font-semibold tracking-wider uppercase"
									style="background: var(--app-glass-bg); color: var(--app-text-muted); border: 1px solid var(--app-glass-border);"
									>{pill}</span
								>
							{/if}
						</div>
					</div>
				{/snippet}

				<ul class="space-y-0.5">
					{#each primary as item (item.href)}
						<li>{@render navRow(item)}</li>
					{/each}
				</ul>

				{#if !canParent && data.primaryTeamName}
					{@render sectionLabel('Subteams', data.primaryTeamName)}
					<ul class="space-y-0.5">
						{#each teamSection as item (item.href)}
							<li>{@render navRow(item)}</li>
						{/each}
						{#each subteamLinks as item (item.href)}
							<li>{@render navRow(item)}</li>
						{/each}
					</ul>
				{/if}

				{#if canCourseStudio}
					{@render sectionLabel('Courses')}
					<ul class="space-y-0.5">
						{#each courseStudioNav as item (item.href)}
							<li>{@render navRow(item)}</li>
						{/each}
					</ul>
				{/if}

				{#if canMentor}
					{@render sectionLabel('Mentor')}
					<ul class="space-y-0.5">
						{#each mentorNav as item (item.href)}
							<li>
								{@render navRow(item, {
									badge: item.label === 'Checkoffs' ? (data.mentorQueueCount ?? 0) : 0
								})}
							</li>
						{/each}
					</ul>
				{/if}

				{#if canAdmin}
					{@render sectionLabel('Admin')}
					<ul class="space-y-0.5">
						{#each adminNav as item (item.href)}
							<li>{@render navRow(item)}</li>
						{/each}
					</ul>
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
								<p
									class="truncate text-[11px] tracking-wider uppercase"
									style="color: var(--app-text-muted);"
								>
									{roleLabel}
								</p>
							</div>
						</div>
					{:else}
						<div class="flex items-center gap-1">
							<a
								href="/profile"
								onclick={() => (mobileOpen = false)}
								class="nav-btn flex min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-lg p-2"
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
									<p
										class="truncate text-[11px] tracking-wider uppercase"
										style="color: var(--app-text-muted);"
									>
										{roleLabel}
									</p>
								</div>
							</a>
							<NotificationsBell
								userId={data.user.id}
								initialUnread={data.unreadNotificationCount ?? 0}
								align="right"
								drop="up"
							/>
						</div>
					{/if}
					<form method="POST" action="/auth/signout" class="mt-2">
						<button
							type="submit"
							class="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
							style="border-color: var(--app-glass-border); color: var(--app-text-muted); background: transparent;"
							onmouseenter={(e) => {
								e.currentTarget.style.background = 'var(--app-glass-bg-hover)';
							}}
							onmouseleave={(e) => {
								e.currentTarget.style.background = 'transparent';
							}}
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
				<p
					class="min-w-0 flex-1 truncate px-3 text-center text-sm font-semibold"
					style="color: var(--app-text);"
				>
					Transfer · {data.orgName}
				</p>
				{#if data.profile}
					<div class="flex shrink-0 items-center gap-2">
						{#if data.user && !canParent}
							<NotificationsBell
								userId={data.user.id}
								initialUnread={data.unreadNotificationCount ?? 0}
								align="right"
							/>
						{/if}
						<a
							href={canParent ? '/dashboard' : '/profile'}
							class="shrink-0 touch-manipulation rounded p-0.5"
						>
							<Avatar
								name={data.profile.full_name}
								email={data.profile.email}
								url={data.profile.avatar_url}
								size="sm"
							/>
						</a>
					</div>
				{:else}
					<span class="w-8"></span>
				{/if}
			</header>
			{#if showInstallButton}
				<div
					class="border-b px-4 py-2 md:hidden"
					style="border-color: var(--app-glass-border); background: var(--app-glass-bg);"
				>
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

			<main
				class="relative z-[1] flex-1 px-6 py-8 md:min-h-0 md:overflow-y-auto md:px-10 md:py-10"
				style="color: var(--app-text);"
			>
				<div class="mx-auto w-full max-w-6xl">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
{/if}

<style>
	.sidebar-glass {
		background: var(--app-surface);
		border-color: var(--app-border);
		color: var(--app-text);
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
