alter table public.profiles
	add column if not exists is_parent_guardian boolean not null default false;

create table if not exists public.parent_applications (
	id uuid primary key default gen_random_uuid(),
	parent_user_id uuid not null unique references public.profiles (id) on delete cascade,
	phone text not null default '',
	relationship text not null default '',
	notes text not null default '',
	status text not null default 'submitted',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint parent_applications_status_check check (status in ('submitted', 'approved', 'rejected'))
);

create table if not exists public.parent_student_links (
	id uuid primary key default gen_random_uuid(),
	parent_user_id uuid not null references public.profiles (id) on delete cascade,
	student_user_id uuid not null references public.profiles (id) on delete cascade,
	status text not null default 'active',
	created_by_user_id uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint parent_student_links_status_check check (status in ('active', 'revoked')),
	constraint parent_student_links_unique_pair unique (parent_user_id, student_user_id)
);

create index if not exists idx_parent_student_links_parent on public.parent_student_links (parent_user_id, status);
create index if not exists idx_parent_student_links_student on public.parent_student_links (student_user_id, status);

create table if not exists public.parent_link_codes (
	id uuid primary key default gen_random_uuid(),
	student_user_id uuid not null references public.profiles (id) on delete cascade,
	code text not null unique,
	expires_at timestamptz not null,
	used_at timestamptz,
	used_by_parent_user_id uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create index if not exists idx_parent_link_codes_student on public.parent_link_codes (student_user_id, created_at desc);
create index if not exists idx_parent_link_codes_code on public.parent_link_codes (code);

create or replace function public.parent_has_student_access(p_student_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
	select exists (
		select 1
		from public.parent_student_links psl
		where psl.parent_user_id = auth.uid()
			and psl.student_user_id = p_student_user_id
			and psl.status = 'active'
	);
$$;

alter table public.parent_applications enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.parent_link_codes enable row level security;

drop policy if exists "parent_applications_select_own_or_admin" on public.parent_applications;
create policy "parent_applications_select_own_or_admin" on public.parent_applications
	for select using (parent_user_id = auth.uid() or public.is_admin());

drop policy if exists "parent_applications_insert_own" on public.parent_applications;
create policy "parent_applications_insert_own" on public.parent_applications
	for insert with check (parent_user_id = auth.uid());

drop policy if exists "parent_applications_update_own_or_admin" on public.parent_applications;
create policy "parent_applications_update_own_or_admin" on public.parent_applications
	for update using (parent_user_id = auth.uid() or public.is_admin())
	with check (parent_user_id = auth.uid() or public.is_admin());

drop policy if exists "parent_links_select_parent_student_admin" on public.parent_student_links;
create policy "parent_links_select_parent_student_admin" on public.parent_student_links
	for select using (
		parent_user_id = auth.uid()
		or student_user_id = auth.uid()
		or public.is_admin()
	);

drop policy if exists "parent_links_insert_student_or_admin" on public.parent_student_links;
create policy "parent_links_insert_student_or_admin" on public.parent_student_links
	for insert with check (
		student_user_id = auth.uid()
		or public.is_admin()
		or parent_user_id = auth.uid()
	);

drop policy if exists "parent_links_update_student_parent_or_admin" on public.parent_student_links;
create policy "parent_links_update_student_parent_or_admin" on public.parent_student_links
	for update using (
		student_user_id = auth.uid()
		or parent_user_id = auth.uid()
		or public.is_admin()
	)
	with check (
		student_user_id = auth.uid()
		or parent_user_id = auth.uid()
		or public.is_admin()
	);

drop policy if exists "parent_link_codes_select_student_or_admin" on public.parent_link_codes;
create policy "parent_link_codes_select_student_or_admin" on public.parent_link_codes
	for select using (student_user_id = auth.uid() or public.is_admin());

drop policy if exists "parent_link_codes_insert_student_or_admin" on public.parent_link_codes;
create policy "parent_link_codes_insert_student_or_admin" on public.parent_link_codes
	for insert with check (student_user_id = auth.uid() or public.is_admin());

drop policy if exists "parent_link_codes_update_student_or_admin" on public.parent_link_codes;
create policy "parent_link_codes_update_student_or_admin" on public.parent_link_codes
	for update using (student_user_id = auth.uid() or public.is_admin())
	with check (student_user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
	for select using (
		id = auth.uid()
		or public.is_mentor_or_admin()
		or public.parent_has_student_access(id)
	);

drop policy if exists "form_submissions_read_own_or_mentor" on public.form_submissions;
create policy "form_submissions_read_own_or_mentor" on public.form_submissions
	for select using (
		user_id = auth.uid()
		or public.is_mentor_or_admin()
		or public.parent_has_student_access(user_id)
	);

drop policy if exists "form_submissions_insert_own" on public.form_submissions;
create policy "form_submissions_insert_own" on public.form_submissions
	for insert with check (
		user_id = auth.uid()
		or public.parent_has_student_access(user_id)
	);

drop policy if exists "form_submissions_update_own_or_mentor" on public.form_submissions;
create policy "form_submissions_update_own_or_mentor" on public.form_submissions
	for update using (
		user_id = auth.uid()
		or public.is_mentor_or_admin()
		or public.parent_has_student_access(user_id)
	)
	with check (
		user_id = auth.uid()
		or public.is_mentor_or_admin()
		or public.parent_has_student_access(user_id)
	);

drop policy if exists "carpool_signups_insert_own" on public.carpool_signups;
create policy "carpool_signups_insert_own" on public.carpool_signups
	for insert with check (
		user_id = auth.uid()
		or public.is_mentor_or_admin()
		or public.parent_has_student_access(user_id)
	);

drop policy if exists "carpool_signups_delete_own_or_mentor" on public.carpool_signups;
create policy "carpool_signups_delete_own_or_mentor" on public.carpool_signups
	for delete using (
		user_id = auth.uid()
		or public.is_mentor_or_admin()
		or public.parent_has_student_access(user_id)
	);
