-- Hard reset training nodes/taxonomy and seed survey-driven FTC/FRC paths + leadership unlock.

-- 1) Clear surveys (before deleting prerequisite nodes)
delete from public.survey_prerequisites;
delete from public.survey_submissions;
delete from public.surveys;

-- 2) Detach profiles / mentor prefs from subteams we will replace
update public.profiles set subteam_id = null where subteam_id is not null;
delete from public.mentor_subteam_preferences;
update public.machines set required_node_ids = '{}';

-- 3) Remove all courses (cascades certifications, blocks, prereqs, assessments, etc.)
delete from public.nodes;

-- 4) Replace subteams with program buckets used by nodes
delete from public.subteams;

insert into public.subteams (name, slug, description)
values
	('FTC program', 'ftc-program', 'FTC basic training and FTC track modules'),
	('FRC program', 'frc-program', 'FRC basic training and FRC track modules'),
	('Leadership', 'leadership', 'Leadership capstone')
on conflict (slug) do update set
	name = excluded.name,
	description = excluded.description;

-- 5) Reset taxonomy
truncate table public.training_categories cascade;

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
values
	('Technical', 'technical', null, 'group', 'sky', 10),
	('Business', 'business', null, 'group', 'amber', 20);

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
select v.name, v.slug, p.id, v.kind::text, v.color_token, v.sort_order
from (
	values
		('FTC', 'ftc', 'technical', 'program', 'indigo', 10),
		('FRC', 'frc', 'technical', 'program', 'blue', 20),
		('Leadership track', 'leadership-track', 'business', 'subteam', 'violet', 30)
) as v(name, slug, parent_slug, kind, color_token, sort_order)
join public.training_categories p on p.slug = v.parent_slug;

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
select v.name, v.slug, p.id, 'topic', v.color_token, v.sort_order
from (
	values
		('FTC basic', 'cat-ftc-basic', 'ftc', 'cyan', 10),
		('FRC basic', 'cat-frc-basic', 'frc', 'cyan', 20),
		('Manufacturing', 'cat-tech-manufacturing', 'ftc', 'emerald', 30),
		('Electrical', 'cat-tech-electrical', 'ftc', 'emerald', 40),
		('Programming', 'cat-tech-programming', 'ftc', 'fuchsia', 50),
		('Awards', 'cat-tech-awards', 'ftc', 'rose', 60),
		('Manufacturing', 'cat-frc-tech-manufacturing', 'frc', 'emerald', 110),
		('Electrical', 'cat-frc-tech-electrical', 'frc', 'emerald', 120),
		('Programming', 'cat-frc-tech-programming', 'frc', 'fuchsia', 130),
		('Awards', 'cat-frc-tech-awards', 'frc', 'rose', 140),
		('Outreach', 'cat-bus-outreach', 'business', 'amber', 10),
		('Marketing', 'cat-bus-marketing', 'business', 'amber', 20),
		('Fundraising', 'cat-bus-fundraising', 'business', 'amber', 30),
		('Operations', 'cat-bus-operations', 'business', 'amber', 40)
) as v(name, slug, parent_slug, color_token, sort_order)
join public.training_categories p on p.slug = v.parent_slug;

-- 6) Leadership eligibility (reads team-path-selection survey answers)
create or replace function public.leadership_training_eligible(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_answers jsonb;
	v_prog text;
	v_tech text;
	v_bus text;
	v_basic_slug text;
	v_tech_slug text;
	v_bus_slug text;
begin
	select ss.answers into v_answers
	from public.survey_submissions ss
	join public.surveys s on s.id = ss.survey_id
	where ss.user_id = p_user_id
		and s.slug = 'team-path-selection'
	limit 1;

	if v_answers is null then
		return false;
	end if;

	v_prog := trim(coalesce(v_answers ->> 'program', ''));
	v_tech := trim(coalesce(v_answers ->> 'technical', ''));
	v_bus := trim(coalesce(v_answers ->> 'business', ''));

	if v_prog = '' or v_tech = '' or v_bus = '' then
		return false;
	end if;

	-- Survey stores human-readable MC labels (see seeded survey)
	v_prog := case v_prog
		when 'FTC 1002' then 'ftc'
		when 'FTC 11347' then 'ftc'
		when 'FRC 1002' then 'frc'
		else lower(trim(v_prog))
	end;

	if v_prog in ('ftc-1002', 'ftc-11347') then
		v_prog := 'ftc';
	elsif v_prog = 'frc-1002' then
		v_prog := 'frc';
	end if;

	v_tech := lower(replace(trim(v_tech), ' ', '-'));
	v_bus := lower(replace(trim(v_bus), ' ', '-'));

	if v_prog = 'ftc' then
		v_basic_slug := 'ftc-basic';
		v_tech_slug := 'ftc-technical-' || v_tech;
		v_bus_slug := 'ftc-bus-' || v_bus || '-' || v_tech;
	elsif v_prog = 'frc' then
		v_basic_slug := 'frc-basic';
		v_tech_slug := 'frc-technical-' || v_tech;
		v_bus_slug := 'frc-bus-' || v_bus || '-' || v_tech;
	else
		return false;
	end if;

	if v_tech not in ('manufacturing', 'electrical', 'programming', 'awards') then
		return false;
	end if;
	if v_bus not in ('outreach', 'marketing', 'fundraising', 'operations') then
		return false;
	end if;

	return
		exists (
			select 1
			from public.certifications c
			join public.nodes n on n.id = c.node_id
			where c.user_id = p_user_id
				and n.slug = v_basic_slug
				and c.status = 'completed'::public.certification_status
		)
		and exists (
			select 1
			from public.certifications c
			join public.nodes n on n.id = c.node_id
			where c.user_id = p_user_id
				and n.slug = v_tech_slug
				and c.status = 'completed'::public.certification_status
		)
		and exists (
			select 1
			from public.certifications c
			join public.nodes n on n.id = c.node_id
			where c.user_id = p_user_id
				and n.slug = v_bus_slug
				and c.status = 'completed'::public.certification_status
		);
end;
$$;

grant execute on function public.leadership_training_eligible(uuid) to authenticated;

-- 7) Replace computed status view so leadership respects survey + completions
create or replace view public.v_user_node_status
with (security_invoker = true)
as
select
	c.user_id,
	n.id as node_id,
	case
		when n.slug = 'leadership' and not public.leadership_training_eligible(c.user_id)
			then 'locked'::public.certification_status
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

-- 8) Seed nodes (video-only legacy modules — uses nodes.video_url when blocks absent)
insert into public.nodes (title, slug, description, video_url, subteam_id, ordering)
select v.title, v.slug, v.description, v.video_url, s.id, v.ordering
from (
	values
		('FTC basic training', 'ftc-basic', 'Safety, culture, and FTC fundamentals.', 'https://www.youtube.com/results?search_query=FTC+robotics+basics', 'ftc-program', 10),
		('FRC basic training', 'frc-basic', 'Safety, culture, and FRC fundamentals.', 'https://www.youtube.com/results?search_query=FRC+robotics+basics', 'frc-program', 10),
		('Technical — Manufacturing', 'ftc-technical-manufacturing', 'Manufacturing skills for FTC.', 'https://www.youtube.com/results?search_query=FRC+manufacturing+tutorial', 'ftc-program', 20),
		('Technical — Electrical', 'ftc-technical-electrical', 'Electrical systems for FTC.', 'https://www.youtube.com/results?search_query=FRC+wiring+basics', 'ftc-program', 21),
		('Technical — Programming', 'ftc-technical-programming', 'Software for FTC.', 'https://www.youtube.com/results?search_query=FTC+programming+tutorial', 'ftc-program', 22),
		('Technical — Awards', 'ftc-technical-awards', 'Awards and judging pathways for FTC.', 'https://www.youtube.com/results?search_query=FIRST+robotics+awards', 'ftc-program', 23),
		('Technical — Manufacturing', 'frc-technical-manufacturing', 'Manufacturing skills for FRC.', 'https://www.youtube.com/results?search_query=FRC+manufacturing+tutorial', 'frc-program', 20),
		('Technical — Electrical', 'frc-technical-electrical', 'Electrical systems for FRC.', 'https://www.youtube.com/results?search_query=FRC+wiring+basics', 'frc-program', 21),
		('Technical — Programming', 'frc-technical-programming', 'Software for FRC.', 'https://www.youtube.com/results?search_query=FRC+programming+tutorial', 'frc-program', 22),
		('Technical — Awards', 'frc-technical-awards', 'Awards and outreach judging for FRC.', 'https://www.youtube.com/results?search_query=FIRST+robotics+awards', 'frc-program', 23)
) as v(title, slug, description, video_url, subteam_slug, ordering)
join public.subteams s on s.slug = v.subteam_slug;

-- Business combinations (prereq: matching technical course)
insert into public.nodes (title, slug, description, video_url, subteam_id, ordering)
select format('Business — %s (after %s)', initcap(v.bus), initcap(v.tech)), v.slug, 'Business track module.', 'https://www.youtube.com/results?search_query=FIRST+robotics+business', s.id, v.ordering
from (
	values
		('ftc-bus-outreach-manufacturing', 'outreach', 'manufacturing', 'ftc-program', 100),
		('ftc-bus-marketing-manufacturing', 'marketing', 'manufacturing', 'ftc-program', 101),
		('ftc-bus-fundraising-manufacturing', 'fundraising', 'manufacturing', 'ftc-program', 102),
		('ftc-bus-operations-manufacturing', 'operations', 'manufacturing', 'ftc-program', 103),
		('ftc-bus-outreach-electrical', 'outreach', 'electrical', 'ftc-program', 110),
		('ftc-bus-marketing-electrical', 'marketing', 'electrical', 'ftc-program', 111),
		('ftc-bus-fundraising-electrical', 'fundraising', 'electrical', 'ftc-program', 112),
		('ftc-bus-operations-electrical', 'operations', 'electrical', 'ftc-program', 113),
		('ftc-bus-outreach-programming', 'outreach', 'programming', 'ftc-program', 120),
		('ftc-bus-marketing-programming', 'marketing', 'programming', 'ftc-program', 121),
		('ftc-bus-fundraising-programming', 'fundraising', 'programming', 'ftc-program', 122),
		('ftc-bus-operations-programming', 'operations', 'programming', 'ftc-program', 123),
		('ftc-bus-outreach-awards', 'outreach', 'awards', 'ftc-program', 130),
		('ftc-bus-marketing-awards', 'marketing', 'awards', 'ftc-program', 131),
		('ftc-bus-fundraising-awards', 'fundraising', 'awards', 'ftc-program', 132),
		('ftc-bus-operations-awards', 'operations', 'awards', 'ftc-program', 133),
		('frc-bus-outreach-manufacturing', 'outreach', 'manufacturing', 'frc-program', 100),
		('frc-bus-marketing-manufacturing', 'marketing', 'manufacturing', 'frc-program', 101),
		('frc-bus-fundraising-manufacturing', 'fundraising', 'manufacturing', 'frc-program', 102),
		('frc-bus-operations-manufacturing', 'operations', 'manufacturing', 'frc-program', 103),
		('frc-bus-outreach-electrical', 'outreach', 'electrical', 'frc-program', 110),
		('frc-bus-marketing-electrical', 'marketing', 'electrical', 'frc-program', 111),
		('frc-bus-fundraising-electrical', 'fundraising', 'electrical', 'frc-program', 112),
		('frc-bus-operations-electrical', 'operations', 'electrical', 'frc-program', 113),
		('frc-bus-outreach-programming', 'outreach', 'programming', 'frc-program', 120),
		('frc-bus-marketing-programming', 'marketing', 'programming', 'frc-program', 121),
		('frc-bus-fundraising-programming', 'fundraising', 'programming', 'frc-program', 122),
		('frc-bus-operations-programming', 'operations', 'programming', 'frc-program', 123),
		('frc-bus-outreach-awards', 'outreach', 'awards', 'frc-program', 130),
		('frc-bus-marketing-awards', 'marketing', 'awards', 'frc-program', 131),
		('frc-bus-fundraising-awards', 'fundraising', 'awards', 'frc-program', 132),
		('frc-bus-operations-awards', 'operations', 'awards', 'frc-program', 133)
) as v(slug, bus, tech, subteam_slug, ordering)
join public.subteams s on s.slug = v.subteam_slug;

insert into public.nodes (title, slug, description, video_url, subteam_id, ordering)
select
	'Leadership',
	'leadership',
	'Leadership capstone — unlocks after your basic, technical, and business track modules.',
	'https://www.youtube.com/results?search_query=student+leadership+skills',
	s.id,
	900
from public.subteams s
where s.slug = 'leadership';

-- 9) Prerequisites: basics → technical; technical → business row; no DB prereqs for leadership (handled in view)
insert into public.node_prerequisites (node_id, prerequisite_node_id)
select n.id, b.id
from public.nodes n
join public.nodes b on b.slug = 'ftc-basic'
where n.slug like 'ftc-technical-%';

insert into public.node_prerequisites (node_id, prerequisite_node_id)
select n.id, b.id
from public.nodes n
join public.nodes b on b.slug = 'frc-basic'
where n.slug like 'frc-technical-%';

-- Business modules: prerequisite is matching technical course (last slug segment = technical discipline)
insert into public.node_prerequisites (node_id, prerequisite_node_id)
select nb.id, nt.id
from public.nodes nb
join public.nodes nt on nt.slug = (
	case
		when nb.slug like 'ftc-bus-%' then 'ftc-technical-' || split_part(nb.slug, '-', array_length(string_to_array(nb.slug, '-'), 1))
		when nb.slug like 'frc-bus-%' then 'frc-technical-' || split_part(nb.slug, '-', array_length(string_to_array(nb.slug, '-'), 1))
		else null
	end
)
where nb.slug like '%-bus-%';

-- 10) Category mapping for dashboards / mentor picks
insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'ftc'
where n.slug = 'ftc-basic';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'cat-ftc-basic'
where n.slug = 'ftc-basic';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'frc'
where n.slug = 'frc-basic';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'cat-frc-basic'
where n.slug = 'frc-basic';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'technical'
where n.slug in ('ftc-basic', 'frc-basic') or n.slug like '%technical%';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'business'
where n.slug like '%-bus-%' or n.slug = 'leadership';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = 'leadership-track'
where n.slug = 'leadership';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = case n.slug
	when 'ftc-technical-manufacturing' then 'cat-tech-manufacturing'
	when 'ftc-technical-electrical' then 'cat-tech-electrical'
	when 'ftc-technical-programming' then 'cat-tech-programming'
	when 'ftc-technical-awards' then 'cat-tech-awards'
	when 'frc-technical-manufacturing' then 'cat-frc-tech-manufacturing'
	when 'frc-technical-electrical' then 'cat-frc-tech-electrical'
	when 'frc-technical-programming' then 'cat-frc-tech-programming'
	when 'frc-technical-awards' then 'cat-frc-tech-awards'
	else null
end
where n.slug like '%-technical-%';

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug = case
	when n.slug like 'ftc-bus-outreach-%' or n.slug like 'frc-bus-outreach-%' then 'cat-bus-outreach'
	when n.slug like 'ftc-bus-marketing-%' or n.slug like 'frc-bus-marketing-%' then 'cat-bus-marketing'
	when n.slug like 'ftc-bus-fundraising-%' or n.slug like 'frc-bus-fundraising-%' then 'cat-bus-fundraising'
	when n.slug like 'ftc-bus-operations-%' or n.slug like 'frc-bus-operations-%' then 'cat-bus-operations'
	else null
end
where n.slug like '%-bus-%';

-- 11) Default checkoff shells + assessments empty
insert into public.node_checkoff_requirements (node_id, title, directions, mentor_checklist, resource_links, evidence_mode)
select n.id, 'Skills Check', '', '[]'::jsonb, '[]'::jsonb, 'none'
from public.nodes n
on conflict (node_id) do nothing;

-- 12) Team path survey (human-readable MC labels)
insert into public.surveys (title, slug, description, questions, is_active, show_when_inactive)
values (
	'Team path selection',
	'team-path-selection',
	'Choose your FTC/FRC program, one technical focus, and one business focus. This unlocks your training sequence and later Leadership.',
	'[
		{
			"id": "program",
			"type": "mc",
			"prompt": "Which competition team are you on?",
			"options": ["FTC 1002", "FTC 11347", "FRC 1002"],
			"correct": "FTC 1002",
			"randomize_options": false
		},
		{
			"id": "technical",
			"type": "mc",
			"prompt": "Pick ONE technical track.",
			"options": ["Manufacturing", "Electrical", "Programming", "Awards"],
			"correct": "Manufacturing",
			"randomize_options": false
		},
		{
			"id": "business",
			"type": "mc",
			"prompt": "Pick ONE business track.",
			"options": ["Outreach", "Marketing", "Fundraising", "Operations"],
			"correct": "Outreach",
			"randomize_options": false
		}
	]'::jsonb,
	true,
	false
);
