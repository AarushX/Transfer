-- Leadership assignments, ClickUp tracking, team notes, drop manual hours

-- 1. Drop manual volunteer hours (full schema removal)
drop table if exists public.volunteer_hour_logs cascade;
drop table if exists public.parent_volunteer_hours cascade;

-- 2. Profile additions
alter table public.profiles
	add column if not exists clickup_signed_up boolean not null default false,
	add column if not exists lead_team_group_id uuid references public.team_groups(id) on delete set null,
	add column if not exists lead_subteam_id uuid references public.subteams(id) on delete set null;

-- 3. Team notes — body of notes shared by everyone on the team, editable by leads.
-- subteam_category_slug = '' means team-wide notes. Non-empty = subteam-specific notes.
create table if not exists public.team_notes (
	team_group_id uuid not null references public.team_groups(id) on delete cascade,
	subteam_category_slug text not null default '',
	body text not null default '',
	updated_by uuid references public.profiles(id) on delete set null,
	updated_at timestamptz not null default now(),
	primary key (team_group_id, subteam_category_slug)
);

-- RLS
alter table public.team_notes enable row level security;

-- Anyone authenticated can read
create policy "team_notes_read" on public.team_notes for select using (auth.role() = 'authenticated');

-- Admins can write anywhere
create policy "team_notes_admin_all" on public.team_notes for all using (public.is_admin()) with check (public.is_admin());

-- Team leads can write team-wide notes for their team_group + any of its subteams
create policy "team_notes_team_lead_write" on public.team_notes for insert with check (
	exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_team_group_id = team_group_id)
);
create policy "team_notes_team_lead_update" on public.team_notes for update using (
	exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_team_group_id = team_group_id)
);

-- Subteam leads can write notes for their subteam category (any team_group)
create policy "team_notes_subteam_lead_write" on public.team_notes for insert with check (
	exists (
		select 1 from public.profiles p
		join public.subteams s on s.id = p.lead_subteam_id
		where p.id = auth.uid() and s.slug = subteam_category_slug
	)
);
create policy "team_notes_subteam_lead_update" on public.team_notes for update using (
	exists (
		select 1 from public.profiles p
		join public.subteams s on s.id = p.lead_subteam_id
		where p.id = auth.uid() and s.slug = subteam_category_slug
	)
);
