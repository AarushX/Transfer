-- Allow admin/mentor writes for team hierarchy tables.
drop policy if exists "team_groups_mentor_write" on public.team_groups;
create policy "team_groups_mentor_write" on public.team_groups
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "teams_mentor_write" on public.teams;
create policy "teams_mentor_write" on public.teams
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "profile_teams_mentor_write" on public.profile_teams;
create policy "profile_teams_mentor_write" on public.profile_teams
	for all using (public.is_mentor_or_admin() or user_id = auth.uid())
	with check (public.is_mentor_or_admin() or user_id = auth.uid());

-- Destructive reset: clear pre-seeded team/subteam hierarchy so admins can build custom structure.
delete from public.profile_teams;
delete from public.node_team_targets;
delete from public.node_team_group_targets;
delete from public.teams;
delete from public.team_groups;
