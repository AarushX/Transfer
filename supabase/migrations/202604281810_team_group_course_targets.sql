-- Team-level course targets (in addition to subteam-level targets).

create table if not exists public.node_team_group_targets (
	node_id uuid not null references public.nodes (id) on delete cascade,
	team_group_id uuid not null references public.team_groups (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (node_id, team_group_id)
);

create index if not exists idx_node_team_group_targets_group
	on public.node_team_group_targets (team_group_id);

alter table public.node_team_group_targets enable row level security;

drop policy if exists "node_team_group_targets_read" on public.node_team_group_targets;
create policy "node_team_group_targets_read" on public.node_team_group_targets
	for select using (auth.role() = 'authenticated');

drop policy if exists "node_team_group_targets_mentor_write" on public.node_team_group_targets;
create policy "node_team_group_targets_mentor_write" on public.node_team_group_targets
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());
