create table if not exists public.mentor_subteam_preferences (
	mentor_id uuid not null references public.profiles (id) on delete cascade,
	subteam_id uuid not null references public.subteams (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (mentor_id, subteam_id)
);

alter table public.mentor_subteam_preferences enable row level security;

drop policy if exists "mentor_subteam_prefs_select" on public.mentor_subteam_preferences;
create policy "mentor_subteam_prefs_select" on public.mentor_subteam_preferences
	for select
	using (mentor_id = auth.uid() or public.is_admin());

drop policy if exists "mentor_subteam_prefs_insert" on public.mentor_subteam_preferences;
create policy "mentor_subteam_prefs_insert" on public.mentor_subteam_preferences
	for insert
	with check (
		(mentor_id = auth.uid() and public.is_mentor_or_admin())
		or public.is_admin()
	);

drop policy if exists "mentor_subteam_prefs_delete" on public.mentor_subteam_preferences;
create policy "mentor_subteam_prefs_delete" on public.mentor_subteam_preferences
	for delete
	using (
		(mentor_id = auth.uid() and public.is_mentor_or_admin())
		or public.is_admin()
	);
