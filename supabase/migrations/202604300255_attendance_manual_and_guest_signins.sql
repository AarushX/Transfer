alter table public.attendance_daily_sessions
	add column if not exists counts_for_rank boolean not null default true;

do $$ begin
	if not exists (
		select 1
		from pg_enum e
		join pg_type t on t.oid = e.enumtypid
		where t.typname = 'attendance_scan_action'
			and e.enumlabel = 'manual_check_in'
	) then
		alter type public.attendance_scan_action add value 'manual_check_in';
	end if;
end $$;

do $$ begin
	if not exists (
		select 1
		from pg_enum e
		join pg_type t on t.oid = e.enumtypid
		where t.typname = 'attendance_scan_action'
			and e.enumlabel = 'guest_sign_in'
	) then
		alter type public.attendance_scan_action add value 'guest_sign_in';
	end if;
end $$;

create table if not exists public.attendance_guest_signins (
	id uuid primary key default gen_random_uuid(),
	guest_name text not null check (char_length(trim(guest_name)) > 0 and char_length(guest_name) <= 120),
	reason text check (reason is null or char_length(reason) <= 300),
	attendance_day date not null,
	created_by_user_id uuid not null references public.profiles (id) on delete restrict,
	created_at timestamptz not null default now()
);

create index if not exists idx_attendance_guest_signins_day_created
	on public.attendance_guest_signins (attendance_day desc, created_at desc);

alter table public.attendance_guest_signins enable row level security;

drop policy if exists "attendance_guest_signins_select_admin" on public.attendance_guest_signins;
create policy "attendance_guest_signins_select_admin" on public.attendance_guest_signins
	for select using (public.is_admin());

drop policy if exists "attendance_guest_signins_insert_mentor_or_admin" on public.attendance_guest_signins;
create policy "attendance_guest_signins_insert_mentor_or_admin" on public.attendance_guest_signins
	for insert with check (public.is_mentor_or_admin());
