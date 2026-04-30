create table if not exists public.surveys (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	slug text not null unique,
	description text not null default '',
	questions jsonb not null default '[]'::jsonb,
	is_active boolean not null default true,
	show_when_inactive boolean not null default false,
	visible_from timestamptz,
	visible_until timestamptz,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (visible_until is null or visible_from is null or visible_until >= visible_from)
);

create table if not exists public.survey_prerequisites (
	survey_id uuid not null references public.surveys (id) on delete cascade,
	node_id uuid not null references public.nodes (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (survey_id, node_id)
);

create table if not exists public.survey_submissions (
	id uuid primary key default gen_random_uuid(),
	survey_id uuid not null references public.surveys (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	answers jsonb not null default '{}'::jsonb,
	submitted_at timestamptz not null default now(),
	unique (survey_id, user_id)
);

create index if not exists idx_survey_prerequisites_node on public.survey_prerequisites (node_id);
create index if not exists idx_survey_submissions_user on public.survey_submissions (user_id, submitted_at desc);

alter table public.surveys enable row level security;
alter table public.survey_prerequisites enable row level security;
alter table public.survey_submissions enable row level security;

drop policy if exists "surveys_read" on public.surveys;
create policy "surveys_read" on public.surveys
	for select using (auth.role() = 'authenticated');

drop policy if exists "surveys_mentor_write" on public.surveys;
create policy "surveys_mentor_write" on public.surveys
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "survey_prerequisites_read" on public.survey_prerequisites;
create policy "survey_prerequisites_read" on public.survey_prerequisites
	for select using (auth.role() = 'authenticated');

drop policy if exists "survey_prerequisites_mentor_write" on public.survey_prerequisites;
create policy "survey_prerequisites_mentor_write" on public.survey_prerequisites
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "survey_submissions_read_own_or_mentor" on public.survey_submissions;
create policy "survey_submissions_read_own_or_mentor" on public.survey_submissions
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "survey_submissions_insert_own" on public.survey_submissions;
create policy "survey_submissions_insert_own" on public.survey_submissions
	for insert with check (user_id = auth.uid());

drop policy if exists "survey_submissions_update_own_or_mentor" on public.survey_submissions;
create policy "survey_submissions_update_own_or_mentor" on public.survey_submissions
	for update using (user_id = auth.uid() or public.is_mentor_or_admin())
	with check (user_id = auth.uid() or public.is_mentor_or_admin());
