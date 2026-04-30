create table if not exists public.survey_templates (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	workflow_kind text not null default 'custom',
	title text not null,
	description text not null default '',
	questions jsonb not null default '[]'::jsonb,
	is_active boolean not null default true,
	show_when_inactive boolean not null default false,
	visible_from timestamptz,
	visible_until timestamptz,
	prereq_node_ids jsonb not null default '[]'::jsonb,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create table if not exists public.course_templates (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	title text not null,
	description text not null default '',
	team_ids jsonb not null default '[]'::jsonb,
	category_ids jsonb not null default '[]'::jsonb,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

create table if not exists public.carpool_event_templates (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	title text not null,
	description text not null default '',
	is_active boolean not null default true,
	days_json jsonb not null default '[]'::jsonb,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now()
);

alter table public.survey_templates enable row level security;
alter table public.course_templates enable row level security;
alter table public.carpool_event_templates enable row level security;

drop policy if exists "survey_templates_read" on public.survey_templates;
create policy "survey_templates_read" on public.survey_templates
	for select using (public.is_mentor_or_admin());
drop policy if exists "survey_templates_write" on public.survey_templates;
create policy "survey_templates_write" on public.survey_templates
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "course_templates_read" on public.course_templates;
create policy "course_templates_read" on public.course_templates
	for select using (public.is_mentor_or_admin());
drop policy if exists "course_templates_write" on public.course_templates;
create policy "course_templates_write" on public.course_templates
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "carpool_event_templates_read" on public.carpool_event_templates;
create policy "carpool_event_templates_read" on public.carpool_event_templates
	for select using (public.is_mentor_or_admin());
drop policy if exists "carpool_event_templates_write" on public.carpool_event_templates;
create policy "carpool_event_templates_write" on public.carpool_event_templates
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());
