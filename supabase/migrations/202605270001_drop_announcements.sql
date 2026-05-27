-- Remove the announcements feature entirely.
drop policy if exists "announcements_read" on public.announcements;
drop policy if exists "announcements_write" on public.announcements;
drop policy if exists "announcements_update" on public.announcements;
drop policy if exists "announcements_delete" on public.announcements;
drop table if exists public.announcements;
