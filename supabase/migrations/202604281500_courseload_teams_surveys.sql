-- Courseload architecture: team groups, teams, profile assignments, courseloads, survey caps & outcome rules.
-- Hard-resets training nodes/surveys and seeds FTC/FRC examples.

-- ---------------------------------------------------------------------------
-- Survey submission caps (multiple rows per user/survey)
-- ---------------------------------------------------------------------------
alter table public.surveys
	add column if not exists max_submissions int not null default 1
		check (max_submissions >= 1);

alter table public.surveys
	add column if not exists allow_role_mapping boolean not null default false;

alter table public.survey_submissions drop constraint if exists survey_submissions_survey_id_user_id_key;

create index if not exists idx_survey_submissions_survey_user_submitted
	on public.survey_submissions (survey_id, user_id, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table if not exists public.team_groups (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null,
	sort_order int not null default 0,
	created_at timestamptz not null default now()
);

create table if not exists public.teams (
	id uuid primary key default gen_random_uuid(),
	team_group_id uuid not null references public.team_groups (id) on delete cascade,
	slug text not null unique,
	name text not null,
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	unique (team_group_id, slug)
);

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'teams_id_team_group_unique'
			and conrelid = 'public.teams'::regclass
	) then
		alter table public.teams
			add constraint teams_id_team_group_unique unique (id, team_group_id);
	end if;
end
$$;

drop table if exists public.profile_teams cascade;

create table public.profile_teams (
	user_id uuid not null references public.profiles (id) on delete cascade,
	team_group_id uuid not null references public.team_groups (id) on delete cascade,
	team_id uuid not null references public.teams (id) on delete cascade,
	source_survey_id uuid references public.surveys (id) on delete set null,
	updated_at timestamptz not null default now(),
	primary key (user_id, team_group_id),
	foreign key (team_id, team_group_id) references public.teams (id, team_group_id) on delete cascade
);

create table if not exists public.profile_tags (
	user_id uuid not null references public.profiles (id) on delete cascade,
	tag_slug text not null,
	source_survey_id uuid references public.surveys (id) on delete set null,
	created_at timestamptz not null default now(),
	primary key (user_id, tag_slug)
);

-- ---------------------------------------------------------------------------
-- Courseloads
-- ---------------------------------------------------------------------------
create table if not exists public.courseloads (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	description text not null default '',
	eligibility jsonb not null default '{}'::jsonb,
	sort_order int not null default 0,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.courseload_courses (
	courseload_id uuid not null references public.courseloads (id) on delete cascade,
	node_id uuid not null references public.nodes (id) on delete cascade,
	sort_order int not null default 0,
	required boolean not null default true,
	primary key (courseload_id, node_id)
);

create index if not exists idx_courseload_courses_node on public.courseload_courses (node_id);

create table if not exists public.profile_courseloads (
	user_id uuid not null references public.profiles (id) on delete cascade,
	courseload_id uuid not null references public.courseloads (id) on delete cascade,
	assigned_at timestamptz not null default now(),
	primary key (user_id, courseload_id)
);

-- ---------------------------------------------------------------------------
-- Survey outcome rules
-- ---------------------------------------------------------------------------
create table if not exists public.survey_outcome_rules (
	id uuid primary key default gen_random_uuid(),
	survey_id uuid not null references public.surveys (id) on delete cascade,
	question_id text not null,
	match_value text not null,
	target_team_id uuid references public.teams (id) on delete cascade,
	tag_slug text,
	target_role public.app_role,
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	check (
		(target_team_id is not null)::int + (tag_slug is not null)::int + (target_role is not null)::int = 1
	)
);

create index if not exists idx_survey_outcome_rules_survey on public.survey_outcome_rules (survey_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.team_groups enable row level security;
alter table public.teams enable row level security;
alter table public.profile_teams enable row level security;
alter table public.profile_tags enable row level security;
alter table public.courseloads enable row level security;
alter table public.courseload_courses enable row level security;
alter table public.profile_courseloads enable row level security;
alter table public.survey_outcome_rules enable row level security;

drop policy if exists "team_groups_read" on public.team_groups;
create policy "team_groups_read" on public.team_groups for select using (auth.role() = 'authenticated');

drop policy if exists "teams_read" on public.teams;
create policy "teams_read" on public.teams for select using (auth.role() = 'authenticated');

drop policy if exists "profile_teams_select_own_or_mentor" on public.profile_teams;
create policy "profile_teams_select_own_or_mentor" on public.profile_teams
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "profile_tags_own_or_mentor" on public.profile_tags;
create policy "profile_tags_own_or_mentor" on public.profile_tags
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "courseloads_read" on public.courseloads;
create policy "courseloads_read" on public.courseloads for select using (auth.role() = 'authenticated');

drop policy if exists "courseload_courses_read" on public.courseload_courses;
create policy "courseload_courses_read" on public.courseload_courses for select using (auth.role() = 'authenticated');

drop policy if exists "profile_courseloads_own_or_mentor" on public.profile_courseloads;
create policy "profile_courseloads_own_or_mentor" on public.profile_courseloads
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "survey_outcome_rules_read" on public.survey_outcome_rules;
create policy "survey_outcome_rules_read" on public.survey_outcome_rules
	for select using (auth.role() = 'authenticated');

drop policy if exists "survey_outcome_rules_mentor_write" on public.survey_outcome_rules;
create policy "survey_outcome_rules_mentor_write" on public.survey_outcome_rules
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "courseloads_mentor_write" on public.courseloads;
create policy "courseloads_mentor_write" on public.courseloads
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "courseload_courses_mentor_write" on public.courseload_courses;
create policy "courseload_courses_mentor_write" on public.courseload_courses
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

-- ---------------------------------------------------------------------------
-- Functions (SECURITY DEFINER writes bypass student RLS)
-- ---------------------------------------------------------------------------
create or replace function public.apply_survey_outcomes_for_user(p_survey_id uuid, p_user_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	r record;
	v_answer_text text;
	v_team_group uuid;
begin
	delete from public.profile_teams where user_id = p_user_id and source_survey_id = p_survey_id;
	delete from public.profile_tags where user_id = p_user_id and source_survey_id = p_survey_id;

	for r in
		select *
		from public.survey_outcome_rules
		where survey_id = p_survey_id
		order by sort_order, id
	loop
		v_answer_text := trim(coalesce(p_answers ->> r.question_id, ''));
		if v_answer_text is distinct from trim(r.match_value) then
			continue;
		end if;

		if r.target_team_id is not null then
			select team_group_id into v_team_group from public.teams where id = r.target_team_id;
			if v_team_group is null then
				continue;
			end if;
			insert into public.profile_teams (user_id, team_group_id, team_id, source_survey_id)
			values (p_user_id, v_team_group, r.target_team_id, p_survey_id)
			on conflict (user_id, team_group_id) do update set
				team_id = excluded.team_id,
				source_survey_id = excluded.source_survey_id,
				updated_at = now();
		elsif r.tag_slug is not null then
			insert into public.profile_tags (user_id, tag_slug, source_survey_id)
			values (p_user_id, r.tag_slug, p_survey_id)
			on conflict (user_id, tag_slug) do update set source_survey_id = excluded.source_survey_id;
		elsif r.target_role is not null then
			if exists (
				select 1 from public.surveys s
				where s.id = p_survey_id and s.allow_role_mapping is true
			) then
				update public.profiles set role = r.target_role where id = p_user_id;
			end if;
		end if;
	end loop;
end;
$$;

create or replace function public.sync_profile_courseloads_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	cl record;
	prog_ok boolean;
	tech_ok boolean;
	bus_ok boolean;
	user_prog text;
	user_tech text;
	user_bus text;
begin
	select t.slug into user_prog
	from public.profile_teams pt
	join public.teams t on t.id = pt.team_id
	join public.team_groups g on g.id = pt.team_group_id
	where pt.user_id = p_user_id and g.slug = 'program'
	limit 1;

	select t.slug into user_tech
	from public.profile_teams pt
	join public.teams t on t.id = pt.team_id
	join public.team_groups g on g.id = pt.team_group_id
	where pt.user_id = p_user_id and g.slug = 'technical'
	limit 1;

	select t.slug into user_bus
	from public.profile_teams pt
	join public.teams t on t.id = pt.team_id
	join public.team_groups g on g.id = pt.team_group_id
	where pt.user_id = p_user_id and g.slug = 'business'
	limit 1;

	delete from public.profile_courseloads where user_id = p_user_id;

	for cl in select * from public.courseloads where is_active is true
	loop
		prog_ok := coalesce(jsonb_array_length(coalesce(cl.eligibility -> 'program', '[]'::jsonb)), 0) = 0
			or (
				user_prog is not null
				and exists (
					select 1
					from jsonb_array_elements_text(coalesce(cl.eligibility -> 'program', '[]'::jsonb)) as x(val)
					where trim(x.val) = user_prog
				)
			);

		tech_ok := coalesce(jsonb_array_length(coalesce(cl.eligibility -> 'technical', '[]'::jsonb)), 0) = 0
			or (
				user_tech is not null
				and exists (
					select 1
					from jsonb_array_elements_text(coalesce(cl.eligibility -> 'technical', '[]'::jsonb)) as x(val)
					where trim(x.val) = user_tech
				)
			);

		bus_ok := coalesce(jsonb_array_length(coalesce(cl.eligibility -> 'business', '[]'::jsonb)), 0) = 0
			or (
				user_bus is not null
				and exists (
					select 1
					from jsonb_array_elements_text(coalesce(cl.eligibility -> 'business', '[]'::jsonb)) as x(val)
					where trim(x.val) = user_bus
				)
			);

		if prog_ok and tech_ok and bus_ok then
			insert into public.profile_courseloads (user_id, courseload_id)
			values (p_user_id, cl.id)
			on conflict do nothing;
		end if;
	end loop;
end;
$$;

grant execute on function public.apply_survey_outcomes_for_user(uuid, uuid, jsonb) to authenticated;
grant execute on function public.sync_profile_courseloads_for_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Certification view (remove legacy leadership SQL gate)
-- ---------------------------------------------------------------------------
drop view if exists public.v_user_node_status;

create or replace view public.v_user_node_status
with (security_invoker = true)
as
select
	c.user_id,
	n.id as node_id,
	case
		when c.status in (
			'video_pending'::public.certification_status,
			'quiz_pending'::public.certification_status,
			'mentor_checkoff_pending'::public.certification_status,
			'completed'::public.certification_status
		) then c.status
		when public.are_prereqs_completed(c.user_id, n.id) then 'available'::public.certification_status
		else 'locked'::public.certification_status
	end as computed_status
from public.nodes n
join public.certifications c on c.node_id = n.id;

drop function if exists public.leadership_training_eligible(uuid);

-- ---------------------------------------------------------------------------
-- Reset curriculum + seed
-- ---------------------------------------------------------------------------
delete from public.survey_prerequisites;
delete from public.survey_outcome_rules;
delete from public.survey_submissions;
delete from public.surveys;

delete from public.profile_courseloads;
delete from public.courseload_courses;
delete from public.courseloads;

delete from public.profile_teams;
delete from public.profile_tags;
delete from public.teams;
delete from public.team_groups;

update public.profiles set subteam_id = null where subteam_id is not null;
delete from public.mentor_subteam_preferences;
update public.machines set required_node_ids = '{}';

delete from public.nodes;

delete from public.subteams;

truncate table public.training_categories cascade;

insert into public.team_groups (slug, name, sort_order)
values
	('program', 'Program team', 10),
	('technical', 'Technical division', 20),
	('business', 'Club-wide business division', 30);

insert into public.teams (team_group_id, slug, name, sort_order)
select g.id, v.slug, v.name, v.ord
from public.team_groups g
join (
	values
		('program', 'ftc-1002', 'FTC 1002', 10),
		('program', 'ftc-11347', 'FTC 11347', 20),
		('program', 'frc-1002', 'FRC 1002', 30),
		('technical', 'manufacturing', 'Manufacturing', 10),
		('technical', 'electrical', 'Electrical', 20),
		('technical', 'programming', 'Programming', 30),
		('technical', 'awards', 'Awards', 40),
		('business', 'outreach', 'Outreach', 10),
		('business', 'marketing', 'Marketing', 20),
		('business', 'fundraising', 'Fundraising', 30),
		('business', 'operations', 'Operations', 40)
) as v(group_slug, slug, name, ord) on v.group_slug = g.slug;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'teams_id_team_group_unique'
			and conrelid = 'public.teams'::regclass
	) then
		alter table public.teams
			add constraint teams_id_team_group_unique unique (id, team_group_id);
	end if;
end
$$;

insert into public.subteams (name, slug, description)
values
	('FTC program', 'ftc-program', 'FTC courses'),
	('FRC program', 'frc-program', 'FRC courses'),
	('Leadership', 'leadership', 'Leadership')
on conflict (slug) do update set
	name = excluded.name,
	description = excluded.description;

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
values
	('Technical', 'technical', null, 'group', 'sky', 10),
	('Business', 'business', null, 'group', 'amber', 20);

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
select 'FTC', 'ftc', id, 'program', 'indigo', 10 from public.training_categories where slug = 'technical';

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
select 'FRC', 'frc', id, 'program', 'blue', 20 from public.training_categories where slug = 'technical';

insert into public.nodes (title, slug, description, video_url, subteam_id, ordering)
select v.title, v.slug, v.description, v.video_url, s.id, v.ordering
from (
	values
		('FTC basics & safety', 'ftc-basic', 'Culture, safety, and FTC fundamentals.', 'https://www.youtube.com/results?search_query=FTC+safety+basics', 'ftc-program', 10),
		('FRC basics & safety', 'frc-basic', 'Culture, safety, and FRC fundamentals.', 'https://www.youtube.com/results?search_query=FRC+safety+basics', 'frc-program', 10),
		('Robot systems & terms (FTC)', 'ftc-robot-systems-terms', 'Core vocabulary and subsystems overview.', 'https://www.youtube.com/results?search_query=FTC+robot+systems', 'ftc-program', 20),
		('How to wire (FTC)', 'ftc-how-to-wire', 'Power, REV control, and wiring hygiene.', 'https://www.youtube.com/results?search_query=FTC+wiring+tutorial', 'ftc-program', 30),
		('Drivebase intro (FRC)', 'frc-drivebase-intro', 'Tank/Swerve foundations for build season.', 'https://www.youtube.com/results?search_query=FRC+drivebase', 'frc-program', 20),
		('Leadership essentials', 'leadership', 'Communication, accountability, and student leadership.', 'https://www.youtube.com/results?search_query=student+leadership', 'leadership', 900)
) as v(title, slug, description, video_url, subteam_slug, ordering)
join public.subteams s on s.slug = v.subteam_slug;

insert into public.node_checkoff_requirements (node_id, title, directions, mentor_checklist, resource_links, evidence_mode)
select n.id, 'Skills Check', '', '[]'::jsonb, '[]'::jsonb, 'none'
from public.nodes n
on conflict (node_id) do nothing;

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'ftc'
where n.slug in ('ftc-basic', 'ftc-robot-systems-terms', 'ftc-how-to-wire');

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'frc'
where n.slug in ('frc-basic', 'frc-drivebase-intro');

insert into public.courseloads (slug, title, description, eligibility, sort_order)
values
	(
		'ftc-101',
		'FTC 101',
		'Foundational FTC training track.',
		'{"program":["ftc-1002","ftc-11347"],"technical":[],"business":[]}'::jsonb,
		10
	),
	(
		'frc-101',
		'FRC 101',
		'Foundational FRC training track.',
		'{"program":["frc-1002"],"technical":[],"business":[]}'::jsonb,
		20
	),
	(
		'club-business-101',
		'Club business 101',
		'Club-wide business skills.',
		'{"program":[],"technical":[],"business":["outreach","marketing","fundraising","operations"]}'::jsonb,
		30
	);

insert into public.courseload_courses (courseload_id, node_id, sort_order, required)
select cl.id, n.id, v.ord, true
from public.courseloads cl
join (
	values
		('ftc-101', 'ftc-basic', 10),
		('ftc-101', 'ftc-robot-systems-terms', 20),
		('ftc-101', 'ftc-how-to-wire', 30),
		('frc-101', 'frc-basic', 10),
		('frc-101', 'frc-drivebase-intro', 20),
		('club-business-101', 'leadership', 10)
) as v(cl_slug, node_slug, ord) on v.cl_slug = cl.slug
join public.nodes n on n.slug = v.node_slug;

insert into public.surveys (title, slug, description, questions, is_active, show_when_inactive, max_submissions, allow_role_mapping)
values (
	'Team placement',
	'team-path-selection',
	'Select your program team, technical division, and club-wide business division.',
	'[
		{"id":"program","type":"mc","prompt":"Which program team are you on?","options":["FTC 1002","FTC 11347","FRC 1002"],"correct":"FTC 1002","randomize_options":false},
		{"id":"technical","type":"mc","prompt":"Pick ONE technical division.","options":["Manufacturing","Electrical","Programming","Awards"],"correct":"Manufacturing","randomize_options":false},
		{"id":"business","type":"mc","prompt":"Pick ONE club-wide business division.","options":["Outreach","Marketing","Fundraising","Operations"],"correct":"Outreach","randomize_options":false}
	]'::jsonb,
	true,
	false,
	1,
	false
);

insert into public.survey_outcome_rules (survey_id, question_id, match_value, target_team_id, sort_order)
select s.id, 'program', 'FTC 1002', t.id, 10
from public.surveys s
cross join public.teams t
join public.team_groups g on g.id = t.team_group_id
where s.slug = 'team-path-selection' and g.slug = 'program' and t.slug = 'ftc-1002';

insert into public.survey_outcome_rules (survey_id, question_id, match_value, target_team_id, sort_order)
select s.id, 'program', 'FTC 11347', t.id, 20
from public.surveys s
cross join public.teams t
join public.team_groups g on g.id = t.team_group_id
where s.slug = 'team-path-selection' and g.slug = 'program' and t.slug = 'ftc-11347';

insert into public.survey_outcome_rules (survey_id, question_id, match_value, target_team_id, sort_order)
select s.id, 'program', 'FRC 1002', t.id, 30
from public.surveys s
cross join public.teams t
join public.team_groups g on g.id = t.team_group_id
where s.slug = 'team-path-selection' and g.slug = 'program' and t.slug = 'frc-1002';

insert into public.survey_outcome_rules (survey_id, question_id, match_value, target_team_id, sort_order)
select s.id, 'technical', v.match_label, t.id, 40 + v.ord
from public.surveys s
cross join (
	values
		('Manufacturing', 'manufacturing', 1),
		('Electrical', 'electrical', 2),
		('Programming', 'programming', 3),
		('Awards', 'awards', 4)
) as v(match_label, team_slug, ord)
join public.teams t on t.slug = v.team_slug
join public.team_groups g on g.id = t.team_group_id and g.slug = 'technical'
where s.slug = 'team-path-selection';

insert into public.survey_outcome_rules (survey_id, question_id, match_value, target_team_id, sort_order)
select s.id, 'business', v.match_label, t.id, 80 + v.ord
from public.surveys s
cross join (
	values
		('Outreach', 'outreach', 1),
		('Marketing', 'marketing', 2),
		('Fundraising', 'fundraising', 3),
		('Operations', 'operations', 4)
) as v(match_label, team_slug, ord)
join public.teams t on t.slug = v.team_slug
join public.team_groups g on g.id = t.team_group_id and g.slug = 'business'
where s.slug = 'team-path-selection';
