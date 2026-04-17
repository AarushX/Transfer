create table if not exists public.node_checkoff_requirements (
	node_id uuid primary key references public.nodes (id) on delete cascade,
	title text not null default 'Physical checkoff',
	directions text not null default '',
	mentor_checklist jsonb not null default '[]'::jsonb,
	resource_links jsonb not null default '[]'::jsonb,
	evidence_mode text not null default 'none' check (evidence_mode in ('none', 'photo_optional', 'photo_required')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.checkoff_submissions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	node_id uuid not null references public.nodes (id) on delete cascade,
	notes text not null default '',
	photo_data_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, node_id)
);

insert into public.node_checkoff_requirements (node_id, directions)
select n.id, coalesce(n.physical_task, '')
from public.nodes n
on conflict (node_id) do nothing;

alter table public.node_checkoff_requirements enable row level security;
alter table public.checkoff_submissions enable row level security;

drop policy if exists "node_checkoff_requirements_read" on public.node_checkoff_requirements;
create policy "node_checkoff_requirements_read" on public.node_checkoff_requirements
	for select using (auth.role() = 'authenticated');

drop policy if exists "node_checkoff_requirements_mentor_write" on public.node_checkoff_requirements;
create policy "node_checkoff_requirements_mentor_write" on public.node_checkoff_requirements
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "checkoff_submissions_select" on public.checkoff_submissions;
create policy "checkoff_submissions_select" on public.checkoff_submissions
	for select
	using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "checkoff_submissions_insert_own" on public.checkoff_submissions;
create policy "checkoff_submissions_insert_own" on public.checkoff_submissions
	for insert
	with check (user_id = auth.uid());

drop policy if exists "checkoff_submissions_update_own" on public.checkoff_submissions;
create policy "checkoff_submissions_update_own" on public.checkoff_submissions
	for update
	using (user_id = auth.uid())
	with check (user_id = auth.uid());

drop policy if exists "checkoff_submissions_delete_admin" on public.checkoff_submissions;
create policy "checkoff_submissions_delete_admin" on public.checkoff_submissions
	for delete using (public.is_admin());

alter table public.nodes drop column if exists tier;
alter table public.nodes drop column if exists physical_task;
