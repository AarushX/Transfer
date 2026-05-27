-- Admin-editable multi-step onboarding.
--
-- onboarding_steps is the curated list students walk through on first login.
-- onboarding_progress is one row per user per step they've engaged with.
-- A step is "satisfied" when the user has a row with completed_at set.
--
-- Step kinds:
--   welcome       — read-only intro page (admin-authored title + body)
--   team_pick     — runs the existing team/subteam picker (in-app form)
--   external_link — opens an external URL (e.g. ClickUp signup) and tracks
--                   the click; user confirms with a checkbox afterwards.
--   content       — read-only informational page (e.g. PWA install how-to)

create table if not exists public.onboarding_steps (
	id uuid primary key default gen_random_uuid(),
	position int not null default 100,
	kind text not null check (kind in ('welcome', 'team_pick', 'external_link', 'content')),
	title text not null,
	body text not null default '',
	link_url text not null default '',
	requires_link_click boolean not null default false,
	requires_checkbox boolean not null default false,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_onboarding_steps_position on public.onboarding_steps (position);

create table if not exists public.onboarding_progress (
	user_id uuid not null references public.profiles (id) on delete cascade,
	step_id uuid not null references public.onboarding_steps (id) on delete cascade,
	link_clicked_at timestamptz,
	completed_at timestamptz,
	primary key (user_id, step_id)
);

create index if not exists idx_onboarding_progress_user on public.onboarding_progress (user_id);

alter table public.onboarding_steps enable row level security;
alter table public.onboarding_progress enable row level security;

drop policy if exists "onboarding_steps_read" on public.onboarding_steps;
create policy "onboarding_steps_read" on public.onboarding_steps
	for select using (auth.role() = 'authenticated');

drop policy if exists "onboarding_steps_admin_write" on public.onboarding_steps;
create policy "onboarding_steps_admin_write" on public.onboarding_steps
	for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "onboarding_progress_self_read" on public.onboarding_progress;
create policy "onboarding_progress_self_read" on public.onboarding_progress
	for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "onboarding_progress_self_write" on public.onboarding_progress;
create policy "onboarding_progress_self_write" on public.onboarding_progress
	for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed: the default flow. Admins can rearrange, edit, or delete these
-- through the admin editor at /admin/onboarding.
insert into public.onboarding_steps (position, kind, title, body, link_url, requires_link_click, requires_checkbox)
values
	(10, 'welcome', 'Welcome to the team', 'Glad to have you here. This onboarding takes about 5 minutes — pick your team, sign up for our tools, and you''re set.', '', false, false),
	(20, 'team_pick', 'Pick your team and subteam', 'Choose where you''re working this season. A mentor can add additional subteams to you later if you switch.', '', false, false),
	(30, 'external_link', 'Sign up for ClickUp', 'We track tasks and meetings in ClickUp. Click the link to create your account, then come back and check the box to confirm.', 'https://app.clickup.com/signup/sso/google_sso', true, true),
	(40, 'content', 'Install the portal on your phone', 'On your phone, tap the share menu and choose "Add to Home Screen" so the scan page is one tap away. We use it at the door for sign-in.', '', false, false)
on conflict do nothing;
