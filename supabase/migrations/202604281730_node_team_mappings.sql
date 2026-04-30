-- Module ownership/mapping moves from legacy nodes.subteam_id to team-based mappings.

alter table public.nodes
	alter column subteam_id drop not null;

create table if not exists public.node_team_targets (
	node_id uuid not null references public.nodes (id) on delete cascade,
	team_id uuid not null references public.teams (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (node_id, team_id)
);

create index if not exists idx_node_team_targets_team on public.node_team_targets (team_id);

alter table public.node_team_targets enable row level security;

drop policy if exists "node_team_targets_read" on public.node_team_targets;
create policy "node_team_targets_read" on public.node_team_targets
	for select using (auth.role() = 'authenticated');

drop policy if exists "node_team_targets_mentor_write" on public.node_team_targets;
create policy "node_team_targets_mentor_write" on public.node_team_targets
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

-- One-time backfill from legacy subteams.
-- ftc-program -> all program teams with ftc-* slug
insert into public.node_team_targets (node_id, team_id)
select n.id, t.id
from public.nodes n
join public.subteams s on s.id = n.subteam_id
join public.teams t on t.slug like 'ftc-%'
join public.team_groups g on g.id = t.team_group_id and g.slug = 'program'
where s.slug = 'ftc-program'
on conflict do nothing;

-- frc-program -> all program teams with frc-* slug
insert into public.node_team_targets (node_id, team_id)
select n.id, t.id
from public.nodes n
join public.subteams s on s.id = n.subteam_id
join public.teams t on t.slug like 'frc-%'
join public.team_groups g on g.id = t.team_group_id and g.slug = 'program'
where s.slug = 'frc-program'
on conflict do nothing;

-- leadership -> all teams
insert into public.node_team_targets (node_id, team_id)
select n.id, t.id
from public.nodes n
join public.subteams s on s.id = n.subteam_id
cross join public.teams t
where s.slug = 'leadership'
on conflict do nothing;
