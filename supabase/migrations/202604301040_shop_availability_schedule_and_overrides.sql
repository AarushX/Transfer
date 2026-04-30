do $$ begin
	if not exists (select 1 from pg_type where typname = 'shop_override_mode') then
		create type public.shop_override_mode as enum ('allow', 'deny');
	end if;
end $$;

create table if not exists public.shop_availability_weekly_rules (
	id uuid primary key default gen_random_uuid(),
	day_of_week int not null check (day_of_week between 0 and 6),
	start_time time not null,
	end_time time not null,
	is_open boolean not null default true,
	note text not null default '',
	created_by_user_id uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create index if not exists idx_shop_availability_weekly_rules_day
	on public.shop_availability_weekly_rules (day_of_week, start_time);

create table if not exists public.shop_availability_user_overrides (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	mode public.shop_override_mode not null,
	starts_at timestamptz not null,
	ends_at timestamptz not null,
	reason text not null default '',
	created_by_user_id uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	check (ends_at > starts_at)
);

create index if not exists idx_shop_availability_user_overrides_user_window
	on public.shop_availability_user_overrides (user_id, starts_at, ends_at);

alter table public.shop_availability_weekly_rules enable row level security;
alter table public.shop_availability_user_overrides enable row level security;

drop policy if exists "shop_availability_weekly_rules_select_mentor" on public.shop_availability_weekly_rules;
create policy "shop_availability_weekly_rules_select_mentor" on public.shop_availability_weekly_rules
	for select using (public.is_mentor_or_admin());

drop policy if exists "shop_availability_weekly_rules_write_mentor" on public.shop_availability_weekly_rules;
create policy "shop_availability_weekly_rules_write_mentor" on public.shop_availability_weekly_rules
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "shop_availability_user_overrides_select_mentor" on public.shop_availability_user_overrides;
create policy "shop_availability_user_overrides_select_mentor" on public.shop_availability_user_overrides
	for select using (public.is_mentor_or_admin());

drop policy if exists "shop_availability_user_overrides_write_mentor" on public.shop_availability_user_overrides;
create policy "shop_availability_user_overrides_write_mentor" on public.shop_availability_user_overrides
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());
