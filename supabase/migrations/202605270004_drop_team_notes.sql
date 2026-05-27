-- Drop the old free-form team notes + timeline. They've been replaced by
-- the subteam_resources pinboard (previous migration).

drop policy if exists "team_notes_entries_read" on public.team_notes_entries;
drop policy if exists "team_notes_entries_write" on public.team_notes_entries;
drop policy if exists "team_notes_entries_update" on public.team_notes_entries;
drop policy if exists "team_notes_entries_delete" on public.team_notes_entries;
drop table if exists public.team_notes_entries;

drop policy if exists "team_notes_read" on public.team_notes;
drop policy if exists "team_notes_write" on public.team_notes;
drop policy if exists "team_notes_update" on public.team_notes;
drop table if exists public.team_notes;
