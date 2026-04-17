create table if not exists public.attendance_display_sessions (
	id uuid primary key default gen_random_uuid(),
	attendee_user_id uuid not null references public.profiles (id) on delete cascade,
	access_token text not null unique,
	activated_at timestamptz,
	activated_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_display_sessions_attendee
	on public.attendance_display_sessions (attendee_user_id, created_at desc);

alter table public.attendance_display_sessions enable row level security;

drop policy if exists "attendance_display_sessions_select_mentor_or_owner" on public.attendance_display_sessions;
create policy "attendance_display_sessions_select_mentor_or_owner" on public.attendance_display_sessions
	for select using (attendee_user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "attendance_display_sessions_insert_authenticated" on public.attendance_display_sessions;
create policy "attendance_display_sessions_insert_authenticated" on public.attendance_display_sessions
	for insert with check (auth.role() = 'authenticated');

drop policy if exists "attendance_display_sessions_update_mentor_or_owner" on public.attendance_display_sessions;
create policy "attendance_display_sessions_update_mentor_or_owner" on public.attendance_display_sessions
	for update using (attendee_user_id = auth.uid() or public.is_mentor_or_admin())
	with check (attendee_user_id = auth.uid() or public.is_mentor_or_admin());
