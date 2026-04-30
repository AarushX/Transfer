do $$ begin
	if not exists (select 1 from pg_type where typname = 'attendance_scan_action') then
		create type public.attendance_scan_action as enum ('check_in', 'check_out', 'display_activate', 'display_deactivate');
	end if;
end $$;

create table if not exists public.attendance_scan_events (
	id uuid primary key default gen_random_uuid(),
	attendee_user_id uuid references public.profiles (id) on delete set null,
	scanned_by_user_id uuid references public.profiles (id) on delete set null,
	attendance_day date,
	action public.attendance_scan_action not null,
	created_at timestamptz not null default now(),
	metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_attendance_scan_events_created_at
	on public.attendance_scan_events (created_at desc);

create index if not exists idx_attendance_scan_events_attendee_day
	on public.attendance_scan_events (attendee_user_id, attendance_day, created_at desc);

alter table public.attendance_scan_events enable row level security;

drop policy if exists "attendance_scan_events_admin_read" on public.attendance_scan_events;
create policy "attendance_scan_events_admin_read" on public.attendance_scan_events
	for select using (public.is_admin());

drop policy if exists "attendance_scan_events_insert_authenticated" on public.attendance_scan_events;
create policy "attendance_scan_events_insert_authenticated" on public.attendance_scan_events
	for insert with check (auth.role() = 'authenticated');
