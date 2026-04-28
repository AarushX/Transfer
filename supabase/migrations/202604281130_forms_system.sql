create table if not exists public.form_types (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	slug text not null unique,
	description text not null default '',
	is_active boolean not null default true,
	allow_multiple boolean not null default false,
	template_file_name text,
	template_file_mime text,
	template_file_data_url text,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
	id uuid primary key default gen_random_uuid(),
	form_type_id uuid not null references public.form_types (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	notes text not null default '',
	file_name text not null,
	file_mime text not null,
	file_data_url text not null,
	status text not null default 'submitted',
	review_notes text not null default '',
	reviewed_at timestamptz,
	reviewed_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_form_submissions_form_type on public.form_submissions (form_type_id, created_at desc);
create index if not exists idx_form_submissions_user on public.form_submissions (user_id, created_at desc);

alter table public.form_types enable row level security;
alter table public.form_submissions enable row level security;

drop policy if exists "form_types_read" on public.form_types;
create policy "form_types_read" on public.form_types
	for select using (auth.role() = 'authenticated');

drop policy if exists "form_types_mentor_write" on public.form_types;
create policy "form_types_mentor_write" on public.form_types
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "form_submissions_read_own_or_mentor" on public.form_submissions;
create policy "form_submissions_read_own_or_mentor" on public.form_submissions
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "form_submissions_insert_own" on public.form_submissions;
create policy "form_submissions_insert_own" on public.form_submissions
	for insert with check (user_id = auth.uid());

drop policy if exists "form_submissions_update_own_or_mentor" on public.form_submissions;
create policy "form_submissions_update_own_or_mentor" on public.form_submissions
	for update using (user_id = auth.uid() or public.is_mentor_or_admin())
	with check (user_id = auth.uid() or public.is_mentor_or_admin());
