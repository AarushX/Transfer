create table if not exists public.org_settings (
	id int primary key default 1,
	name text not null default 'Workspace',
	updated_at timestamptz not null default now(),
	constraint org_settings_singleton check (id = 1)
);

insert into public.org_settings (id, name)
values (1, 'Workspace')
on conflict (id) do nothing;

alter table public.org_settings enable row level security;

drop policy if exists "org_settings_read" on public.org_settings;
create policy "org_settings_read" on public.org_settings
	for select using (auth.role() = 'authenticated');

drop policy if exists "org_settings_admin_write" on public.org_settings;
create policy "org_settings_admin_write" on public.org_settings
	for all using (public.is_admin()) with check (public.is_admin());

alter table public.machines
	add column if not exists description text not null default '',
	add column if not exists qr_token text unique;

update public.machines
set qr_token = coalesce(qr_token, md5(id::text || now()::text))
where qr_token is null;

alter table public.machines
	alter column qr_token set not null;

create table if not exists public.machine_usage_events (
	id uuid primary key default gen_random_uuid(),
	machine_id uuid not null references public.machines (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	authorized boolean not null default false,
	details text not null default '',
	created_at timestamptz not null default now()
);

alter table public.machine_usage_events enable row level security;

drop policy if exists "machine_usage_events_select_own_or_mentor" on public.machine_usage_events;
create policy "machine_usage_events_select_own_or_mentor" on public.machine_usage_events
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "machine_usage_events_insert_own" on public.machine_usage_events;
create policy "machine_usage_events_insert_own" on public.machine_usage_events
	for insert with check (user_id = auth.uid() or public.is_mentor_or_admin());
