-- Allow subteams to be linked to multiple main teams and store a user's primary main team.

create table if not exists public.team_group_subteam_links (
    team_group_id uuid not null references public.team_groups (id) on delete cascade,
    team_id uuid not null references public.teams (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (team_group_id, team_id)
);

create index if not exists idx_team_group_subteam_links_team
    on public.team_group_subteam_links (team_id);

insert into public.team_group_subteam_links (team_group_id, team_id)
select t.team_group_id, t.id
from public.teams t
on conflict do nothing;

alter table public.team_group_subteam_links enable row level security;

drop policy if exists "team_group_subteam_links_read" on public.team_group_subteam_links;
create policy "team_group_subteam_links_read" on public.team_group_subteam_links
    for select using (auth.role() = 'authenticated');

drop policy if exists "team_group_subteam_links_mentor_write" on public.team_group_subteam_links;
create policy "team_group_subteam_links_mentor_write" on public.team_group_subteam_links
    for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

create table if not exists public.profile_primary_teams (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    team_group_id uuid not null references public.team_groups (id) on delete cascade,
    updated_at timestamptz not null default now()
);

alter table public.profile_primary_teams enable row level security;

drop policy if exists "profile_primary_teams_select_own_or_mentor" on public.profile_primary_teams;
create policy "profile_primary_teams_select_own_or_mentor" on public.profile_primary_teams
    for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "profile_primary_teams_write_own_or_mentor" on public.profile_primary_teams;
create policy "profile_primary_teams_write_own_or_mentor" on public.profile_primary_teams
    for all using (user_id = auth.uid() or public.is_mentor_or_admin())
    with check (user_id = auth.uid() or public.is_mentor_or_admin());
