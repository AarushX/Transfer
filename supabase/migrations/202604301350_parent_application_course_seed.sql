-- Parent onboarding course seeded into existing student course infrastructure.
-- Creates:
-- - team group: parents
-- - team: parent-onboarding
-- - subteam: parent-onboarding
-- - node/course: parent-application
-- - node blocks (reading + quiz + reading)
-- - auto-membership trigger for is_parent_guardian accounts

insert into public.subteam_categories (slug, name, sort_order, is_required_onboarding)
values ('parent-onboarding', 'Parent Onboarding', 90, false)
on conflict (slug) do update
set
	name = excluded.name,
	sort_order = excluded.sort_order,
	is_required_onboarding = excluded.is_required_onboarding;

insert into public.team_groups (slug, name, sort_order, designator, color_hex)
values ('parents', 'Parents', 90, 'general', '#64748b')
on conflict (slug) do update
set
	name = excluded.name,
	sort_order = excluded.sort_order,
	designator = excluded.designator,
	color_hex = excluded.color_hex;

insert into public.teams (team_group_id, slug, name, sort_order, color_hex, category_slug)
select
	g.id,
	'parent-onboarding',
	'Parent Onboarding',
	10,
	'#475569',
	'parent-onboarding'
from public.team_groups g
where g.slug = 'parents'
on conflict (slug) do update
set
	name = excluded.name,
	sort_order = excluded.sort_order,
	color_hex = excluded.color_hex,
	category_slug = excluded.category_slug;

insert into public.subteams (name, slug, description)
values ('Parent Onboarding', 'parent-onboarding', 'Parent application and onboarding track')
on conflict (slug) do update
set
	name = excluded.name,
	description = excluded.description;

insert into public.nodes (title, slug, description, video_url, subteam_id)
select
	'WRT 2026-27 Parent Application',
	'parent-application',
	'Wheeler / CircuitRunners Robotics parent application and commitment course.',
	'https://www.youtube.com/watch?v=ysz5S6PUM-U',
	s.id
from public.subteams s
where s.slug = 'parent-onboarding'
on conflict (slug) do update
set
	title = excluded.title,
	description = excluded.description,
	video_url = excluded.video_url,
	subteam_id = excluded.subteam_id;

insert into public.node_team_targets (node_id, team_id)
select n.id, t.id
from public.nodes n
join public.teams t on t.slug = 'parent-onboarding'
where n.slug = 'parent-application'
on conflict (node_id, team_id) do nothing;

insert into public.node_checkoff_requirements (node_id, title, directions, mentor_checklist, resource_links, evidence_mode)
select
	n.id,
	'Parent Application Review',
	'Admin will review your parent application after submission.',
	'[]'::jsonb,
	'[]'::jsonb,
	'none'
from public.nodes n
where n.slug = 'parent-application'
on conflict (node_id) do update
set
	title = excluded.title,
	directions = excluded.directions,
	mentor_checklist = excluded.mentor_checklist,
	resource_links = excluded.resource_links,
	evidence_mode = excluded.evidence_mode;

with target_node as (
	select id from public.nodes where slug = 'parent-application'
),
delete_old as (
	delete from public.node_blocks b
	using target_node n
	where b.node_id = n.id
)
insert into public.node_blocks (node_id, position, type, config)
select n.id, v.position, v.type::public.node_block_type, v.config
from target_node n
cross join (
	values
		(
			1,
			'reading',
			jsonb_build_object(
				'title', 'WRT 2026-27 Parent Application',
				'content', $$Parental involvement is absolutely essential to the success of the Wheeler / CircuitRunners Robotics team. What can you do to help the team successfully spread the word about STEM? We need you!

(Without parent commitment and involvement, your student's application to the Wheeler / CircuitRunners Robotics team will likely be denied.) Let's be clear - as a parent you MUST volunteer - there is no option and it's fun!

Dear Prospective Team Parents:

The Wheeler / CircuitRunners Robotics team is a competitive team, not a more typical "club", that requires extensive time commitments on the part of its student members and their parents.$$,
				'resource_links', '[]'::jsonb
			)
		),
		(
			2,
			'video',
			jsonb_build_object(
				'title', 'Parent Orientation Video',
				'video_url', 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
				'start_seconds', 0
			)
		),
		(
			3,
			'quiz',
			jsonb_build_object(
				'title', 'Commitment Check',
				'passing_score', 100,
				'questions', jsonb_build_array(
					jsonb_build_object(
						'id', 'q1',
						'type', 'tf',
						'prompt', 'Parent involvement is required for team participation.',
						'correct', 'true'
					),
					jsonb_build_object(
						'id', 'q2',
						'type', 'tf',
						'prompt', 'The team is a casual club with minimal time commitment.',
						'correct', 'false'
					),
					jsonb_build_object(
						'id', 'q3',
						'type', 'mc',
						'prompt', 'How many volunteer opportunities must each family commit to at minimum?',
						'options', jsonb_build_array('1', '2', '3', '5'),
						'correct', '3'
					)
				)
			)
		),
		(
			4,
			'reading',
			jsonb_build_object(
				'title', 'Application Form Instructions',
				'content', $$Complete the parent application in Forms with all required sections:

I. Introductory & Student Information
II. Parent/Guardian Information
III. Team Status
IV. Parent Volunteer Commitment (minimum 3)
V. Leadership & Specialized Skills
VI. Commitment and Signature

The form includes all original text and required acknowledgements for Wheeler / CircuitRunners Robotics.$$
			)
		)
) as v(position, type, config);

insert into public.form_types (
	name,
	slug,
	description,
	is_active
)
values (
	'WRT 2026-27 Parent Application',
	'parent-application',
	'Parent application for Wheeler / CircuitRunners Robotics with commitment acknowledgements and volunteer selections.',
	true
)
on conflict (slug) do update
set
	name = excluded.name,
	description = excluded.description,
	is_active = excluded.is_active;

create or replace function public.ensure_parent_membership(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_group_id uuid;
	v_team_id uuid;
begin
	select id into v_group_id from public.team_groups where slug = 'parents';
	select id into v_team_id from public.teams where slug = 'parent-onboarding';
	if v_group_id is null or v_team_id is null then
		return;
	end if;

	insert into public.profile_teams (user_id, team_group_id, team_id, category_slug)
	select p_user_id, v_group_id, v_team_id, 'parent-onboarding'
	where not exists (
		select 1 from public.profile_teams pt where pt.user_id = p_user_id and pt.team_group_id = v_group_id
	);

	update public.profile_teams
	set team_id = v_team_id, category_slug = 'parent-onboarding', updated_at = now()
	where user_id = p_user_id and team_group_id = v_group_id;

	insert into public.profile_primary_teams (user_id, team_group_id, updated_at)
	select p_user_id, v_group_id, now()
	where not exists (
		select 1 from public.profile_primary_teams ppt where ppt.user_id = p_user_id
	);

	update public.profile_primary_teams
	set team_group_id = v_group_id, updated_at = now()
	where user_id = p_user_id;
end;
$$;

create or replace function public.sync_parent_membership_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.is_parent_guardian = true then
		perform public.ensure_parent_membership(new.id);
	end if;
	return new;
end;
$$;

drop trigger if exists on_profiles_parent_membership on public.profiles;
create trigger on_profiles_parent_membership
after insert or update of is_parent_guardian on public.profiles
for each row
execute function public.sync_parent_membership_trigger();

do $$
declare
	r record;
begin
	for r in select id from public.profiles where is_parent_guardian = true
	loop
		perform public.ensure_parent_membership(r.id);
	end loop;
end;
$$;
