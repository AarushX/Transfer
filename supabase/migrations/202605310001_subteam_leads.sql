-- Subteam leads: each subteam (teams row) can have a designated lead.
-- The lead lives on the subteam, a user may lead several subteams, and
-- profiles.is_lead is kept in sync by a trigger so existing badge/role logic
-- (isLead, roleBadgeParts) keeps working.

-- 1. Lead column on the subteam.
alter table public.teams
	add column if not exists lead_user_id uuid references public.profiles(id) on delete set null;

create index if not exists teams_lead_user_id_idx on public.teams (lead_user_id);

-- 2. Recompute profiles.is_lead from the sources of truth:
--    leads at least one subteam, OR leads a whole main team (lead_team_group_id),
--    OR holds the legacy student_lead role.
create or replace function public.recompute_is_lead(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if uid is null then
		return;
	end if;
	update public.profiles p
	set is_lead = (
		exists (select 1 from public.teams t where t.lead_user_id = uid)
		or p.lead_team_group_id is not null
		or coalesce(p.role = 'student_lead', false)
	)
	where p.id = uid;
end;
$$;

-- Recompute for the affected lead(s) whenever a subteam's lead changes.
create or replace function public.teams_lead_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if tg_op = 'INSERT' then
		perform public.recompute_is_lead(new.lead_user_id);
	elsif tg_op = 'DELETE' then
		perform public.recompute_is_lead(old.lead_user_id);
	else
		if new.lead_user_id is distinct from old.lead_user_id then
			perform public.recompute_is_lead(old.lead_user_id);
			perform public.recompute_is_lead(new.lead_user_id);
		end if;
	end if;
	return null;
end;
$$;

drop trigger if exists teams_lead_sync_trg on public.teams;
create trigger teams_lead_sync_trg
	after insert or update or delete on public.teams
	for each row execute function public.teams_lead_sync();

-- Keep is_lead correct when the main-team lead assignment changes on a profile.
create or replace function public.profiles_lead_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.lead_team_group_id is distinct from old.lead_team_group_id then
		perform public.recompute_is_lead(new.id);
	end if;
	return null;
end;
$$;

drop trigger if exists profiles_lead_sync_trg on public.profiles;
create trigger profiles_lead_sync_trg
	after update of lead_team_group_id on public.profiles
	for each row execute function public.profiles_lead_sync();

-- Backfill: nothing leads any subteam yet, so just ensure existing main-team /
-- legacy leads remain flagged (no-op for everyone else).
update public.profiles p
set is_lead = (
	p.lead_team_group_id is not null
	or coalesce(p.role = 'student_lead', false)
)
where p.is_lead is distinct from (
	p.lead_team_group_id is not null
	or coalesce(p.role = 'student_lead', false)
)
and not exists (select 1 from public.teams t where t.lead_user_id = p.id);

-- 3. Re-key the subteam-lead team_notes policies onto the new model so a
-- subteam lead can edit the notes for the subteam they actually lead.
drop policy if exists "team_notes_subteam_lead_write" on public.team_notes;
drop policy if exists "team_notes_subteam_lead_update" on public.team_notes;

create policy "team_notes_subteam_lead_write" on public.team_notes for insert with check (
	exists (
		select 1 from public.teams t
		where t.lead_user_id = auth.uid()
			and t.team_group_id = team_notes.team_group_id
			and t.category_slug = team_notes.subteam_category_slug
	)
);
create policy "team_notes_subteam_lead_update" on public.team_notes for update using (
	exists (
		select 1 from public.teams t
		where t.lead_user_id = auth.uid()
			and t.team_group_id = team_notes.team_group_id
			and t.category_slug = team_notes.subteam_category_slug
	)
);
