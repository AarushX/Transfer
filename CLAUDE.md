# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FRC robotics team management portal: Say-Show-Do training/certification LMS, mentor checkoff queue, parent volunteer system, attendance kiosk, machine-shop QR authorization. SvelteKit 2 + Svelte 5 (runes mode) + Tailwind 4 + Supabase, deployed to Vercel (Node 22). See `FEATURES.md` for the full user-facing feature inventory and `README.md` for the high-level pitch.

## Commands

- `npm run dev` — Vite dev server.
- `npm run build` / `npm run preview` — production build (Vercel adapter) and local preview.
- `npm run check` — `svelte-kit sync` + `svelte-check` (typecheck for `.svelte` + `.ts`). Run this for type errors; there is no separate `tsc`.
- `npm run lint` — Prettier check + ESLint. `npm run format` writes fixes.
- `npm run test:unit` — Vitest (Node env, files matching `src/**/*.{test,spec}.ts`, excluding `.svelte.{test,spec}`). Run a single file with `npm run test:unit -- src/lib/foo.spec.ts`; a single test name with `-- -t "name"`.
- `npm run test:e2e` — Playwright; builds + previews on port 4173 first. Tests live in `tests/**/*.e2e.ts`.
- `npm run test` — unit (one-shot) then e2e.
- `npx supabase start` then `npx supabase db reset` — local Supabase stack with all migrations + `supabase/seed.sql` applied. Use this rather than hand-applying SQL.

Install note from README: `npm install --force` may be required on non-LTS Node.

## Required env (`.env`)

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEAM_EMAIL_DOMAIN` (gates non-parent logins), `PASSPORT_QR_SECRET` (HS256 secret for passport JWTs), `ATTENDANCE_TIMEZONE`. Email blasts additionally need `GMAIL_USER` / `GMAIL_APP_PASSWORD`.

## Architecture

### Auth, roles, and route guards

All access control flows through `src/hooks.server.ts`. It builds two Supabase clients per request via `src/lib/server/supabase.ts`:

- `event.locals.supabase` — anon client bound to the user's cookies; **subject to RLS**. Use this for normal user-scoped queries.
- `createSupabaseServiceClient()` — service-role client; **bypasses RLS**. Use sparingly: admin operations, parent-portal queries that can't be expressed as RLS, and cross-user reads.

`event.locals.safeGetSession()` (memoized per request) returns `{ user, profile }` where `profile` is loaded via the **service client** so RLS recursion can't lock users out of their own profile. The hook also enforces the `TEAM_EMAIL_DOMAIN` for non-parents (signs them out + redirects), and applies route prefix guards:

- Unauthenticated → `/login` (allowed-public list in `PUBLIC_ROUTES` + `/auth/*` + `/api/attendance/public/*`).
- `/mentor/*`, `/roster/*` → must pass `isMentor()`.
- `/admin/*` → must pass `isAdmin()`.
- Parents (`is_parent_guardian`) are confined to `/parent/*` — a long `parentBlockedPrefixes` list redirects them out of student/mentor/admin areas.

Use the helpers from `src/lib/roles.ts` (`isAdmin`, `isMentor`, `isLead`, `isParentGuardian`) — they tolerate both the legacy `role` enum and the newer `base_role` + boolean flag model. Do not hand-roll role checks.

### Data layer

Schema, RLS policies, triggers, and RPCs live entirely in `supabase/migrations/*.sql` (75+ files, named `202604170NNN_*.sql`). When changing data shape, add a new migration — do not edit prior ones. Seed data is in `supabase/seed.sql`.

Important RPCs/triggers that route code depends on (do not rename without updating callers):
- `sync_profile_courseloads_for_user` — assigns courses when a user picks their team during onboarding.
- `auto_create_family` — creates a `families` row when a parent links a student.
- `transition_certification`, `try_auto_complete_node` — pipeline that moves a student's certification through video → quiz → checkoff states.

### SvelteKit conventions

- Svelte 5 **runes mode is forced** for all non-`node_modules` files (`svelte.config.js`). Write `$state`, `$derived`, `$props`, `$effect` — not `export let` / `$:` reactivity.
- Route data is loaded server-side in `+page.server.ts` / `+layout.server.ts` using `locals.supabase` (or the service client when crossing user boundaries). API endpoints live under `src/routes/api/<area>/<name>/+server.ts`.
- `src/lib/server/*` is server-only (Supabase service client, email, JWT signing). Importing it from client code will (correctly) break the build.
- Path aliases: `$lib` → `src/lib`.

### Passport QR & machine flow

Passport QR codes are HS256-signed JWTs (`{ user_id, qr_version }`) built in `src/lib/server/passport-qr.ts`. Refreshing a passport bumps `qr_version` on the profile, invalidating older tokens — every scanner endpoint (`/api/mentor/resolve-qr`, `/api/machines/use`, `/api/attendance/scan`) re-checks the current version. When adding new scan flows, validate the version too; don't trust `user_id` alone.

### Theming

The portal supports 25+ runtime-configurable color variables exposed as CSS custom properties (managed in `/admin/settings`). UI code must read theme colors via those variables — do not hardcode hex values in components.

## Conventions to preserve

- Prettier config + Tailwind plugin enforce formatting; ESLint config in `eslint.config.js`. Run `npm run lint` before considering a change done.
- Vitest config in `vite.config.ts` requires assertions in every test (`expect.requireAssertions: true`) — empty/assertionless tests will fail.
- The e2e webServer command is `npm run build && npm run preview`, so e2e tests run against the *production build*, not dev.
