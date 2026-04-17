create extension if not exists "pgcrypto";

do $$
begin
	if not exists (select 1 from pg_type where typname = 'app_role') then
		create type public.app_role as enum ('student', 'student_lead', 'mentor', 'admin');
	end if;
	if not exists (select 1 from pg_type where typname = 'certification_status') then
		create type public.certification_status as enum (
			'locked',
			'available',
			'video_pending',
			'quiz_pending',
			'mentor_checkoff_pending',
			'completed'
		);
	end if;
end $$;

create table if not exists public.subteams (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	slug text not null unique,
	description text default '',
	created_at timestamptz not null default now()
);

create table if not exists public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text not null default '',
	email text not null unique,
	role public.app_role not null default 'student',
	subteam_id uuid references public.subteams (id) on delete set null,
	created_at timestamptz not null default now()
);

create table if not exists public.nodes (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	slug text not null unique,
	description text not null default '',
	video_url text not null,
	subteam_id uuid not null references public.subteams (id) on delete restrict,
	tier int not null default 1,
	physical_task text not null default '',
	ordering int not null default 0,
	x int,
	y int,
	created_at timestamptz not null default now()
);

create table if not exists public.node_prerequisites (
	node_id uuid not null references public.nodes (id) on delete cascade,
	prerequisite_node_id uuid not null references public.nodes (id) on delete cascade,
	primary key (node_id, prerequisite_node_id),
	check (node_id <> prerequisite_node_id)
);

create table if not exists public.assessments (
	id uuid primary key default gen_random_uuid(),
	node_id uuid not null unique references public.nodes (id) on delete cascade,
	passing_score int not null default 80 check (passing_score between 1 and 100),
	questions jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now()
);

create table if not exists public.certifications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	node_id uuid not null references public.nodes (id) on delete cascade,
	status public.certification_status not null default 'locked',
	video_watched_at timestamptz,
	quiz_passed_at timestamptz,
	quiz_score int,
	approved_by uuid references public.profiles (id) on delete set null,
	approved_at timestamptz,
	created_at timestamptz not null default now(),
	unique (user_id, node_id)
);

create table if not exists public.quiz_attempts (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	node_id uuid not null references public.nodes (id) on delete cascade,
	answers jsonb not null default '{}'::jsonb,
	score int not null check (score between 0 and 100),
	passed boolean not null default false,
	created_at timestamptz not null default now()
);

create table if not exists public.machines (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	location text not null default '',
	required_node_ids uuid[] not null default '{}',
	created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
	id uuid primary key default gen_random_uuid(),
	actor_id uuid not null references public.profiles (id) on delete restrict,
	action text not null,
	target_user_id uuid references public.profiles (id) on delete set null,
	target_node_id uuid references public.nodes (id) on delete set null,
	target_machine_id uuid references public.machines (id) on delete set null,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, full_name, email)
	values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
	on conflict (id) do nothing;
	return new;
end;
$$;

create or replace function public.bootstrap_certifications_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.certifications (user_id, node_id, status)
	select new.id, n.id, 'locked'::public.certification_status
	from public.nodes n
	on conflict (user_id, node_id) do nothing;
	return new;
end;
$$;

create or replace function public.bootstrap_certifications_for_node()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.certifications (user_id, node_id, status)
	select p.id, new.id, 'locked'::public.certification_status
	from public.profiles p
	on conflict (user_id, node_id) do nothing;
	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_profile_created_bootstrap_certs on public.profiles;
create trigger on_profile_created_bootstrap_certs
after insert on public.profiles
for each row execute function public.bootstrap_certifications_for_profile();

drop trigger if exists on_node_created_bootstrap_certs on public.nodes;
create trigger on_node_created_bootstrap_certs
after insert on public.nodes
for each row execute function public.bootstrap_certifications_for_node();

create or replace function public.log_audit(
	p_action text,
	p_target_user_id uuid,
	p_target_node_id uuid,
	p_target_machine_id uuid default null,
	p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
	insert into public.audit_log (actor_id, action, target_user_id, target_node_id, target_machine_id, metadata)
	values (auth.uid(), p_action, p_target_user_id, p_target_node_id, p_target_machine_id, p_metadata);
$$;

create or replace function public.are_prereqs_completed(p_user_id uuid, p_node_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
	select not exists (
		select 1
		from public.node_prerequisites np
		left join public.certifications c
			on c.user_id = p_user_id and c.node_id = np.prerequisite_node_id
		where np.node_id = p_node_id
			and coalesce(c.status, 'locked'::public.certification_status) <> 'completed'::public.certification_status
	);
$$;

create or replace view public.v_user_node_status
with (security_invoker = true)
as
select
	c.user_id,
	n.id as node_id,
	case
		when c.status in ('video_pending', 'quiz_pending', 'mentor_checkoff_pending', 'completed') then c.status
		when public.are_prereqs_completed(c.user_id, n.id) then 'available'::public.certification_status
		else 'locked'::public.certification_status
	end as computed_status
from public.nodes n
join public.certifications c on c.node_id = n.id;

create or replace function public.transition_certification(
	p_node_id uuid,
	p_new_status public.certification_status,
	p_target_user_id uuid default null,
	p_mentor_notes text default null
)
returns public.certifications
language plpgsql
security definer
set search_path = public
as $$
declare
	v_actor uuid := auth.uid();
	v_actor_role public.app_role;
	v_target_user uuid := coalesce(p_target_user_id, auth.uid());
	v_current public.certifications;
	v_next public.certifications;
begin
	select role into v_actor_role from public.profiles where id = v_actor;
	if v_actor is null then
		raise exception 'Unauthenticated';
	end if;

	select * into v_current
	from public.certifications
	where user_id = v_target_user and node_id = p_node_id
	for update;

	if not found then
		raise exception 'Certification row missing for user/node';
	end if;

	if p_new_status = 'video_pending' and v_target_user = v_actor then
		if public.are_prereqs_completed(v_target_user, p_node_id) then
			update public.certifications
			set status = 'video_pending'
			where id = v_current.id
			returning * into v_next;
		else
			raise exception 'Prerequisites not completed';
		end if;
	elseif p_new_status = 'quiz_pending' and v_target_user = v_actor then
		update public.certifications
		set status = 'quiz_pending', video_watched_at = now()
		where id = v_current.id
		returning * into v_next;
	elseif p_new_status = 'mentor_checkoff_pending' and v_target_user = v_actor then
		update public.certifications
		set status = 'mentor_checkoff_pending'
		where id = v_current.id
		returning * into v_next;
	elseif p_new_status = 'completed' then
		if v_actor_role not in ('mentor', 'admin') then
			raise exception 'Only mentors/admins can approve';
		end if;
		update public.certifications
		set status = 'completed', approved_by = v_actor, approved_at = now()
		where id = v_current.id
		returning * into v_next;
		perform public.log_audit(
			'mentor_checkoff_approved',
			v_target_user,
			p_node_id,
			null,
			jsonb_build_object('notes', coalesce(p_mentor_notes, ''))
		);
	elseif p_new_status = 'quiz_pending' and v_target_user <> v_actor then
		if v_actor_role not in ('mentor', 'admin') then
			raise exception 'Only mentors/admins can send back to review';
		end if;
		update public.certifications
		set status = 'quiz_pending', approved_by = null, approved_at = null
		where id = v_current.id
		returning * into v_next;
		perform public.log_audit(
			'mentor_checkoff_rejected',
			v_target_user,
			p_node_id,
			null,
			jsonb_build_object('notes', coalesce(p_mentor_notes, ''))
		);
	else
		raise exception 'Invalid transition requested';
	end if;

	return v_next;
end;
$$;

alter table public.subteams enable row level security;
alter table public.profiles enable row level security;
alter table public.nodes enable row level security;
alter table public.node_prerequisites enable row level security;
alter table public.assessments enable row level security;
alter table public.certifications enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.machines enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
	select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.is_mentor_or_admin()
returns boolean
language sql
stable
set search_path = public
as $$
	select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('mentor', 'admin'));
$$;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select using (id = auth.uid() or public.is_mentor_or_admin());
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert" on public.profiles for insert with check (public.is_admin());

drop policy if exists "read_content_tables" on public.subteams;
create policy "read_content_tables" on public.subteams for select using (auth.role() = 'authenticated');
drop policy if exists "admin_content_write_subteams" on public.subteams;
create policy "admin_content_write_subteams" on public.subteams for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "nodes_read" on public.nodes;
create policy "nodes_read" on public.nodes for select using (auth.role() = 'authenticated');
drop policy if exists "nodes_admin_write" on public.nodes;
create policy "nodes_admin_write" on public.nodes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "node_prereq_read" on public.node_prerequisites;
create policy "node_prereq_read" on public.node_prerequisites for select using (auth.role() = 'authenticated');
drop policy if exists "node_prereq_admin_write" on public.node_prerequisites;
create policy "node_prereq_admin_write" on public.node_prerequisites for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "assessments_read" on public.assessments;
create policy "assessments_read" on public.assessments for select using (auth.role() = 'authenticated');
drop policy if exists "assessments_admin_write" on public.assessments;
create policy "assessments_admin_write" on public.assessments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "certifications_select_own_or_mentor" on public.certifications;
create policy "certifications_select_own_or_mentor" on public.certifications for select using (user_id = auth.uid() or public.is_mentor_or_admin());
drop policy if exists "certifications_student_update" on public.certifications;
create policy "certifications_student_update" on public.certifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "certifications_admin_insert" on public.certifications;
create policy "certifications_admin_insert" on public.certifications for insert with check (public.is_admin());

drop policy if exists "quiz_attempts_own_or_mentor_read" on public.quiz_attempts;
create policy "quiz_attempts_own_or_mentor_read" on public.quiz_attempts for select using (user_id = auth.uid() or public.is_mentor_or_admin());
drop policy if exists "quiz_attempts_student_insert" on public.quiz_attempts;
create policy "quiz_attempts_student_insert" on public.quiz_attempts for insert with check (user_id = auth.uid());

drop policy if exists "machines_read" on public.machines;
create policy "machines_read" on public.machines for select using (auth.role() = 'authenticated');
drop policy if exists "machines_admin_write" on public.machines;
create policy "machines_admin_write" on public.machines for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit_admin_read" on public.audit_log;
create policy "audit_admin_read" on public.audit_log for select using (public.is_admin());
drop policy if exists "audit_no_direct_insert" on public.audit_log;
create policy "audit_no_direct_insert" on public.audit_log for insert with check (false);
