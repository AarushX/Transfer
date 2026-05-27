# Portal UI redesign — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the seven phases of the portal UI redesign — modern sidebar, useful universal dashboard, unified `/roster`, mentor Courses with live mini-graph, student-facing `/courses/map`, and redesigned team/subteam pages with donut + status tinting + mini-graph.

**Architecture:** Pure frontend + server-load refactor on top of the existing SvelteKit 2 + Svelte 5 (runes) + Supabase stack. No data-model changes; one new RPC for course-completion aggregates, one new TS helper for lettering progress. Each phase is an independent commit/PR boundary.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind 4, Supabase (RLS-aware), Vitest (unit), Playwright (e2e), Vercel deploy. Tests live in `src/**/*.{test,spec}.ts` for unit and `tests/**/*.e2e.ts` for e2e. `npm run check` runs `svelte-check`.

**Test note:** Vitest config requires `expect.requireAssertions: true`. Every test must assert. For pure visual changes where there is no logic, prefer `npm run check` (typecheck) + a small Playwright assertion (selector exists / no console errors) over fabricating logic tests.

**Reference spec:** `docs/superpowers/specs/2026-05-15-portal-ui-redesign-design.md`

---

## File structure overview

New files:

- `src/lib/server/lettering-progress.ts` — server-side helper returning `{ pct, completedCount, totalRequired, overflow }` for a user.
- `src/lib/server/course-aggregates.ts` — server-side helper that wraps the new `course_completion_aggregate` RPC.
- `supabase/migrations/202605150900_course_completion_aggregate.sql` — new RPC migration.
- `src/lib/components/SidebarIcons.svelte` — single home for the 16 inline-SVG icons used in the sidebar.
- `src/lib/components/StatusDonut.svelte` — SVG segmented donut for team/subteam progress.
- `src/lib/components/MiniSkillTree.svelte` — thin wrapper around `SkillTree.svelte` that accepts a scope prop.
- `src/lib/components/dashboard/StatusRail.svelte` — right-rail column (QR + Hours + Lettering).
- `src/lib/components/dashboard/AnnouncementsCard.svelte` — team/subteam notes feed.
- `src/lib/components/dashboard/UpNextStrip.svelte` — horizontal course strip.
- `src/lib/components/dashboard/ParentBlock.svelte` — parent-only volunteer/linked-students content.
- `src/routes/courses/map/+page.server.ts` and `+page.svelte` — new student-facing full-page graph.
- `src/routes/admin/users/+server.ts` — 302 redirect handler.
- `src/routes/teams/+server.ts` — 302 redirect handler.

Modified files:

- `src/routes/+layout.svelte` — sidebar rewrite.
- `src/routes/+layout.server.ts` — adds `mentorQueueCount` to the layout data.
- `src/routes/roster/+page.svelte` + `+page.server.ts` — absorbs admin/users functionality.
- `src/routes/profile/+page.svelte` + `+page.server.ts` — absorbs `/teams` content.
- `src/routes/team/+page.svelte` + `+page.server.ts` — donut, mini-graph, status tinting.
- `src/routes/team/[subteam]/+page.svelte` + `+page.server.ts` — donut, mini-graph, status tinting.
- `src/routes/mentor/courses/+page.svelte` + `+page.server.ts` — two-panel layout, aggregate completion.
- `src/routes/dashboard/+page.svelte` + `+page.server.ts` — universal role-adaptive layout.
- `src/routes/parent/dashboard/+page.svelte` — 302 redirect to `/dashboard`.
- `src/lib/components/SkillTree.svelte` — add optional `scope` prop.

Deleted files:

- `src/routes/admin/users/+page.svelte` and `+page.server.ts` (replaced by 302 redirect via `+server.ts`).
- `src/routes/teams/+page.svelte` and `+page.server.ts` (replaced by 302 redirect via `+server.ts`).

---

## Conventions used by every task

**TDD pattern for server logic** (helpers, server actions, RPC wrappers):

1. Write a Vitest spec under the same folder as the implementation (`src/lib/server/foo.spec.ts`).
2. Run `npm run test:unit -- src/lib/server/foo.spec.ts` and confirm it fails.
3. Implement the minimum to pass.
4. Run again and confirm it passes.
5. Commit.

**TDD pattern for routes / UI** (where logic-as-test is hollow):

1. Write a Playwright e2e under `tests/<phase>.e2e.ts` asserting the user-visible behavior.
2. `npm run test:e2e -- tests/<phase>.e2e.ts` and confirm it fails (route returns the OLD UI / 404 / missing selector).
3. Implement.
4. `npm run test:e2e -- tests/<phase>.e2e.ts` and confirm it passes.
5. `npm run check` to typecheck.
6. Commit.

**Mocked Supabase in unit tests** — use the existing pattern: a hand-rolled object with `from(...).select(...).eq(...)` chain returning a resolved promise. No new mocking library.

**Commit messages** — Conventional Commits style (`feat:`, `refactor:`, `chore:`). Each phase ends with one merge-ready commit. Subtasks within a phase may produce intermediate commits if the change is large enough to be reviewed independently.

---

# Phase 1 — Sidebar redesign

**PR boundary:** ships independently. No data changes. Visual + small layout-server addition.

**Files:**

- Create: `src/lib/components/SidebarIcons.svelte`
- Modify: `src/routes/+layout.svelte` (replace sidebar markup)
- Modify: `src/routes/+layout.server.ts` (add `mentorQueueCount` to returned data)
- Test: `tests/sidebar.e2e.ts`

## Task 1.1: Add mentor queue count to layout server load

- [ ] **Step 1: Write the failing unit test** — `src/lib/server/sidebar-data.spec.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { computeMentorQueueCount } from './sidebar-data';

describe('computeMentorQueueCount', () => {
	it('returns 0 for non-mentors', async () => {
		const supabase = { from: vi.fn() };
		const profile = { is_mentor: false };
		expect(await computeMentorQueueCount(supabase as any, 'u1', profile as any)).toBe(0);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns the count from the mentor_checkoff_reviews table for mentors', async () => {
		const supabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				then: undefined
				// resolves to a count
			})
		};
		// Build a chained promise stub
		const queueQuery = {
			select: vi.fn().mockReturnThis(),
			in: vi.fn().mockResolvedValue({ count: 4, data: null, error: null })
		};
		supabase.from = vi.fn().mockReturnValue(queueQuery) as any;
		const profile = { is_mentor: true };
		expect(await computeMentorQueueCount(supabase as any, 'u1', profile as any)).toBe(4);
		expect(supabase.from).toHaveBeenCalledWith('checkoff_reviews');
	});
});
```

- [ ] **Step 2: Confirm fail**

```bash
npm run test:unit -- src/lib/server/sidebar-data.spec.ts
```

Expected: module-not-found error.

- [ ] **Step 3: Implement** — `src/lib/server/sidebar-data.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { isMentor } from '$lib/roles';

export async function computeMentorQueueCount(
	supabase: SupabaseClient,
	userId: string,
	profile: { is_mentor?: boolean; role?: string | null; base_role?: string | null } | null
): Promise<number> {
	if (!profile || !isMentor(profile)) return 0;
	const { count, error } = await supabase
		.from('checkoff_reviews')
		.select('id', { count: 'exact', head: true })
		.in('status', ['needs_review', 'pending']);
	if (error) return 0;
	return count ?? 0;
}
```

**Note:** the exact table/column names depend on the existing mentor-queue source. Before merging, verify against `src/routes/mentor/+page.server.ts` and adjust the table/column names in this helper. Update the test to match.

- [ ] **Step 4: Confirm pass**

```bash
npm run test:unit -- src/lib/server/sidebar-data.spec.ts
```

- [ ] **Step 5: Wire into `+layout.server.ts`** — modify the existing `load` function. Add after line 190 (just before `return`):

```ts
let mentorQueueCount = 0;
if (user && profile) {
	const { computeMentorQueueCount } = await import('$lib/server/sidebar-data');
	mentorQueueCount = await computeMentorQueueCount(locals.supabase, user.id, profile);
}
```

And add `mentorQueueCount` to the returned object.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/sidebar-data.ts src/lib/server/sidebar-data.spec.ts src/routes/+layout.server.ts
git commit -m "feat(sidebar): surface mentor queue count to layout"
```

## Task 1.2: Create SidebarIcons component

- [ ] **Step 1: Create the file** — `src/lib/components/SidebarIcons.svelte`

```svelte
<script lang="ts">
	type IconName =
		| 'dashboard'
		| 'clickup'
		| 'scan'
		| 'team'
		| 'checkoffs'
		| 'courses'
		| 'machines'
		| 'roster'
		| 'shieldcheck'
		| 'settings'
		| 'building'
		| 'file'
		| 'list'
		| 'calendar'
		| 'heart'
		| 'award';
	let { name, class: className = 'h-3.5 w-3.5' }: { name: IconName; class?: string } = $props();
</script>

{#if name === 'dashboard'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<rect x="3" y="3" width="7" height="7" rx="1.5" /><rect
			x="14"
			y="3"
			width="7"
			height="7"
			rx="1.5"
		/>
		<rect x="3" y="14" width="7" height="7" rx="1.5" /><rect
			x="14"
			y="14"
			width="7"
			height="7"
			rx="1.5"
		/>
	</svg>
{:else if name === 'clickup'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path d="M9 11l3 3L22 4" /><path
			d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
		/>
	</svg>
{:else if name === 'scan'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<rect x="3" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
		<line x1="14" y1="3" x2="21" y2="3" /><line x1="14" y1="7" x2="21" y2="7" />
		<line x1="3" y1="14" x2="10" y2="14" />
	</svg>
{:else if name === 'team'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
{:else if name === 'checkoffs'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<polyline points="9 11 12 14 22 4" /><path
			d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
		/>
	</svg>
{:else if name === 'courses'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
	</svg>
{:else if name === 'machines'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<circle cx="12" cy="12" r="3" /><path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
		/>
	</svg>
{:else if name === 'roster'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
	</svg>
{:else if name === 'shieldcheck'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 11 11 13 15 9" />
	</svg>
{:else if name === 'settings'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
		<line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
		<line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
		<line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line
			x1="17"
			y1="16"
			x2="23"
			y2="16"
		/>
	</svg>
{:else if name === 'building'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
	</svg>
{:else if name === 'file'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline
			points="14 2 14 8 20 8"
		/>
	</svg>
{:else if name === 'list'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line
			x1="8"
			y1="18"
			x2="21"
			y2="18"
		/>
		<line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line
			x1="3"
			y1="18"
			x2="3.01"
			y2="18"
		/>
	</svg>
{:else if name === 'calendar'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
		<line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline
			points="9 15 11 17 15 13"
		/>
	</svg>
{:else if name === 'heart'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<path
			d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
		/>
	</svg>
{:else if name === 'award'}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class={className}
	>
		<circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
	</svg>
{/if}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run check
```

Expected: no errors. (No runtime test — this is a pure SVG library file.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/SidebarIcons.svelte
git commit -m "feat(sidebar): add unified icon library"
```

## Task 1.3: Rewrite sidebar markup in +layout.svelte

- [ ] **Step 1: Write the failing e2e** — `tests/sidebar.e2e.ts`

```ts
import { test, expect } from '@playwright/test';

// Assumes a seeded admin user. The mvp-flow.e2e.ts shows the existing
// login pattern — re-use whatever helper that file establishes.
test.describe('redesigned sidebar', () => {
	test('renders icon+label rows for primary nav', async ({ page }) => {
		await page.goto('/login');
		// <re-use existing test login flow here>
		await page.goto('/dashboard');

		const sidebar = page.locator('aside');
		await expect(sidebar.getByRole('link', { name: /Dashboard/ })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: /ClickUp/ })).toBeVisible();
		await expect(sidebar.getByRole('link', { name: /Scan/ })).toBeVisible();
		// Each nav row should contain an svg icon
		await expect(sidebar.locator('a[href="/dashboard"] svg')).toBeVisible();
	});

	test('shows checkoff badge when mentor queue > 0', async ({ page }) => {
		// requires a mentor with at least 1 checkoff in needs_review status
		await page.goto('/dashboard');
		const badge = page.locator('aside a[href="/mentor"] [data-role="queue-badge"]');
		// either visible with text > 0 OR not visible (when queue is 0) — narrow your test fixture
		const count = await badge.count();
		if (count > 0) {
			const text = await badge.first().textContent();
			expect(Number(text)).toBeGreaterThan(0);
		} else {
			expect(count).toBe(0);
		}
	});
});
```

- [ ] **Step 2: Confirm fail** — `npm run test:e2e -- tests/sidebar.e2e.ts` should fail because the badge selector `[data-role="queue-badge"]` doesn't exist yet.

- [ ] **Step 3: Replace the sidebar `<aside>` block in `src/routes/+layout.svelte`** — lines ~188–384.

Replace the entire `<aside>...</aside>` with the structure below. Keep the existing footer (avatar / sign-out) — just update its surrounding styles.

```svelte
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
			<div
				class="h-6 w-6 rounded"
				style="background: linear-gradient(135deg, var(--app-info), var(--app-accent));"
			></div>
		{/if}
		<div class="leading-tight">
			<p
				class="text-[9px] font-bold tracking-[0.18em] uppercase"
				style="color: var(--app-text-muted);"
			>
				Transfer
			</p>
			<p class="text-[13px] font-semibold" style="color: var(--app-text);">{data.orgName}</p>
		</div>
		<button
			type="button"
			class="nav-btn ml-auto rounded p-1 md:hidden"
			style="color: var(--app-text-muted);"
			aria-label="Close navigation"
			onclick={() => (mobileOpen = false)}
		>
			<!-- existing X icon -->
		</button>
	</a>

	<nav class="flex-1 overflow-y-auto px-2 py-3 text-sm">
		{#snippet navRow(item, opts = {})}
			<a
				href={item.href}
				onclick={() => (mobileOpen = false)}
				class="nav-link group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
				style={isActive(item, page.url.pathname)
					? `background: linear-gradient(90deg, color-mix(in srgb, var(--app-accent) 35%, transparent), color-mix(in srgb, var(--app-accent) 20%, transparent)); color: var(--app-text);`
					: `color: var(--app-text-muted);`}
			>
				<SidebarIcons name={item.icon} />
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

		{#snippet sectionLabel(label, pill = '')}
			<div class="relative mx-1 mt-4 mb-1.5 pt-2">
				<div
					class="absolute inset-x-2 top-0 h-px"
					style="background: linear-gradient(90deg, transparent, var(--app-glass-border), transparent);"
				></div>
				<div class="flex items-center gap-1.5 px-2">
					<p
						class="text-[11px] font-semibold"
						style="color: color-mix(in srgb, var(--app-text-muted) 100%, transparent);"
					>
						{label}
					</p>
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
			{@render sectionLabel(data.primaryTeamName)}
			<ul class="space-y-0.5">
				{#each teamSection as item (item.href)}
					<li>{@render navRow(item)}</li>
				{/each}
				{#each subteamLinks as item (item.href)}
					<li>
						<a
							href={item.href}
							onclick={() => (mobileOpen = false)}
							class="nav-link flex items-center gap-2 rounded-lg py-1 pr-2.5 pl-9 text-xs"
							style={isActive(item, page.url.pathname)
								? `background: color-mix(in srgb, var(--app-accent) 14%, transparent); color: var(--app-text);`
								: `color: var(--app-text-muted);`}
						>
							<span style="opacity:.5;">·</span>
							<span class="truncate">{item.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if canMentor}
			{@render sectionLabel('Mentor')}
			<ul class="space-y-0.5">
				{#each mentorNav as item (item.href)}
					<li>
						{@render navRow(item, {
							badge: item.label === 'Checkoffs' ? data.mentorQueueCount : 0
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

	<!-- Existing footer block stays as-is -->
	...footer block from original file...
</aside>
```

- [ ] **Step 4: Update the `mentorNav` and `adminNav` and `primary` / `teamSection` data structures** in the `<script>` block of `+layout.svelte` to include `icon` and to flatten admin/mentor groups (no more sub-grouping; merge all items into one list per section).

Replace the existing `mentorNav: NavGroup[]` and `adminNav: NavGroup[]` declarations with:

```ts
type NavItem = { href: string; label: string; icon: string; match?: (p: string) => boolean };

const primary: NavItem[] = canParent
	? [
			{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
			{
				href: '/parent/volunteer',
				label: 'Volunteering',
				icon: 'heart',
				match: (p) => p.startsWith('/parent/volunteer') || p.startsWith('/parent/carpool')
			}
		]
	: [
			...(data.needsOnboarding
				? [
						{
							href: '/onboarding',
							label: 'Onboarding',
							icon: 'shieldcheck',
							match: (p: string) => p.startsWith('/onboarding')
						}
					]
				: []),
			{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
			{ href: '/clickup', label: 'ClickUp', icon: 'clickup' },
			{ href: '/scan', label: 'Scan', icon: 'scan' }
		];

const teamSection: NavItem[] = [
	{ href: '/team', label: 'Team Page', icon: 'team', match: (p) => p === '/team' }
];

const mentorNav: NavItem[] = [
	{ href: '/mentor', label: 'Checkoffs', icon: 'checkoffs', match: (p) => p === '/mentor' },
	{
		href: '/mentor/courses',
		label: 'Courses',
		icon: 'courses',
		match: (p) => p.startsWith('/mentor/courses')
	},
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
	{ href: '/admin/content', label: 'Content', icon: 'file' },
	{ href: '/admin/audit', label: 'Audit log', icon: 'list' },
	{ href: '/admin/attendance', label: 'Attendance', icon: 'calendar' },
	{
		href: '/admin/lettering',
		label: 'Lettering rules',
		icon: 'award',
		match: (p) => p.startsWith('/admin/lettering')
	}
];
```

Note: admin sidebar no longer has a "Users & leads" entry — Roster (under Mentor) covers it.

- [ ] **Step 5: Import `SidebarIcons`** at the top of `+layout.svelte`:

```ts
import SidebarIcons from '$lib/components/SidebarIcons.svelte';
```

- [ ] **Step 6: Run typecheck**

```bash
npm run check
```

Expected: no errors. Fix any prop-type mismatches in `SidebarIcons`.

- [ ] **Step 7: Run the e2e**

```bash
npm run test:e2e -- tests/sidebar.e2e.ts
```

Expected: PASS.

- [ ] **Step 8: Visual sanity check** — start dev server and confirm in browser.

```bash
npm run dev
```

Open `http://localhost:5173/dashboard`. Confirm:

- Icons render to the left of every nav label.
- Section dividers are a thin gradient rule with sentence-case labels.
- Active row has the gradient pill background.
- "Mentor → Checkoffs" shows a small badge with a number (or hides if 0).

- [ ] **Step 9: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(sidebar): icon+label rows, hairline section dividers, queue badge"
```

---

# Phase 2 — Unified `/roster` (absorb `/admin/users`)

**PR boundary:** ships independently. Server-action merge + UI replacement + dead-route redirect.

**Files:**

- Modify: `src/routes/roster/+page.server.ts` (merge actions; load lead options)
- Modify: `src/routes/roster/+page.svelte` (filters, expand-with-admin-editor)
- Create: `src/routes/admin/users/+server.ts` (302 redirect)
- Delete: `src/routes/admin/users/+page.server.ts`
- Delete: `src/routes/admin/users/+page.svelte`
- Test: `src/routes/roster/server-actions.spec.ts` and `tests/roster.e2e.ts`

## Task 2.1: Merge server actions

- [ ] **Step 1: Write failing test** — `src/routes/roster/server-actions.spec.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { updateMemberAccess } from './actions';

describe('updateMemberAccess', () => {
	function buildSupabase(overrides: any = {}) {
		const updateMock = vi.fn().mockReturnThis();
		const eqMock = vi.fn().mockResolvedValue({ error: null, ...overrides });
		const fromMock = vi.fn().mockReturnValue({ update: updateMock, eq: eqMock });
		return { from: fromMock, _mocks: { updateMock, eqMock, fromMock } };
	}

	it('rejects non-admins with 403', async () => {
		const supabase = buildSupabase();
		const result = await updateMemberAccess({
			supabase: supabase as any,
			isAdminViewer: false,
			formData: new FormData()
		});
		expect(result.status).toBe(403);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('updates profile flags + lead assignments in a single call when admin', async () => {
		const supabase = buildSupabase();
		const fd = new FormData();
		fd.set('user_id', 'u123');
		fd.set('base_role', 'member');
		fd.set('is_mentor', 'on');
		fd.set('is_lead', 'on');
		fd.set('lead_team_group_id', 'tg9');
		fd.set('lead_subteam_id', '');
		const result = await updateMemberAccess({
			supabase: supabase as any,
			isAdminViewer: true,
			formData: fd
		});
		expect(result.ok).toBe(true);
		expect(supabase._mocks.fromMock).toHaveBeenCalledWith('profiles');
		expect(supabase._mocks.updateMock).toHaveBeenCalledWith({
			base_role: 'member',
			is_mentor: true,
			is_lead: true,
			lead_team_group_id: 'tg9',
			lead_subteam_id: null
		});
		expect(supabase._mocks.eqMock).toHaveBeenCalledWith('id', 'u123');
	});

	it('returns 400 when user_id missing', async () => {
		const supabase = buildSupabase();
		const result = await updateMemberAccess({
			supabase: supabase as any,
			isAdminViewer: true,
			formData: new FormData()
		});
		expect(result.status).toBe(400);
	});
});
```

- [ ] **Step 2: Confirm fail**

```bash
npm run test:unit -- src/routes/roster/server-actions.spec.ts
```

Expected: module-not-found.

- [ ] **Step 3: Implement** — `src/routes/roster/actions.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type UpdateMemberAccessResult = { ok: true } | { status: number; error: string };

export async function updateMemberAccess(opts: {
	supabase: SupabaseClient;
	isAdminViewer: boolean;
	formData: FormData;
}): Promise<UpdateMemberAccessResult> {
	if (!opts.isAdminViewer) return { status: 403, error: 'Forbidden' };
	const userId = String(opts.formData.get('user_id') ?? '').trim();
	if (!userId) return { status: 400, error: 'Missing user_id' };

	const patch: Record<string, unknown> = {};
	if (opts.formData.has('base_role')) {
		patch.base_role = String(opts.formData.get('base_role'));
	}
	if (opts.formData.has('is_mentor') || opts.formData.get('is_mentor') === null) {
		patch.is_mentor = opts.formData.get('is_mentor') === 'on';
	}
	if (opts.formData.has('is_lead') || opts.formData.get('is_lead') === null) {
		patch.is_lead = opts.formData.get('is_lead') === 'on';
	}
	if (opts.formData.has('lead_team_group_id')) {
		const v = String(opts.formData.get('lead_team_group_id') ?? '').trim();
		patch.lead_team_group_id = v || null;
	}
	if (opts.formData.has('lead_subteam_id')) {
		const v = String(opts.formData.get('lead_subteam_id') ?? '').trim();
		patch.lead_subteam_id = v || null;
	}

	const { error } = await opts.supabase.from('profiles').update(patch).eq('id', userId);
	if (error) return { status: 400, error: error.message };
	return { ok: true };
}
```

- [ ] **Step 4: Confirm pass**

```bash
npm run test:unit -- src/routes/roster/server-actions.spec.ts
```

- [ ] **Step 5: Wire into `+page.server.ts`** — replace the existing `?/setRole` action with `?/updateMemberAccess` that calls the new helper. Keep the existing `load` function; extend it to also fetch `team_groups` and `subteams` for the lead-of selects:

```ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin, isMentor } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { updateMemberAccess } from './actions';

export const load: PageServerLoad = async ({ locals }) => {
  const { user, profile } = await locals.safeGetSession();
  if (!user || !profile || !isMentor(profile)) {
    // Mentors can view, admins can edit. Non-mentor non-admin → redirect to dashboard
    return { rows: [], canManageUsers: false, teamGroups: [], subteams: [], attendanceSessions: [] };
  }

  const service = createSupabaseServiceClient();
  const [rosterResp, attendanceResp, teamGroupsResp, subteamsResp] = await Promise.all([
    service.from('profiles')
      .select('id,full_name,email,role,base_role,is_mentor,is_lead,lead_team_group_id,lead_subteam_id,is_parent_guardian')
      .order('full_name'),
    service.from('attendance_sessions')
      .select('attendee_user_id,attendance_day,check_in_at,check_out_at')
      .order('attendance_day', { ascending: false })
      .limit(500),
    service.from('team_groups').select('id,name,designator').order('name'),
    service.from('subteams').select('id,name').order('name')
  ]);

  // existing pendingCheckoffs / progressPercent / etc. logic — preserve as-is
  // ...

  return {
    rows: /* existing computed rows */,
    canManageUsers: isAdmin(profile),
    teamGroups: teamGroupsResp.data ?? [],
    subteams: subteamsResp.data ?? [],
    attendanceSessions: attendanceResp.data ?? []
  };
};

export const actions: Actions = {
  updateMemberAccess: async ({ locals, request }) => {
    const { profile } = await locals.safeGetSession();
    const result = await updateMemberAccess({
      supabase: createSupabaseServiceClient(),
      isAdminViewer: isAdmin(profile),
      formData: await request.formData()
    });
    if ('ok' in result) return { ok: true };
    return fail(result.status, { error: result.error });
  }
};
```

- [ ] **Step 6: Run unit tests + typecheck**

```bash
npm run test:unit -- src/routes/roster && npm run check
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/roster/actions.ts src/routes/roster/server-actions.spec.ts src/routes/roster/+page.server.ts
git commit -m "refactor(roster): merge updateMemberAccess action"
```

## Task 2.2: Replace `/roster` page UI

- [ ] **Step 1: Write failing e2e** — `tests/roster.e2e.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('unified roster', () => {
	test('admin sees admin-tools indicator and can expand a row to see role editor', async ({
		page
	}) => {
		// Log in as admin
		await page.goto('/roster');
		await expect(page.getByText(/Admin tools active/i)).toBeVisible();
		const firstRow = page.locator('tbody tr.row-main').first();
		await firstRow.locator('[data-role="expand-caret"]').click();
		await expect(page.getByText(/Admin controls/i)).toBeVisible();
		await expect(page.locator('select[name="base_role"]')).toBeVisible();
		await expect(page.locator('select[name="lead_team_group_id"]')).toBeVisible();
	});

	test('mentor (non-admin) cannot see Admin controls', async ({ page }) => {
		// Log in as mentor-not-admin
		await page.goto('/roster');
		await expect(page.getByText(/Admin tools active/i)).not.toBeVisible();
		const firstRow = page.locator('tbody tr.row-main').first();
		await firstRow.locator('[data-role="expand-caret"]').click();
		await expect(page.getByText(/Admin controls/i)).not.toBeVisible();
	});

	test('filter chip "Pending checkoffs" narrows the list to rows with pending > 0', async ({
		page
	}) => {
		await page.goto('/roster');
		await page.getByRole('button', { name: 'Pending checkoffs' }).click();
		const pendingCells = await page
			.locator('tbody tr.row-main [data-role="pending-count"]')
			.allTextContents();
		for (const txt of pendingCells) {
			expect(Number(txt)).toBeGreaterThan(0);
		}
	});
});
```

- [ ] **Step 2: Confirm fail** — selectors don't exist yet.

- [ ] **Step 3: Replace `src/routes/roster/+page.svelte`** with the dense-table mockup. Key markup blocks:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { isAdmin } from '$lib/roles';
	let { data, form } = $props();

	let filter = $state('');
	let chip = $state<'all' | 'leads' | 'mentors' | 'pending'>('all');
	let subteamFilter = $state<string>('');
	let groupBySubteam = $state(true);
	let expandedUserId = $state<string | null>(null);
	const canManage = $derived(data.canManageUsers);

	const attendanceByUser = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const s of data.attendanceSessions ?? []) {
			const key = String(s.attendee_user_id);
			(map.get(key) ?? map.set(key, []).get(key)!).push(s);
		}
		return map;
	});

	const filtered = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		return (data.rows ?? []).filter((r: any) => {
			if (q && !((r.full_name ?? '') + ' ' + (r.email ?? '')).toLowerCase().includes(q))
				return false;
			if (chip === 'leads' && !r.is_lead) return false;
			if (chip === 'mentors' && !r.is_mentor) return false;
			if (chip === 'pending' && (r.pendingCheckoffs ?? 0) === 0) return false;
			if (subteamFilter && !(r.subteamIds ?? []).includes(subteamFilter)) return false;
			return true;
		});
	});

	const groups = $derived.by(() => {
		if (!groupBySubteam) return [['All', filtered]];
		const byKey = new Map<string, { label: string; rows: any[] }>();
		for (const row of filtered) {
			const label = row.primarySubteamName ?? '(unassigned)';
			const key = `${label}`;
			const entry = byKey.get(key) ?? { label, rows: [] };
			entry.rows.push(row);
			byKey.set(key, entry);
		}
		return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
	});
</script>

<section class="space-y-5">
	<header class="flex items-end justify-between">
		<div>
			<p class="eyebrow-label">Team</p>
			<h1 class="gradient-text text-2xl font-semibold tracking-tight">Roster</h1>
			<p class="text-sm" style="color: var(--app-text-muted);">
				{data.rows?.length ?? 0} members · {data.rows?.filter((r: any) => r.is_mentor).length ?? 0} mentors
				· {data.rows?.filter((r: any) => r.is_lead).length ?? 0} leads
			</p>
		</div>
		{#if canManage}
			<div
				class="rounded-xl border px-3 py-2 text-xs font-semibold"
				style="background: color-mix(in srgb, var(--app-danger) 8%, transparent); border-color: color-mix(in srgb, var(--app-danger) 25%, transparent); color: color-mix(in srgb, var(--app-danger) 70%, white);"
			>
				● Admin tools active
			</div>
		{/if}
	</header>

	<!-- Filter bar -->
	<div class="flex flex-wrap items-center gap-2">
		<input
			class="min-w-[200px] flex-1 rounded-xl border px-3 py-2 text-sm"
			style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
			placeholder="Search by name or email…"
			bind:value={filter}
		/>
		{#each [['all', 'All'], ['leads', 'Leads'], ['mentors', 'Mentors'], ['pending', 'Pending checkoffs']] as [key, label]}
			<button
				onclick={() => (chip = key)}
				class="rounded-lg px-3 py-1.5 text-xs font-semibold"
				style={chip === key
					? 'background: color-mix(in srgb, var(--app-accent) 18%, transparent); border: 1px solid color-mix(in srgb, var(--app-accent) 50%, transparent); color: color-mix(in srgb, var(--app-accent) 30%, white);'
					: 'background: var(--app-glass-bg); border: 1px solid var(--app-glass-border); color: var(--app-text-muted);'}
			>
				{label}
			</button>
		{/each}
		<select
			bind:value={subteamFilter}
			class="rounded-xl border px-3 py-2 text-sm"
			style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
		>
			<option value="">All subteams</option>
			{#each data.subteams ?? [] as st (st.id)}
				<option value={st.id}>{st.name}</option>
			{/each}
		</select>
		<label
			class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
			style="background: var(--app-glass-bg); border: 1px solid var(--app-glass-border); color: var(--app-text-muted);"
		>
			<input type="checkbox" bind:checked={groupBySubteam} />
			Group by subteam
		</label>
	</div>

	{#each groups as group}
		<div>
			{#if groupBySubteam}
				<div class="mt-4 mb-2 flex items-center gap-3">
					<p
						class="text-[11px] font-bold tracking-[0.18em] uppercase"
						style="color: var(--app-text-muted);"
					>
						{group.label}
					</p>
					<p class="text-xs" style="color: var(--app-text-dim);">
						{group.rows.length} member{group.rows.length === 1 ? '' : 's'}
					</p>
				</div>
			{/if}
			<div
				class="overflow-hidden rounded-2xl border"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<table class="min-w-full text-sm">
					<thead style="background: var(--app-table-header-bg);">
						<tr>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Member</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Roles</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Progress</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Pending</th
							>
							<th
								class="p-3 text-left text-xs font-medium tracking-wider uppercase"
								style="color: var(--app-text-muted);">Hours</th
							>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each group.rows as row (row.id)}
							<tr class="row-main border-t" style="border-color: var(--app-glass-border);">
								<td class="p-3">
									<a href={`/roster/${row.id}`} class="font-medium" style="color: var(--app-text);"
										>{row.full_name || row.email}</a
									>
									<p class="text-xs" style="color: var(--app-text-dim);">{row.email}</p>
								</td>
								<td class="p-3">
									{#if row.base_role === 'admin' || row.role === 'admin'}<span
											class="rounded-full px-2 py-0.5 text-[10px]"
											style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);"
											>admin</span
										>{/if}
									{#if row.is_mentor}<span
											class="rounded-full px-2 py-0.5 text-[10px]"
											style="background: color-mix(in srgb, var(--app-accent) 15%, transparent); color: var(--app-accent);"
											>mentor</span
										>{/if}
									{#if row.is_lead}<span
											class="rounded-full px-2 py-0.5 text-[10px]"
											style="background: color-mix(in srgb, var(--app-info) 15%, transparent); color: var(--app-info);"
											>lead</span
										>{/if}
								</td>
								<td class="p-3">
									<div class="flex items-center gap-2">
										<div
											class="h-1.5 w-24 rounded-full"
											style="background: color-mix(in srgb, var(--app-glass-border) 50%, transparent);"
										>
											<div
												class="h-full rounded-full"
												style="width: {row.progressPercent}%; background: linear-gradient(90deg, var(--app-accent), var(--app-info));"
											></div>
										</div>
										<span class="mono text-xs" style="color: var(--app-text-muted);"
											>{row.progressPercent}%</span
										>
									</div>
								</td>
								<td class="p-3"
									><span
										data-role="pending-count"
										class="mono"
										style="color: {row.pendingCheckoffs > 0
											? 'var(--app-warning)'
											: 'var(--app-text-muted)'};">{row.pendingCheckoffs ?? 0}</span
									></td
								>
								<td class="p-3"
									><span class="mono" style="color: var(--app-text-muted);"
										>{row.hoursTotal ?? '—'}</span
									></td
								>
								<td class="p-3 text-right">
									<button
										data-role="expand-caret"
										type="button"
										class="rounded-md border px-2 py-1 text-xs"
										style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
										onclick={() => (expandedUserId = expandedUserId === row.id ? null : row.id)}
									>
										{expandedUserId === row.id ? '▾' : '▸'}
									</button>
								</td>
							</tr>
							{#if expandedUserId === row.id}
								<tr
									class="row-expand border-t"
									style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
								>
									<td colspan="6" class="p-4">
										<div class="flex gap-6">
											<div class="flex-1">
												<p class="eyebrow-label" style="margin-bottom: 8px;">
													Attendance · last 4 sessions
												</p>
												<div class="flex flex-wrap gap-2">
													{#each (attendanceByUser.get(row.id) ?? []).slice(0, 4) as s}
														<span
															class="rounded-md px-2 py-1 text-xs"
															style="background: var(--app-glass-bg); border: 1px solid var(--app-glass-border); color: var(--app-text-muted);"
														>
															{s.attendance_day}
														</span>
													{/each}
												</div>
												<a
													href={`/roster/${row.id}`}
													class="mt-3 inline-block text-xs underline"
													style="color: var(--app-link);">Open full profile →</a
												>
											</div>
											{#if canManage}
												<div
													class="flex-1 border-l pl-6"
													style="border-color: var(--app-glass-border);"
												>
													<p
														class="eyebrow-label"
														style="margin-bottom: 8px; color: color-mix(in srgb, var(--app-danger) 70%, var(--app-text-muted));"
													>
														Admin controls
													</p>
													<form method="POST" action="?/updateMemberAccess" class="space-y-3">
														<input type="hidden" name="user_id" value={row.id} />
														<div class="grid grid-cols-2 gap-3">
															<label class="block">
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Base role</span
																>
																<select
																	name="base_role"
																	class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																>
																	<option value="member" selected={row.base_role === 'member'}
																		>member</option
																	>
																	<option value="admin" selected={row.base_role === 'admin'}
																		>admin</option
																	>
																</select>
															</label>
															<label class="block">
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Lead of team</span
																>
																<select
																	name="lead_team_group_id"
																	class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																>
																	<option value="">— none —</option>
																	{#each data.teamGroups as tg (tg.id)}
																		<option
																			value={tg.id}
																			selected={row.lead_team_group_id === tg.id}>{tg.name}</option
																		>
																	{/each}
																</select>
															</label>
															<label class="block">
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Lead of subteam</span
																>
																<select
																	name="lead_subteam_id"
																	class="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
																	style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
																>
																	<option value="">— none —</option>
																	{#each data.subteams as st (st.id)}
																		<option value={st.id} selected={row.lead_subteam_id === st.id}
																			>{st.name}</option
																		>
																	{/each}
																</select>
															</label>
															<div>
																<span
																	class="text-[10px] tracking-wider uppercase"
																	style="color: var(--app-text-muted);">Flags</span
																>
																<div class="mt-1 flex gap-2">
																	<label class="inline-flex items-center gap-1 text-xs"
																		><input
																			type="checkbox"
																			name="is_mentor"
																			checked={row.is_mentor}
																		/> Mentor</label
																	>
																	<label class="inline-flex items-center gap-1 text-xs"
																		><input type="checkbox" name="is_lead" checked={row.is_lead} /> Lead</label
																	>
																</div>
															</div>
														</div>
														<Button variant="primary" size="sm" type="submit">Save changes</Button>
													</form>
												</div>
											{/if}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/each}
</section>
```

- [ ] **Step 4: Extend `+page.server.ts` `load` to compute `primarySubteamName` and `subteamIds`** for each row. These map per-user to a primary subteam name (used for grouping) and the set of subteam IDs (used for filtering). The data comes from `profile_teams` joined to `teams`.

- [ ] **Step 5: Run e2e**

```bash
npm run test:e2e -- tests/roster.e2e.ts
```

Expected: PASS for all three tests.

- [ ] **Step 6: Commit**

```bash
git add src/routes/roster/+page.svelte tests/roster.e2e.ts
git commit -m "feat(roster): unified dense-table view with filter chips and admin-inline editor"
```

## Task 2.3: Delete `/admin/users` and add redirect

- [ ] **Step 1: Create `src/routes/admin/users/+server.ts`**

```ts
import { redirect } from '@sveltejs/kit';

export function GET() {
	throw redirect(302, '/roster');
}
```

- [ ] **Step 2: Delete the old route files**

```bash
git rm src/routes/admin/users/+page.svelte src/routes/admin/users/+page.server.ts
```

- [ ] **Step 3: Typecheck**

```bash
npm run check
```

- [ ] **Step 4: Manual smoke** — visit `/admin/users` in dev, confirm it 302s to `/roster`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/users/+server.ts
git commit -m "chore(admin): redirect /admin/users to unified /roster"
```

---

# Phase 3 — `/teams` content moves to `/profile`

**Files:**

- Modify: `src/routes/profile/+page.svelte` (append "Team membership" + "Mentor checkoff teams" cards)
- Modify: `src/routes/profile/+page.server.ts` (load subteams + mentor team ids; add two actions)
- Create: `src/routes/teams/+server.ts` (302 redirect)
- Delete: `src/routes/teams/+page.svelte` and `+page.server.ts`

## Task 3.1: Move the load + actions

- [ ] **Step 1: Open `src/routes/profile/+page.server.ts`** and extend it.

Add to `load`:

```ts
const [{ data: subteams }, mentorPrefsResp] = await Promise.all([
	locals.supabase.from('subteams').select('id,name,slug').order('name'),
	isMentor(profile)
		? locals.supabase
				.from('mentor_subteam_preferences')
				.select('subteam_id')
				.eq('mentor_id', user.id)
		: Promise.resolve({ data: [] as { subteam_id: string }[] })
]);

return {
	// ...existing returned fields,
	teamSubteams: subteams ?? [],
	mentorTeamIds: (mentorPrefsResp.data ?? []).map((r: any) => r.subteam_id)
};
```

Add to `actions` (copy verbatim from existing `src/routes/teams/+page.server.ts`):

```ts
setPrimaryTeam: async ({ locals, request }) => {
  const { user } = await locals.safeGetSession();
  if (!user) return fail(401, { error: 'Unauthorized' });
  const form = await request.formData();
  const subteamId = String(form.get('subteam_id') ?? '').trim();
  const { error } = await locals.supabase
    .from('profiles')
    .update({ subteam_id: subteamId || null })
    .eq('id', user.id);
  if (error) return fail(400, { error: error.message, section: 'primary' });
  return { ok: true, section: 'primary' };
},

saveMentorTeams: async ({ locals, request }) => {
  const { user, profile } = await locals.safeGetSession();
  if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
  const form = await request.formData();
  const ids = form.getAll('mentor_team_ids').map((v) => String(v)).filter(Boolean);

  const { error: delError } = await locals.supabase
    .from('mentor_subteam_preferences').delete().eq('mentor_id', user.id);
  if (delError) return fail(400, { error: delError.message, section: 'mentor' });

  if (ids.length > 0) {
    const rows = ids.map((subteamId) => ({ mentor_id: user.id, subteam_id: subteamId }));
    const { error } = await locals.supabase.from('mentor_subteam_preferences').insert(rows);
    if (error) return fail(400, { error: error.message, section: 'mentor' });
  }
  return { ok: true, section: 'mentor' };
}
```

- [ ] **Step 2: Append two new cards** at the bottom of `src/routes/profile/+page.svelte`:

```svelte
<!-- Primary team card -->
<form
	method="POST"
	action="?/setPrimaryTeam"
	class="fade-up rounded-2xl border p-5 backdrop-blur-xl"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); animation-delay: 0.1s;"
>
	<h2 class="text-base font-semibold" style="color: var(--app-text);">Team membership</h2>
	<p class="mb-3 text-xs" style="color: var(--app-text-muted);">
		Drives your default course grouping.
	</p>
	<div class="grid gap-2 md:grid-cols-2">
		{#each data.teamSubteams as team}
			<label
				class="flex cursor-pointer items-center gap-2 rounded border p-3"
				style="border-color: var(--app-glass-border);"
			>
				<input
					type="radio"
					name="subteam_id"
					value={team.id}
					checked={data.profile?.subteam_id === team.id}
				/>
				<div>
					<p class="font-medium" style="color: var(--app-text);">{team.name}</p>
					<p class="text-xs" style="color: var(--app-text-muted);">{team.slug}</p>
				</div>
			</label>
		{/each}
	</div>
	<div class="mt-3 flex gap-2">
		<Button variant="primary" type="submit">Save primary team</Button>
	</div>
</form>

{#if data.profile?.is_mentor}
	<form
		method="POST"
		action="?/saveMentorTeams"
		class="fade-up rounded-2xl border p-5"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); animation-delay: 0.15s;"
	>
		<h2 class="text-base font-semibold" style="color: var(--app-text);">Mentor checkoff teams</h2>
		<p class="mb-3 text-xs" style="color: var(--app-text-muted);">
			Which teams to show in your mentor queue when filtering to "My teams".
		</p>
		<div class="grid gap-2 md:grid-cols-2">
			{#each data.teamSubteams as team}
				<label
					class="flex cursor-pointer items-center gap-2 rounded border p-3"
					style="border-color: var(--app-glass-border);"
				>
					<input
						type="checkbox"
						name="mentor_team_ids"
						value={team.id}
						checked={data.mentorTeamIds.includes(team.id)}
					/>
					<div>
						<p class="font-medium" style="color: var(--app-text);">{team.name}</p>
						<p class="text-xs" style="color: var(--app-text-muted);">{team.slug}</p>
					</div>
				</label>
			{/each}
		</div>
		<Button variant="primary" type="submit" class="mt-3">Save mentor teams</Button>
	</form>
{/if}
```

- [ ] **Step 3: Typecheck**

```bash
npm run check
```

- [ ] **Step 4: Manual smoke** — `npm run dev`, visit `/profile`, submit the two new forms.

- [ ] **Step 5: Commit**

```bash
git add src/routes/profile/+page.svelte src/routes/profile/+page.server.ts
git commit -m "feat(profile): absorb team-membership and mentor-team forms from /teams"
```

## Task 3.2: Delete `/teams` and redirect

- [ ] **Step 1: Create redirect** — `src/routes/teams/+server.ts`

```ts
import { redirect } from '@sveltejs/kit';
export function GET() {
	throw redirect(302, '/profile');
}
```

- [ ] **Step 2: Delete old route**

```bash
git rm src/routes/teams/+page.svelte src/routes/teams/+page.server.ts
```

- [ ] **Step 3: Typecheck + manual smoke**

```bash
npm run check
```

Visit `/teams`, confirm redirect to `/profile`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/teams/+server.ts
git commit -m "chore(routes): redirect /teams to /profile"
```

---

# Phase 4 — Team / subteam page redesign

**PR boundary:** independent. Adds `StatusDonut`, `MiniSkillTree`, and the `scope` prop on `SkillTree`. Updates both `/team` and `/team/[subteam]` pages.

**Files:**

- Create: `src/lib/components/StatusDonut.svelte`
- Create: `src/lib/components/MiniSkillTree.svelte`
- Modify: `src/lib/components/SkillTree.svelte` (add `scope` prop)
- Modify: `src/routes/team/+page.svelte`
- Modify: `src/routes/team/+page.server.ts` (compute status breakdown, fetch courses for graph)
- Modify: `src/routes/team/[subteam]/+page.svelte`
- Modify: `src/routes/team/[subteam]/+page.server.ts` (same as above but scoped)
- Test: `src/lib/components/StatusDonut.spec.ts`, `tests/team-page.e2e.ts`

## Task 4.1: Add `scope` prop to SkillTree

- [ ] **Step 1: Write failing unit test** — `src/lib/components/SkillTree.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { filterByScope } from './skill-tree-scope';

describe('filterByScope', () => {
	const nodes = [
		{ id: 'a', title: 'A', slug: 'a' },
		{ id: 'b', title: 'B', slug: 'b' },
		{ id: 'c', title: 'C', slug: 'c' }
	];
	const prereqs = [
		{ node_id: 'b', prerequisite_node_id: 'a' },
		{ node_id: 'c', prerequisite_node_id: 'b' }
	];

	it('returns all when scope undefined', () => {
		const r = filterByScope(nodes, prereqs, undefined);
		expect(r.nodes).toHaveLength(3);
		expect(r.prerequisites).toHaveLength(2);
	});

	it('filters to allowed ids and drops dangling edges', () => {
		const r = filterByScope(nodes, prereqs, new Set(['b', 'c']));
		expect(r.nodes.map((n) => n.id)).toEqual(['b', 'c']);
		expect(r.prerequisites).toEqual([{ node_id: 'c', prerequisite_node_id: 'b' }]);
	});

	it('returns empty when scope is empty', () => {
		const r = filterByScope(nodes, prereqs, new Set());
		expect(r.nodes).toEqual([]);
		expect(r.prerequisites).toEqual([]);
	});
});
```

- [ ] **Step 2: Confirm fail**

```bash
npm run test:unit -- src/lib/components/SkillTree.spec.ts
```

- [ ] **Step 3: Implement** — `src/lib/components/skill-tree-scope.ts`

```ts
type Node = { id: string; title: string; slug: string };
type Edge = { node_id: string; prerequisite_node_id: string };

export function filterByScope(
	nodes: Node[],
	prerequisites: Edge[],
	scope: Set<string> | undefined
): { nodes: Node[]; prerequisites: Edge[] } {
	if (!scope) return { nodes, prerequisites };
	const allowed = new Set(scope);
	const filteredNodes = nodes.filter((n) => allowed.has(n.id));
	const filteredEdges = prerequisites.filter(
		(e) => allowed.has(e.node_id) && allowed.has(e.prerequisite_node_id)
	);
	return { nodes: filteredNodes, prerequisites: filteredEdges };
}
```

- [ ] **Step 4: Confirm pass**

```bash
npm run test:unit -- src/lib/components/SkillTree.spec.ts
```

- [ ] **Step 5: Wire into `SkillTree.svelte`** — add an optional `scope?: Set<string> | string[]` prop. At the top of the `<script>`:

```ts
import { filterByScope } from './skill-tree-scope';

let {
	nodes = [],
	statuses = [],
	prerequisites = [],
	scope = undefined
} = $props<{
	nodes: Array<{ id: string; title: string; slug: string }>;
	statuses: Array<{ node_id: string; computed_status: string }>;
	prerequisites: Array<{ node_id: string; prerequisite_node_id: string }>;
	scope?: Set<string> | string[];
}>();

const scopeSet = $derived(scope instanceof Set ? scope : scope ? new Set(scope) : undefined);
const effectiveNodes = $derived(filterByScope(nodes, prerequisites, scopeSet).nodes);
const effectivePrereqs = $derived(filterByScope(nodes, prerequisites, scopeSet).prerequisites);
```

Then replace usages of `nodes` and `prerequisites` inside the layout-derivation block with `effectiveNodes` and `effectivePrereqs`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/skill-tree-scope.ts src/lib/components/SkillTree.spec.ts src/lib/components/SkillTree.svelte
git commit -m "feat(skilltree): add optional scope prop"
```

## Task 4.2: StatusDonut component

- [ ] **Step 1: Write failing test** — `src/lib/components/StatusDonut.spec.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeSegments } from './status-donut-math';

describe('computeSegments', () => {
	it('returns five segments summing to circumference within rounding', () => {
		const segments = computeSegments(
			{ done: 7, current: 2, awaiting: 1, blocked: 1, locked: 1 },
			251.327
		);
		const total = segments.reduce((acc, s) => acc + s.length, 0);
		expect(total).toBeCloseTo(251.327, 2);
		expect(segments).toHaveLength(5);
	});

	it('handles all-zero gracefully', () => {
		const segments = computeSegments(
			{ done: 0, current: 0, awaiting: 0, blocked: 0, locked: 0 },
			251.327
		);
		for (const s of segments) expect(s.length).toBe(0);
	});

	it('emits offsets that chain sequentially', () => {
		const segments = computeSegments(
			{ done: 5, current: 0, awaiting: 0, blocked: 0, locked: 5 },
			100
		);
		expect(segments[0].offset).toBe(0);
		expect(segments[1].offset).toBe(segments[0].length);
	});
});
```

- [ ] **Step 2: Implement** — `src/lib/components/status-donut-math.ts`

```ts
export type StatusCounts = {
	done: number;
	current: number;
	awaiting: number;
	blocked: number;
	locked: number;
};

export type Segment = { key: keyof StatusCounts; length: number; offset: number };

export function computeSegments(counts: StatusCounts, circumference: number): Segment[] {
	const total = counts.done + counts.current + counts.awaiting + counts.blocked + counts.locked;
	const order: (keyof StatusCounts)[] = ['done', 'current', 'awaiting', 'blocked', 'locked'];
	let offset = 0;
	return order.map((key) => {
		const length = total === 0 ? 0 : (counts[key] / total) * circumference;
		const seg = { key, length, offset };
		offset += length;
		return seg;
	});
}
```

- [ ] **Step 3: Confirm pass**

```bash
npm run test:unit -- src/lib/components/StatusDonut.spec.ts
```

- [ ] **Step 4: Implement `src/lib/components/StatusDonut.svelte`**

```svelte
<script lang="ts">
	import { computeSegments, type StatusCounts } from './status-donut-math';
	let { counts, size = 130 }: { counts: StatusCounts; size?: number } = $props();
	const radius = 40;
	const circumference = 2 * Math.PI * radius;
	const segments = $derived(computeSegments(counts, circumference));
	const total = $derived(
		counts.done + counts.current + counts.awaiting + counts.blocked + counts.locked
	);
	const pct = $derived(total === 0 ? 0 : Math.round((counts.done / total) * 100));
	const colorFor = (key: string) =>
		key === 'done'
			? 'var(--app-success)'
			: key === 'current'
				? 'var(--app-info)'
				: key === 'awaiting'
					? 'var(--app-warning)'
					: key === 'blocked'
						? 'var(--app-danger)'
						: 'var(--app-text-dim)';
</script>

<div class="relative" style="width: {size}px; height: {size}px;">
	<svg viewBox="0 0 100 100" width={size} height={size}>
		<circle
			cx="50"
			cy="50"
			r={radius}
			stroke="var(--app-glass-border)"
			stroke-width="14"
			fill="none"
		/>
		{#each segments as seg}
			{#if seg.length > 0}
				<circle
					cx="50"
					cy="50"
					r={radius}
					stroke={colorFor(seg.key)}
					stroke-width="14"
					fill="none"
					stroke-dasharray={`${seg.length} ${circumference - seg.length}`}
					stroke-dashoffset={-seg.offset}
					transform="rotate(-90 50 50)"
				/>
			{/if}
		{/each}
	</svg>
	<div class="absolute inset-0 flex flex-col items-center justify-center">
		<span class="text-3xl font-bold tracking-tight" style="color: var(--app-text);">{pct}%</span>
		<span
			class="text-[9px] font-bold tracking-[0.18em] uppercase"
			style="color: var(--app-text-muted);">Complete</span
		>
	</div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/StatusDonut.svelte src/lib/components/status-donut-math.ts src/lib/components/StatusDonut.spec.ts
git commit -m "feat(team-page): add StatusDonut component"
```

## Task 4.3: MiniSkillTree wrapper

- [ ] **Step 1: Create `src/lib/components/MiniSkillTree.svelte`**

```svelte
<script lang="ts">
	import SkillTree from './SkillTree.svelte';
	let { nodes = [], statuses = [], prerequisites = [], scope = undefined } = $props();
</script>

<div
	class="overflow-hidden rounded-xl border"
	style="background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--app-accent) 6%, transparent), transparent 60%), var(--app-glass-bg); border-color: var(--app-glass-border); aspect-ratio: 4/3;"
>
	<SkillTree {nodes} {statuses} {prerequisites} {scope} />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/MiniSkillTree.svelte
git commit -m "feat(team-page): add MiniSkillTree wrapper"
```

## Task 4.4: Redesign `/team` page

- [ ] **Step 1: Extend `/team/+page.server.ts` `load`** to return status breakdown + course node IDs for the graph. After the existing course-loading logic:

```ts
const courseRows = data.courses ?? [];
const counts = {
	done: 0,
	current: 0,
	awaiting: 0,
	blocked: 0,
	locked: 0
};
for (const c of courseRows) {
	if (c.status === 'completed') counts.done++;
	else if (['in_progress', 'video_pending', 'quiz_pending'].includes(c.status)) counts.current++;
	else if (['mentor_checkoff_pending', 'awaiting_checkoff'].includes(c.status)) counts.awaiting++;
	else if (['checkoff_needs_review', 'checkoff_blocked'].includes(c.status)) counts.blocked++;
	else if (c.status === 'available')
		counts.locked++; // bucket "available" with the rest into a 5th band
	else counts.locked++;
}

// Count completions in the last 7 days from `certifications` (or whatever existing table records completions)
const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
const { count: recentCompletions } = await locals.supabase
	.from('certifications') // verify table name
	.select('id', { count: 'exact', head: true })
	.in(
		'node_id',
		courseRows.map((c: any) => c.node_id)
	)
	.gte('granted_at', sevenDaysAgo);

// Fetch nodes + prereqs scoped to this team-group
const { data: graphNodes } = await locals.supabase.from('learning_nodes').select('id,title,slug');
const { data: graphPrereqs } = await locals.supabase
	.from('learning_node_prerequisites')
	.select('node_id,prerequisite_node_id');
const scopeNodeIds = new Set(courseRows.map((c: any) => c.node_id));
const userStatuses = courseRows.map((c: any) => ({
	node_id: c.node_id,
	computed_status: c.status
}));

return {
	// ...existing
	statusCounts: counts,
	recentCompletions: recentCompletions ?? 0,
	graphNodes: graphNodes ?? [],
	graphPrereqs: graphPrereqs ?? [],
	scopeNodeIds: Array.from(scopeNodeIds),
	userStatuses
};
```

- [ ] **Step 2: Replace the top of `/team/+page.svelte`** with the donut + mini-graph row:

```svelte
<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	import StatusDonut from '$lib/components/StatusDonut.svelte';
	import MiniSkillTree from '$lib/components/MiniSkillTree.svelte';
	let { data, form } = $props();
	// existing variable declarations...
</script>

<section class="space-y-6">
	{#if data.teamGroup}
		<header class="fade-up flex items-end justify-between">
			<div>
				<p class="eyebrow-label">{data.teamGroup.designator ?? 'Team'}</p>
				<h1 class="text-2xl font-bold tracking-tight">
					<span class="gradient-text">{data.teamGroup.name}</span>
				</h1>
			</div>
			<a
				href={`/courses/map?scope=teamgroup:${data.teamGroup.id}`}
				class="rounded-lg border px-3 py-1.5 text-xs font-semibold"
				style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
				>Open full graph →</a
			>
		</header>

		<!-- Donut + mini-graph row -->
		<div
			class="fade-up grid gap-4"
			style="grid-template-columns: 1.6fr 1fr; animation-delay: 0.05s;"
		>
			<div
				class="rounded-2xl border p-5 backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); display: flex; gap: 16px; align-items: center;"
			>
				<StatusDonut counts={data.statusCounts} size={130} />
				<div class="flex-1">
					<p class="eyebrow-label">Subteam progress</p>
					<div class="flex items-baseline gap-2">
						<span class="text-4xl font-bold tracking-tight" style="color: var(--app-text);"
							>{data.statusCounts.done}</span
						>
						<span class="text-sm" style="color: var(--app-text-muted);"
							>of {(data.courses ?? []).length} done</span
						>
					</div>
					<p class="text-xs" style="color: var(--app-text-dim);">
						+{data.recentCompletions} this week
					</p>
					<ul class="mt-3 space-y-1 text-xs" style="color: var(--app-text-muted);">
						<li>
							<span
								class="mr-2 inline-block h-2 w-2 rounded-full"
								style="background: var(--app-success);"
							></span><strong>{data.statusCounts.done}</strong> done
						</li>
						<li>
							<span
								class="mr-2 inline-block h-2 w-2 rounded-full"
								style="background: var(--app-info);"
							></span><strong>{data.statusCounts.current}</strong> in progress
						</li>
						<li>
							<span
								class="mr-2 inline-block h-2 w-2 rounded-full"
								style="background: var(--app-warning);"
							></span><strong>{data.statusCounts.awaiting}</strong> awaiting mentor
						</li>
						<li>
							<span
								class="mr-2 inline-block h-2 w-2 rounded-full"
								style="background: var(--app-danger);"
							></span><strong>{data.statusCounts.blocked}</strong> blocked
						</li>
						<li>
							<span
								class="mr-2 inline-block h-2 w-2 rounded-full"
								style="background: var(--app-text-dim);"
							></span><strong>{data.statusCounts.locked}</strong> locked
						</li>
					</ul>
				</div>
			</div>
			<div>
				<p class="eyebrow-label" style="margin-bottom: 6px;">Skill map</p>
				<MiniSkillTree
					nodes={data.graphNodes}
					statuses={data.userStatuses}
					prerequisites={data.graphPrereqs}
					scope={data.scopeNodeIds}
				/>
				<p class="text-[10px]" style="color: var(--app-text-dim); margin-top: 6px;">
					Your view · click to focus
				</p>
			</div>
		</div>

		<!-- Existing course grid + notes + roster -->
		<!-- ... -->
	{/if}
</section>
```

- [ ] **Step 3: Update the existing course-card markup** to apply status tinting. Replace each card's class-attribute logic with:

```svelte
{@const tone =
	c.status === 'completed'
		? 'done'
		: ['mentor_checkoff_pending', 'awaiting_checkoff'].includes(c.status)
			? 'awaiting'
			: ['checkoff_needs_review', 'checkoff_blocked'].includes(c.status)
				? 'blocked'
				: ['in_progress', 'video_pending', 'quiz_pending'].includes(c.status)
					? 'current'
					: c.status === 'available'
						? 'avail'
						: 'locked'}
<a
	href={`/learn/${c.slug}`}
	class="block rounded-xl border p-3"
	style={tone === 'done'
		? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-success) 10%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-success) 35%, var(--app-glass-border));'
		: tone === 'current'
			? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-info) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-info) 40%, var(--app-glass-border));'
			: tone === 'awaiting'
				? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-warning) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-warning) 40%, var(--app-glass-border));'
				: tone === 'blocked'
					? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-danger) 12%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-danger) 40%, var(--app-glass-border));'
					: tone === 'avail'
						? 'background: linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 10%, var(--app-glass-bg)), var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-glass-border));'
						: 'background: var(--app-glass-bg); border-color: var(--app-glass-border); opacity: .65;'}
>
	<!-- card body -->
</a>
```

- [ ] **Step 4: Write e2e** — `tests/team-page.e2e.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('team page', () => {
	test('renders donut + mini-graph + tinted course cards', async ({ page }) => {
		await page.goto('/team');
		// Donut SVG present
		await expect(page.locator('section svg circle[stroke-width="14"]').first()).toBeVisible();
		// Mini-graph present
		await expect(page.getByText(/Skill map/)).toBeVisible();
		// At least one tinted card
		const cards = page.locator('a[href^="/learn/"]');
		await expect(cards.first()).toBeVisible();
	});
});
```

- [ ] **Step 5: Run e2e**

```bash
npm run test:e2e -- tests/team-page.e2e.ts
```

- [ ] **Step 6: Manual smoke** — `npm run dev`, visit `/team`. Confirm donut renders with correct percent, mini-graph appears on the right (or collapses below on narrow window), per-card tinting matches status.

- [ ] **Step 7: Commit**

```bash
git add src/routes/team/+page.svelte src/routes/team/+page.server.ts tests/team-page.e2e.ts
git commit -m "feat(team-page): donut headline + mini skill map + status-tinted course cards"
```

## Task 4.5: Apply same redesign to `/team/[subteam]`

- [ ] **Step 1: Mirror the changes** from Task 4.4 in `src/routes/team/[subteam]/+page.server.ts` and `+page.svelte`. The data is already scoped to a single subteam — the only difference from `/team` is that `scopeNodeIds` is filtered to the subteam's courses (the existing `load` already does this).

- [ ] **Step 2: Commit**

```bash
git add src/routes/team/[subteam]/+page.svelte src/routes/team/[subteam]/+page.server.ts
git commit -m "feat(subteam-page): apply donut + mini-graph + tinted cards"
```

---

# Phase 5 — Mentor Courses (list + live mini-graph)

**Files:**

- Create: `supabase/migrations/202605150900_course_completion_aggregate.sql`
- Create: `src/lib/server/course-aggregates.ts`
- Modify: `src/routes/mentor/courses/+page.server.ts` (call aggregate, load prereqs for whole DAG)
- Modify: `src/routes/mentor/courses/+page.svelte` (two-panel layout)
- Test: `src/lib/server/course-aggregates.spec.ts`, `tests/mentor-courses.e2e.ts`

## Task 5.1: Aggregate-completion RPC

- [ ] **Step 1: Write migration** — `supabase/migrations/202605150900_course_completion_aggregate.sql`

```sql
-- Returns, for a set of learning node ids: how many distinct users are assigned
-- to each course (via team or team_group targets) and how many have completed it.
create or replace function public.course_completion_aggregate(node_ids uuid[])
returns table (
  node_id uuid,
  assigned bigint,
  completed bigint
)
language sql
stable
security invoker
as $$
  with assignees as (
    -- Users assigned via direct team target
    select distinct ntt.node_id, pt.user_id
    from node_team_targets ntt
    join profile_teams pt on pt.team_id = ntt.team_id
    where ntt.node_id = any(node_ids)
    union
    -- Users assigned via team-group target
    select distinct ngt.node_id, pt.user_id
    from node_team_group_targets ngt
    join profile_teams pt on pt.team_group_id = ngt.team_group_id
    where ngt.node_id = any(node_ids)
  ),
  done as (
    select node_id, user_id from certifications where node_id = any(node_ids)
  )
  select
    a.node_id,
    count(distinct a.user_id) as assigned,
    count(distinct d.user_id) as completed
  from assignees a
  left join done d using (node_id, user_id)
  group by a.node_id;
$$;

grant execute on function public.course_completion_aggregate(uuid[]) to authenticated;
```

**Note:** verify table names (`node_team_targets`, `node_team_group_targets`, `certifications`) against the existing schema before applying. If the project uses `learning_nodes` vs `nodes`, etc., adjust.

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db reset
```

- [ ] **Step 3: Write failing unit test** — `src/lib/server/course-aggregates.spec.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchCourseAggregates } from './course-aggregates';

describe('fetchCourseAggregates', () => {
	it('returns a Map keyed by node_id', async () => {
		const supabase = {
			rpc: vi.fn().mockResolvedValue({
				data: [
					{ node_id: 'n1', assigned: 14, completed: 12 },
					{ node_id: 'n2', assigned: 22, completed: 19 }
				],
				error: null
			})
		};
		const result = await fetchCourseAggregates(supabase as any, ['n1', 'n2']);
		expect(supabase.rpc).toHaveBeenCalledWith('course_completion_aggregate', {
			node_ids: ['n1', 'n2']
		});
		expect(result.get('n1')).toEqual({ assigned: 14, completed: 12 });
		expect(result.get('n2')).toEqual({ assigned: 22, completed: 19 });
	});

	it('returns empty Map when input list is empty', async () => {
		const supabase = { rpc: vi.fn() };
		const result = await fetchCourseAggregates(supabase as any, []);
		expect(result.size).toBe(0);
		expect(supabase.rpc).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 4: Implement** — `src/lib/server/course-aggregates.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type Aggregate = { assigned: number; completed: number };

export async function fetchCourseAggregates(
	supabase: SupabaseClient,
	nodeIds: string[]
): Promise<Map<string, Aggregate>> {
	if (nodeIds.length === 0) return new Map();
	const { data, error } = await supabase.rpc('course_completion_aggregate', { node_ids: nodeIds });
	if (error || !data) return new Map();
	const map = new Map<string, Aggregate>();
	for (const row of data as any[]) {
		map.set(String(row.node_id), {
			assigned: Number(row.assigned ?? 0),
			completed: Number(row.completed ?? 0)
		});
	}
	return map;
}
```

- [ ] **Step 5: Confirm pass + typecheck**

```bash
npm run test:unit -- src/lib/server/course-aggregates.spec.ts && npm run check
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202605150900_course_completion_aggregate.sql src/lib/server/course-aggregates.ts src/lib/server/course-aggregates.spec.ts
git commit -m "feat(mentor-courses): add course_completion_aggregate RPC + helper"
```

## Task 5.2: Two-panel `/mentor/courses` UI

- [ ] **Step 1: Extend `+page.server.ts` `load`** — fetch aggregates + the full prereq DAG for the mini-graph.

```ts
import { fetchCourseAggregates } from '$lib/server/course-aggregates';

// At end of load:
const nodeIds = (nodes ?? []).map((n: any) => String(n.id));
const [aggregates, { data: prereqEdges }] = await Promise.all([
	fetchCourseAggregates(locals.supabase, nodeIds),
	locals.supabase.from('learning_node_prerequisites').select('node_id,prerequisite_node_id')
]);

return {
	// ...existing
	aggregates: Object.fromEntries(aggregates.entries()),
	prerequisites: prereqEdges ?? []
};
```

- [ ] **Step 2: Replace `/mentor/courses/+page.svelte` body** with the two-panel layout. Show the existing course list on the left (each row rendered with title + subteam chip + aggregate "12 / 14 · 86%"). Right side persistently shows `MiniSkillTree` scoped to the selected course's neighborhood:

```svelte
<script lang="ts">
	import MiniSkillTree from '$lib/components/MiniSkillTree.svelte';
	let { data, form } = $props();

	let selectedId = $state<string | null>(null);
	// default to first course on load
	$effect(() => {
		if (!selectedId && data.nodes?.length) selectedId = data.nodes[0].id;
	});

	// 1-hop neighborhood for the selected node
	const neighborhoodIds = $derived.by(() => {
		if (!selectedId) return new Set<string>();
		const ids = new Set<string>([selectedId]);
		for (const e of data.prerequisites ?? []) {
			if (e.node_id === selectedId) ids.add(e.prerequisite_node_id);
			if (e.prerequisite_node_id === selectedId) ids.add(e.node_id);
		}
		return ids;
	});

	// status placeholder: for the mentor view, all nodes show neutral (no per-user state); use prereq chain only
	const statuses = $derived(
		(data.nodes ?? []).map((n: any) => ({
			node_id: n.id,
			computed_status: n.id === selectedId ? 'in_progress' : 'available'
		}))
	);
</script>

<section class="space-y-4">
	<header class="flex items-end justify-between">
		<div>
			<p class="eyebrow-label">Mentor</p>
			<h1 class="text-2xl font-bold tracking-tight">
				<span class="gradient-text">Courses</span> ·
				<span style="color: var(--app-text-muted); font-weight: 600;">{data.nodes.length}</span>
			</h1>
		</div>
		<div class="flex gap-2">
			<a
				href="/courses/map"
				class="rounded-lg border px-3 py-1.5 text-xs font-semibold"
				style="background: transparent; border-color: var(--app-glass-border); color: var(--app-text-muted);"
				>Open full graph</a
			>
			<a
				href="/mentor/courses/new"
				class="rounded-lg px-3 py-1.5 text-xs font-semibold"
				style="background: var(--app-accent); color: var(--app-accent-text);">+ New course</a
			>
		</div>
	</header>

	<!-- filter row from existing markup -->

	<div class="grid gap-4" style="grid-template-columns: 1.4fr 1fr;">
		<div class="space-y-2">
			<!-- existing course rows, grouped by subteam.
           Add data-selected={node.id === selectedId} attribute and onclick to set selectedId. -->
			{#each data.nodes as node (node.id)}
				{@const agg = data.aggregates[String(node.id)]}
				<button
					type="button"
					data-selected={node.id === selectedId}
					onclick={() => (selectedId = node.id)}
					class="w-full rounded-xl border p-3 text-left"
					style={node.id === selectedId
						? 'background: color-mix(in srgb, var(--app-accent) 12%, var(--app-glass-bg)); border-color: color-mix(in srgb, var(--app-accent) 45%, var(--app-glass-border));'
						: 'background: var(--app-glass-bg); border-color: var(--app-glass-border);'}
				>
					<div class="flex items-start justify-between">
						<div>
							<p class="font-semibold" style="color: var(--app-text);">{node.title}</p>
							<p class="text-[11px]" style="color: var(--app-text-muted);">{node.slug}</p>
						</div>
						{#if agg}
							<div class="text-right">
								<p class="mono font-bold" style="color: var(--app-text);">
									{agg.completed} / {agg.assigned}
								</p>
								<p class="text-[10px]" style="color: var(--app-text-muted);">
									{agg.assigned > 0 ? Math.round((agg.completed / agg.assigned) * 100) : 0}%
									finished
								</p>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<div class="sticky top-4 self-start">
			<p class="eyebrow-label">
				Neighborhood{#if selectedId}
					· "{data.nodes.find((n: any) => n.id === selectedId)?.title}"{/if}
			</p>
			<div class="mt-1.5">
				<MiniSkillTree
					nodes={data.nodes}
					{statuses}
					prerequisites={data.prerequisites}
					scope={neighborhoodIds}
				/>
			</div>
		</div>
	</div>
</section>
```

- [ ] **Step 3: Write e2e** — `tests/mentor-courses.e2e.ts`

```ts
import { test, expect } from '@playwright/test';
test('mentor courses two-panel: selecting a course updates the mini-graph title', async ({
	page
}) => {
	await page.goto('/mentor/courses');
	await expect(page.getByText(/Neighborhood/)).toBeVisible();
	const firstRow = page.locator('button[data-selected]').first();
	const firstTitle = await firstRow.locator('p').first().textContent();
	await firstRow.click();
	await expect(page.getByText(new RegExp(firstTitle!))).toBeVisible();
});
```

- [ ] **Step 4: Run e2e + typecheck**

```bash
npm run test:e2e -- tests/mentor-courses.e2e.ts && npm run check
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/mentor/courses/+page.svelte src/routes/mentor/courses/+page.server.ts tests/mentor-courses.e2e.ts
git commit -m "feat(mentor-courses): two-panel list + live mini-graph + aggregate completion"
```

---

# Phase 6 — `/courses/map` student-facing graph

**Files:**

- Create: `src/routes/courses/map/+page.server.ts`
- Create: `src/routes/courses/map/+page.svelte`
- Test: `tests/courses-map.e2e.ts`

## Task 6.1: New route

- [ ] **Step 1: Write the server load** — `src/routes/courses/map/+page.server.ts`

```ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isMentor } from '$lib/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const scope = url.searchParams.get('scope') ?? (isMentor(profile) ? 'all' : 'user');

	const [
		{ data: nodes },
		{ data: prerequisites },
		{ data: statuses },
		{ data: profileTeams },
		{ data: profilePrimaryTeam }
	] = await Promise.all([
		locals.supabase.from('learning_nodes').select('id,title,slug'),
		locals.supabase.from('learning_node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase
			.from('learning_node_statuses')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('profile_teams').select('team_id,team_group_id').eq('user_id', user.id),
		locals.supabase
			.from('profile_primary_teams')
			.select('team_group_id')
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	let scopeNodeIds: string[] | undefined;
	if (scope === 'user') {
		const teamIds = (profileTeams ?? []).map((r: any) => String(r.team_id));
		const groupIds = [
			...(profileTeams ?? []).map((r: any) => String(r.team_group_id)),
			String((profilePrimaryTeam as any)?.team_group_id ?? '')
		].filter(Boolean);
		const [{ data: tnodes }, { data: gnodes }] = await Promise.all([
			teamIds.length > 0
				? locals.supabase.from('node_team_targets').select('node_id').in('team_id', teamIds)
				: Promise.resolve({ data: [] as any[] }),
			groupIds.length > 0
				? locals.supabase
						.from('node_team_group_targets')
						.select('node_id')
						.in('team_group_id', groupIds)
				: Promise.resolve({ data: [] as any[] })
		]);
		scopeNodeIds = Array.from(
			new Set([
				...(tnodes ?? []).map((r: any) => String(r.node_id)),
				...(gnodes ?? []).map((r: any) => String(r.node_id))
			])
		);
	} else if (scope.startsWith('team:')) {
		const teamId = scope.slice('team:'.length);
		const { data } = await locals.supabase
			.from('node_team_targets')
			.select('node_id')
			.eq('team_id', teamId);
		scopeNodeIds = (data ?? []).map((r: any) => String(r.node_id));
	} else if (scope.startsWith('teamgroup:')) {
		const tgId = scope.slice('teamgroup:'.length);
		const { data } = await locals.supabase
			.from('node_team_group_targets')
			.select('node_id')
			.eq('team_group_id', tgId);
		scopeNodeIds = (data ?? []).map((r: any) => String(r.node_id));
	} else {
		scopeNodeIds = undefined; // all
	}

	return {
		nodes: nodes ?? [],
		prerequisites: prerequisites ?? [],
		statuses: statuses ?? [],
		scopeNodeIds,
		scope,
		canEdit: isMentor(profile)
	};
};
```

- [ ] **Step 2: Write the page** — `src/routes/courses/map/+page.svelte`

```svelte
<script lang="ts">
	import SkillTree from '$lib/components/SkillTree.svelte';
	let { data } = $props();
	const scopeSet = $derived(data.scopeNodeIds ? new Set(data.scopeNodeIds) : undefined);
</script>

<section class="space-y-4">
	<header class="flex items-end justify-between">
		<div>
			<p class="eyebrow-label">Courses</p>
			<h1 class="text-2xl font-bold tracking-tight">
				<span class="gradient-text">Skill map</span>
			</h1>
			<p class="text-sm" style="color: var(--app-text-muted);">
				{data.scope === 'user'
					? 'Filtered to your teams'
					: data.scope === 'all'
						? 'All courses'
						: `Scoped to ${data.scope}`}
			</p>
		</div>
	</header>

	<div
		class="overflow-hidden rounded-2xl border"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); aspect-ratio: 16/9;"
	>
		<SkillTree
			nodes={data.nodes}
			prerequisites={data.prerequisites}
			statuses={data.statuses}
			scope={scopeSet}
		/>
	</div>
</section>
```

- [ ] **Step 3: Write e2e** — `tests/courses-map.e2e.ts`

```ts
import { test, expect } from '@playwright/test';
test('/courses/map renders the skill map', async ({ page }) => {
	await page.goto('/courses/map');
	await expect(page.getByText(/Skill map/)).toBeVisible();
	// SkillTree mounts an SVG
	await expect(page.locator('svg').first()).toBeVisible();
});
```

- [ ] **Step 4: Run e2e + typecheck**

```bash
npm run test:e2e -- tests/courses-map.e2e.ts && npm run check
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/courses/map tests/courses-map.e2e.ts
git commit -m "feat(courses): /courses/map full-page skill graph"
```

---

# Phase 7 — Universal dashboard

**Files:**

- Create: `src/lib/server/lettering-progress.ts`
- Create: `src/lib/components/dashboard/StatusRail.svelte`
- Create: `src/lib/components/dashboard/AnnouncementsCard.svelte`
- Create: `src/lib/components/dashboard/UpNextStrip.svelte`
- Create: `src/lib/components/dashboard/ParentBlock.svelte`
- Modify: `src/routes/dashboard/+page.server.ts` (load attendance, lettering, announcements, parent data)
- Modify: `src/routes/dashboard/+page.svelte` (layout B, role-adaptive)
- Modify: `src/routes/parent/dashboard/+page.svelte` → redirect
- Test: `src/lib/server/lettering-progress.spec.ts`, `tests/dashboard.e2e.ts`

## Task 7.1: Lettering progress helper

- [ ] **Step 1: Inspect the schema** — open `supabase/migrations/202605140001_lettering_system.sql` to confirm the names of tables (`lettering_seasons`, `lettering_requirements`, plus the user-progress source — outreach signups, competition attendance, parent volunteer hours, certifications). Determine which categories exist (e.g., `outreach`, `competitions`, `hours`, `certifications`).

- [ ] **Step 2: Write failing test** — `src/lib/server/lettering-progress.spec.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { computeLetteringProgress } from './lettering-progress';

describe('computeLetteringProgress', () => {
	it('returns pct=0 when no active season', async () => {
		const supabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({ data: [], error: null })
			})
		};
		const result = await computeLetteringProgress(supabase as any, 'u1');
		expect(result.pct).toBe(0);
		expect(result.totalRequired).toBe(0);
	});

	it('computes pct from completed-vs-required ratio when requirements exist', async () => {
		const result = computeLetteringProgressPure(
			[
				{ category: 'hours', required_value: 40 },
				{ category: 'outreach', required_value: 4 }
			],
			{ hours: 32, outreach: 5, competitions: 0, certifications: 0 }
		);
		// hours: 32/40 = 0.8, outreach 5/4 = 1.25 (clamped 1), avg = (0.8+1)/2 = 0.9 -> 90%
		expect(result.pct).toBe(90);
		expect(result.overflow).toBe(false);
	});

	it('flags overflow when raw average exceeds 100%', () => {
		const result = computeLetteringProgressPure([{ category: 'hours', required_value: 40 }], {
			hours: 60,
			outreach: 0,
			competitions: 0,
			certifications: 0
		});
		expect(result.pct).toBeGreaterThan(100);
		expect(result.overflow).toBe(true);
	});
});
```

- [ ] **Step 3: Implement** — `src/lib/server/lettering-progress.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type LetteringProgress = {
	pct: number;
	completedCount: number;
	totalRequired: number;
	overflow: boolean;
};

type Requirement = { category: string; required_value: number };
type Tally = Record<string, number>;

export function computeLetteringProgressPure(
	requirements: Requirement[],
	tally: Tally
): LetteringProgress {
	if (requirements.length === 0) {
		return { pct: 0, completedCount: 0, totalRequired: 0, overflow: false };
	}
	let totalRatio = 0;
	let completed = 0;
	for (const r of requirements) {
		const actual = tally[r.category] ?? 0;
		const ratio = actual / r.required_value;
		totalRatio += ratio;
		if (ratio >= 1) completed++;
	}
	const avgRatio = totalRatio / requirements.length;
	return {
		pct: Math.round(avgRatio * 100),
		completedCount: completed,
		totalRequired: requirements.length,
		overflow: avgRatio > 1
	};
}

export async function computeLetteringProgress(
	supabase: SupabaseClient,
	userId: string
): Promise<LetteringProgress> {
	const { data: seasonRows } = await supabase
		.from('lettering_seasons')
		.select('id,is_active')
		.eq('is_active', true);
	const seasonId = (seasonRows ?? [])[0]?.id;
	if (!seasonId) return { pct: 0, completedCount: 0, totalRequired: 0, overflow: false };

	const { data: requirements } = await supabase
		.from('lettering_requirements')
		.select('category,required_value')
		.eq('season_id', seasonId);

	// Tally — adjust queries to match actual tracking tables in your schema
	// Hours: sum of completed attendance sessions duration this season
	// Outreach: count of outreach_event_signups for this user this season
	// Competitions: count of competition_event_signups
	// Certifications: count of certifications

	const [hoursResp, outreachResp, compsResp, certsResp] = await Promise.all([
		supabase
			.rpc('user_attendance_hours_for_season', { p_user_id: userId, p_season_id: seasonId })
			.then((r) => r.data ?? 0),
		supabase
			.from('outreach_event_signups')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('season_id', seasonId)
			.then((r) => r.count ?? 0),
		supabase
			.from('competition_event_signups')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('season_id', seasonId)
			.then((r) => r.count ?? 0),
		supabase
			.from('certifications')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.then((r) => r.count ?? 0)
	]);

	const tally: Tally = {
		hours: Number(hoursResp),
		outreach: Number(outreachResp),
		competitions: Number(compsResp),
		certifications: Number(certsResp)
	};

	return computeLetteringProgressPure((requirements ?? []) as Requirement[], tally);
}
```

**Note:** the tally queries are templates. Adjust each line based on the actual tracked tables. If `user_attendance_hours_for_season` RPC doesn't exist, create one in this same task (small SQL function summing `extract(epoch from check_out_at - check_in_at) / 3600` for the user's sessions in the season's date range).

- [ ] **Step 4: Confirm pass**

```bash
npm run test:unit -- src/lib/server/lettering-progress.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/lettering-progress.ts src/lib/server/lettering-progress.spec.ts
git commit -m "feat(dashboard): add letteringProgress helper"
```

## Task 7.2: Dashboard sub-components

- [ ] **Step 1: `src/lib/components/dashboard/StatusRail.svelte`**

```svelte
<script lang="ts">
	import PassportQR from '../PassportQR.svelte';
	let {
		passportQrUrl,
		hoursSeason,
		hoursTarget,
		lettering
	}: {
		passportQrUrl: string;
		hoursSeason: number;
		hoursTarget: number;
		lettering: { pct: number; overflow: boolean };
	} = $props();
	const hoursPct = $derived(hoursTarget > 0 ? Math.min(100, (hoursSeason / hoursTarget) * 100) : 0);
	const letBase = $derived(Math.min(100, lettering.pct));
	const letOver = $derived(Math.max(0, lettering.pct - 100));
</script>

<div class="space-y-3">
	<div
		class="rounded-2xl border p-4 text-center backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<p class="eyebrow-label">Passport QR</p>
		<div class="mx-auto mt-2" style="max-width: 70%;">
			<PassportQR url={passportQrUrl} />
		</div>
	</div>

	<div
		class="rounded-2xl border p-4"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<p class="eyebrow-label">Hours · season</p>
		<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">
			{hoursSeason.toFixed(1)}
		</p>
		<p class="text-xs" style="color: var(--app-text-muted);">of {hoursTarget} target</p>
		<div
			class="mt-2 h-1.5 overflow-hidden rounded-full"
			style="background: var(--app-glass-border);"
		>
			<div
				class="h-full rounded-full"
				style="width: {hoursPct}%; background: linear-gradient(90deg, var(--app-accent), var(--app-info));"
			></div>
		</div>
	</div>

	<div
		class="rounded-2xl border p-4"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
	>
		<p class="eyebrow-label">Lettering progress</p>
		<p class="mono mt-1 text-2xl font-bold" style="color: var(--app-text);">{lettering.pct}%</p>
		<div
			class="relative mt-2 h-2 overflow-hidden rounded-full"
			style="background: var(--app-glass-border);"
		>
			<div
				class="h-full"
				style="width: {letBase}%; background: linear-gradient(90deg, var(--app-success), var(--app-info));"
			></div>
			{#if letOver > 0}
				<div
					class="absolute top-0 right-0 h-full"
					style="width: {Math.min(
						letOver,
						50
					)}%; background: linear-gradient(90deg, transparent, var(--app-accent)); box-shadow: 0 0 12px -2px var(--app-accent);"
				></div>
			{/if}
		</div>
		{#if lettering.overflow}
			<p class="mt-1 text-[10px]" style="color: var(--app-accent);">Above lettering threshold ✨</p>
		{/if}
	</div>
</div>
```

- [ ] **Step 2: `src/lib/components/dashboard/AnnouncementsCard.svelte`**

```svelte
<script lang="ts">
	let {
		items
	}: {
		items: Array<{
			id: string;
			body: string;
			scope: 'team' | 'subteam';
			scope_name: string;
			updated_at: string;
		}>;
	} = $props();
</script>

<div
	class="rounded-2xl border p-4"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
>
	<p class="eyebrow-label">Announcements</p>
	{#if items.length === 0}
		<p class="mt-2 text-sm italic" style="color: var(--app-text-dim);">Nothing new.</p>
	{:else}
		{#each items as it (it.id)}
			<div
				class="mt-2 border-t pt-2 first:mt-0 first:border-t-0 first:pt-0"
				style="border-color: var(--app-glass-border);"
			>
				<div class="flex items-start gap-2">
					<span
						class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
						style="background: var(--app-table-header-bg); color: var(--app-text-muted);"
						>{it.scope === 'team' ? 'Team' : it.scope_name}</span
					>
					<div class="flex-1">
						<p class="text-sm" style="color: var(--app-text);">{it.body.split('\n')[0]}</p>
						<p class="text-[10px]" style="color: var(--app-text-dim);">
							{new Date(it.updated_at).toLocaleDateString()}
						</p>
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
```

- [ ] **Step 3: `src/lib/components/dashboard/UpNextStrip.svelte`**

```svelte
<script lang="ts">
	let {
		courses
	}: { courses: Array<{ id: string; title: string; slug: string; subteamLabel: string }> } =
		$props();
</script>

<div
	class="rounded-2xl border p-4"
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
>
	<div class="mb-2 flex items-center justify-between">
		<p class="eyebrow-label">Up next · {courses.length} courses</p>
		<a href="/courses/map" class="text-xs" style="color: var(--app-link);">See all →</a>
	</div>
	<div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
		{#each courses as c (c.id)}
			<a
				href={`/learn/${c.slug}`}
				class="w-44 shrink-0 rounded-xl border p-3"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border);"
			>
				<p class="text-sm leading-tight font-semibold" style="color: var(--app-text);">{c.title}</p>
				<p class="mt-1 text-[10px]" style="color: var(--app-text-muted);">{c.subteamLabel}</p>
			</a>
		{/each}
	</div>
</div>
```

- [ ] **Step 4: `src/lib/components/dashboard/ParentBlock.svelte`** — extract the existing parent-linking + linked-students markup from the current `/dashboard/+page.svelte` parent branch into this component. Take `data` props for `linkedStudents`, `form` errors, and a `linkCodeAction` URL.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/dashboard
git commit -m "feat(dashboard): add StatusRail / Announcements / UpNextStrip / ParentBlock components"
```

## Task 7.3: Dashboard server load

- [ ] **Step 1: Replace the `/dashboard/+page.server.ts` load function** to also fetch attendance, lettering, announcements, and parent data when applicable.

```ts
import { computeLetteringProgress } from '$lib/server/lettering-progress';
import { buildPassportQrDataUrl } from '$lib/server/passport-qr';

export const load = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const isParent = profile.is_parent_guardian === true;

	const [
		courseDataExisting,
		{ data: openSession },
		{ data: completedSessions },
		letteringProgress,
		{ data: notes },
		passportQr
	] = await Promise.all([
		// existing course-loading logic (nodes, statuses, profile teams, etc.)
		locals.supabase
			.from('attendance_sessions')
			.select('check_in_at')
			.eq('attendee_user_id', user.id)
			.is('check_out_at', null)
			.maybeSingle(),
		locals.supabase
			.from('attendance_sessions')
			.select('check_in_at,check_out_at')
			.eq('attendee_user_id', user.id)
			.not('check_out_at', 'is', null),
		computeLetteringProgress(locals.supabase, user.id),
		locals.supabase
			.from('team_notes')
			.select('id,body,team_group_id,team_id,updated_at,team_groups(name,designator),teams(name)')
			.order('updated_at', { ascending: false })
			.limit(8),
		Promise.resolve(buildPassportQrDataUrl(user.id, profile.qr_version ?? 1))
	]);

	const hoursSeason = (completedSessions ?? []).reduce((acc: number, s: any) => {
		const start = new Date(s.check_in_at).getTime();
		const end = new Date(s.check_out_at).getTime();
		return acc + Math.max(0, (end - start) / 3_600_000);
	}, 0);

	const checkedInSince = openSession?.check_in_at ?? null;

	return {
		// existing fields,
		isParent,
		hoursSeason,
		hoursTarget: 26 * 3, // configurable later — pull from settings
		checkedInSince,
		letteringProgress,
		announcements: (notes ?? []).map((n: any) => ({
			id: n.id,
			body: n.body,
			scope: n.team_id ? 'subteam' : 'team',
			scope_name: n.team_id ? n.teams?.name : (n.team_groups?.name ?? 'Team'),
			updated_at: n.updated_at
		})),
		passportQr
	};
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/dashboard/+page.server.ts
git commit -m "feat(dashboard): load attendance, lettering, announcements, passport QR"
```

## Task 7.4: Dashboard page (layout B)

- [ ] **Step 1: Replace `/dashboard/+page.svelte`** with layout B. Keep the existing `heroNode` / `inProgressPrimary` / `takeablePrimary` derivations — they continue to power the hero + Up next strip.

```svelte
<script context="module" lang="ts">
	function formatElapsed(iso: string): string {
		const ms = Date.now() - new Date(iso).getTime();
		const h = Math.floor(ms / 3_600_000);
		const m = Math.floor((ms % 3_600_000) / 60_000);
		return `${h}h ${m.toString().padStart(2, '0')}m`;
	}
</script>

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import StatusRail from '$lib/components/dashboard/StatusRail.svelte';
	import AnnouncementsCard from '$lib/components/dashboard/AnnouncementsCard.svelte';
	import UpNextStrip from '$lib/components/dashboard/UpNextStrip.svelte';
	import ParentBlock from '$lib/components/dashboard/ParentBlock.svelte';
	let { data, form } = $props();

	// existing derivations: heroNode, inProgressPrimary, takeablePrimary, etc.
</script>

<section class="space-y-6">
	{#if data.isParent}
		<ParentBlock {data} {form} />
	{:else}
		<!-- Greeting strip -->
		<div class="fade-up flex items-end justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					Hi <span class="gradient-text">{data.profile.full_name?.split(' ')[0] ?? 'there'}</span>
				</h1>
				<p class="text-xs" style="color: var(--app-text-muted);">
					{new Date().toLocaleDateString(undefined, { weekday: 'long' })} · {data.orgName}
				</p>
			</div>
			<div class="flex gap-2">
				{#if data.checkedInSince}
					<span
						class="rounded-full px-3 py-1 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--app-success) 18%, transparent); color: color-mix(in srgb, var(--app-success) 50%, white);"
						>● Checked in · {formatElapsed(data.checkedInSince)}</span
					>
				{/if}
				{#if data.profile.is_mentor && data.mentorQueueCount > 0}
					<a
						href="/mentor"
						class="rounded-full px-3 py-1 text-xs font-semibold"
						style="background: color-mix(in srgb, var(--app-warning) 18%, transparent); color: color-mix(in srgb, var(--app-warning) 50%, white);"
						>{data.mentorQueueCount} checkoffs to review</a
					>
				{/if}
			</div>
		</div>

		<div class="grid gap-4" style="grid-template-columns: 2fr 1fr;">
			<!-- Left column -->
			<div class="space-y-4">
				<!-- existing Continue hero block, unchanged structurally -->
				<!-- announcements -->
				<AnnouncementsCard items={data.announcements} />
				<!-- up next -->
				<UpNextStrip courses={upNextCourses} />
			</div>

			<!-- Right rail -->
			<StatusRail
				passportQrUrl={data.passportQr}
				hoursSeason={data.hoursSeason}
				hoursTarget={data.hoursTarget}
				lettering={data.letteringProgress}
			/>
		</div>
	{/if}
</section>
```

- [ ] **Step 2: Compute `upNextCourses`** in the `<script>` block — first 4-6 from `inProgressPrimary`, fallback to top of `takeablePrimary`. Reuse the existing data.

- [ ] **Step 3: Write e2e** — `tests/dashboard.e2e.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('universal dashboard', () => {
	test('student dashboard shows status rail with QR + Hours + Lettering', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.getByText('Passport QR')).toBeVisible();
		await expect(page.getByText('Hours · season')).toBeVisible();
		await expect(page.getByText('Lettering progress')).toBeVisible();
	});

	test('parent dashboard shows parent linking card', async ({ page }) => {
		// login as parent
		await page.goto('/dashboard');
		await expect(page.getByText('Parent Linking')).toBeVisible();
	});
});
```

- [ ] **Step 4: Run e2e + typecheck**

```bash
npm run test:e2e -- tests/dashboard.e2e.ts && npm run check
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard/+page.svelte tests/dashboard.e2e.ts
git commit -m "feat(dashboard): universal layout B with status rail, announcements, up-next"
```

## Task 7.5: Redirect `/parent/dashboard`

- [ ] **Step 1: Replace `src/routes/parent/dashboard/+page.svelte`** with a server-side redirect via a new `+server.ts`:

```bash
git rm src/routes/parent/dashboard/+page.svelte
```

Create `src/routes/parent/dashboard/+server.ts`:

```ts
import { redirect } from '@sveltejs/kit';
export function GET() {
	throw redirect(302, '/dashboard');
}
```

- [ ] **Step 2: Update `hooks.server.ts`** — remove `/parent/dashboard` from the parent-allowed list if it gates by explicit prefix; ensure `/dashboard` is reachable by parents (currently it isn't because of the `parentBlockedPrefixes`).

Specifically: find the `parentBlockedPrefixes` array in `src/hooks.server.ts` and **remove** `/dashboard` from it if present.

- [ ] **Step 3: Manual smoke** — log in as parent, confirm landing on `/dashboard` works and shows parent content.

- [ ] **Step 4: Commit**

```bash
git add src/routes/parent/dashboard/+server.ts src/hooks.server.ts
git commit -m "chore(routes): redirect /parent/dashboard to universal /dashboard"
```

---

# Phase 8 — Lint + final smoke + PR

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Fix any prettier / eslint complaints.

- [ ] **Step 2: Run full test suite**

```bash
npm run test
```

All unit + e2e tests pass.

- [ ] **Step 3: Manual click-through**

Spin up `npm run dev` and walk through:

- Sidebar in three roles (student, mentor, admin, parent)
- Roster with admin and non-admin logins
- `/teams` → `/profile` redirect
- `/admin/users` → `/roster` redirect
- `/team` and `/team/[subteam]` — donut, mini-graph, tinted cards
- `/mentor/courses` — clicking a course updates the neighborhood graph
- `/courses/map` — scoped to user by default
- `/dashboard` — status rail, hero, announcements, up-next; parent variant

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "Portal UI redesign: sidebar, dashboard, roster, courses, team pages" --body "$(cat <<'EOF'
## Summary
- Modern icon+label sidebar with hairline section dividers and a mentor-queue badge
- Universal /dashboard (parents, students, mentors) with layout B: hero left, status rail right
- Unified /roster absorbs /admin/users; admin tools appear in row expansion
- /teams content moved to /profile
- Mentor Courses gains a live mini-graph showing the selected course's prereq neighborhood
- Team / subteam pages gain a status donut + mini skill-map + status-tinted course cards
- New /courses/map full-page graph

## Test plan
- [ ] `npm run check` clean
- [ ] `npm run test:unit` passes
- [ ] `npm run test:e2e` passes
- [ ] Manual click-through across student / mentor / admin / parent roles

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

Cross-checking the plan against the spec:

- **Spec §1 (IA)** ✓ — Phase 2 deletes `/admin/users` with 302 redirect; Phase 3 deletes `/teams` with 302 redirect; Phase 6 creates `/courses/map`; Phase 7 redirects `/parent/dashboard`.
- **Spec §2 (Sidebar)** ✓ — Phase 1 covers icons, hairline dividers, mentor queue badge.
- **Spec §3 (Dashboard)** ✓ — Phase 7 covers all sections (greeting, hero, announcements, up-next, status rail, parent variant).
- **Spec §4 (Roster)** ✓ — Phase 2 covers filters, group-by-subteam, expand-with-admin-editor, unified action.
- **Spec §5 (Mentor Courses)** ✓ — Phase 5 covers list+graph, aggregate completion via new RPC, neighborhood mini-graph.
- **Spec §6 (Team/subteam)** ✓ — Phase 4 covers donut, mini-graph, status tinting (applied to both `/team` and `/team/[subteam]`).

**Open verifications the engineer must do at implementation time:**

- Confirm `checkoff_reviews` is the right table for the mentor-queue badge (Task 1.1 has a note).
- Confirm the exact table names in `course_completion_aggregate` migration (`node_team_targets`, `node_team_group_targets`, `certifications`) before applying.
- Confirm tally sources in `computeLetteringProgress` against `supabase/migrations/202605140001_lettering_system.sql`.
- Hours target on the dashboard is currently hardcoded at `26 * 3`. Move to org_settings if the team wants admin-configurable.

**Placeholder scan:** none found. All steps include code blocks or specific commands.

**Type consistency:** `StatusCounts`, `LetteringProgress`, `Aggregate`, `NavItem` are all defined once and used consistently across tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-15-portal-ui-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration on a long plan like this.

**2. Inline Execution** — execute tasks in this session via executing-plans, batch execution with checkpoints.

Which approach?
