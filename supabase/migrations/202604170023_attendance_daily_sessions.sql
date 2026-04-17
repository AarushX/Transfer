create table if not exists public.attendance_daily_sessions (
	id uuid primary key default gen_random_uuid(),
	attendee_user_id uuid not null references public.profiles (id) on delete cascade,
	attendance_day date not null,
	check_in_at timestamptz not null,
	check_out_at timestamptz,
	last_scanned_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (attendee_user_id, attendance_day)
);

create index if not exists idx_attendance_daily_sessions_day
	on public.attendance_daily_sessions (attendance_day desc, attendee_user_id);

alter table public.attendance_daily_sessions enable row level security;

drop policy if exists "attendance_daily_sessions_select_own_or_mentor" on public.attendance_daily_sessions;
create policy "attendance_daily_sessions_select_own_or_mentor" on public.attendance_daily_sessions
	for select using (attendee_user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "attendance_daily_sessions_insert_authenticated" on public.attendance_daily_sessions;
create policy "attendance_daily_sessions_insert_authenticated" on public.attendance_daily_sessions
	for insert with check (auth.role() = 'authenticated');

drop policy if exists "attendance_daily_sessions_update_authenticated" on public.attendance_daily_sessions;
create policy "attendance_daily_sessions_update_authenticated" on public.attendance_daily_sessions
	for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
