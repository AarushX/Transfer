alter table public.form_types
	add column if not exists school_doc_links_json jsonb not null default '[]'::jsonb,
	add column if not exists require_attestation boolean not null default false,
	add column if not exists attestation_text text not null default '';

alter table public.form_submissions
	add column if not exists attested boolean not null default false,
	add column if not exists external_doc_links_json jsonb not null default '[]'::jsonb;

create table if not exists public.carpool_events (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	description text not null default '',
	is_active boolean not null default true,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.carpool_event_days (
	id uuid primary key default gen_random_uuid(),
	event_id uuid not null references public.carpool_events (id) on delete cascade,
	day_date date not null,
	label text not null default '',
	notes text not null default '',
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.carpool_day_roles (
	id uuid primary key default gen_random_uuid(),
	day_id uuid not null references public.carpool_event_days (id) on delete cascade,
	role_key text not null,
	role_label text not null,
	slot_count int not null default 1 check (slot_count >= 1),
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.carpool_signups (
	id uuid primary key default gen_random_uuid(),
	role_id uuid not null references public.carpool_day_roles (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	notes text not null default '',
	created_at timestamptz not null default now(),
	unique (role_id, user_id)
);

create index if not exists idx_carpool_days_event on public.carpool_event_days (event_id, day_date, sort_order);
create index if not exists idx_carpool_roles_day on public.carpool_day_roles (day_id, sort_order);
create index if not exists idx_carpool_signups_role on public.carpool_signups (role_id, created_at desc);
create index if not exists idx_carpool_signups_user on public.carpool_signups (user_id, created_at desc);

alter table public.carpool_events enable row level security;
alter table public.carpool_event_days enable row level security;
alter table public.carpool_day_roles enable row level security;
alter table public.carpool_signups enable row level security;

drop policy if exists "carpool_events_read" on public.carpool_events;
create policy "carpool_events_read" on public.carpool_events
	for select using (auth.role() = 'authenticated');

drop policy if exists "carpool_events_mentor_write" on public.carpool_events;
create policy "carpool_events_mentor_write" on public.carpool_events
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "carpool_days_read" on public.carpool_event_days;
create policy "carpool_days_read" on public.carpool_event_days
	for select using (auth.role() = 'authenticated');

drop policy if exists "carpool_days_mentor_write" on public.carpool_event_days;
create policy "carpool_days_mentor_write" on public.carpool_event_days
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "carpool_roles_read" on public.carpool_day_roles;
create policy "carpool_roles_read" on public.carpool_day_roles
	for select using (auth.role() = 'authenticated');

drop policy if exists "carpool_roles_mentor_write" on public.carpool_day_roles;
create policy "carpool_roles_mentor_write" on public.carpool_day_roles
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "carpool_signups_read" on public.carpool_signups;
create policy "carpool_signups_read" on public.carpool_signups
	for select using (auth.role() = 'authenticated');

drop policy if exists "carpool_signups_insert_own" on public.carpool_signups;
create policy "carpool_signups_insert_own" on public.carpool_signups
	for insert with check (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "carpool_signups_delete_own_or_mentor" on public.carpool_signups;
create policy "carpool_signups_delete_own_or_mentor" on public.carpool_signups
	for delete using (user_id = auth.uid() or public.is_mentor_or_admin());
