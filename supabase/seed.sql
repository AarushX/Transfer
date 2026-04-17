insert into public.subteams (name, slug, description)
values
	('Software', 'software', 'Programming, controls, and integration'),
	('Machining', 'machining', 'Safe operation of fabrication tools'),
	('Business', 'business', 'Outreach, finance, and operations')
on conflict (slug) do nothing;

with machining as (
	select id from public.subteams where slug = 'machining'
),
inserted_nodes as (
	insert into public.nodes (title, slug, description, video_url, subteam_id, tier, physical_task, ordering)
	select * from (
		values
			(
				'Shop Safety Fundamentals',
				'shop-safety-fundamentals',
				'PPE, hazard recognition, and safe behavior in the machine shop.',
				'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				(select id from machining),
				1,
				'Demonstrate proper PPE and identify three hazards in the shop.',
				1
			),
			(
				'Drill Press Basics',
				'drill-press-basics',
				'Safe setup, clamping, and drilling procedures.',
				'https://www.youtube.com/watch?v=9bZkp7q19f0',
				(select id from machining),
				1,
				'Set up and drill a clean through-hole with correct clamping.',
				2
			),
			(
				'Lathe Intro',
				'lathe-intro',
				'Lathe safety, facing, and simple turning operations.',
				'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
				(select id from machining),
				2,
				'Face stock and turn to target diameter within tolerance.',
				3
			)
	) as v(title, slug, description, video_url, subteam_id, tier, physical_task, ordering)
	on conflict (slug) do update set
		title = excluded.title,
		description = excluded.description,
		video_url = excluded.video_url,
		physical_task = excluded.physical_task,
		ordering = excluded.ordering
	returning id, slug
)
insert into public.assessments (node_id, passing_score, questions)
select
	n.id,
	80,
	case n.slug
		when 'shop-safety-fundamentals' then
			'[
				{"id":"q1","prompt":"What is the first step before using any machine?","type":"mc","options":["Put on PPE","Ask a friend","Start immediately"],"correct":"Put on PPE"},
				{"id":"q2","prompt":"Loose clothing is safe around rotating tools.","type":"tf","correct":"false"}
			]'::jsonb
		when 'drill-press-basics' then
			'[
				{"id":"q1","prompt":"Work should be secured with:","type":"mc","options":["Hands only","A clamp or vise","Tape"],"correct":"A clamp or vise"},
				{"id":"q2","prompt":"What speed should be used for larger bits?","type":"short","correct":"slower"}
			]'::jsonb
		else
			'[
				{"id":"q1","prompt":"Facing operation should be done with tool set to center height.","type":"tf","correct":"true"},
				{"id":"q2","prompt":"Name one reason to use cutting fluid on a lathe.","type":"short","correct":"reduce heat"}
			]'::jsonb
	end
from inserted_nodes n
on conflict (node_id) do update set
	passing_score = excluded.passing_score,
	questions = excluded.questions;

insert into public.node_prerequisites (node_id, prerequisite_node_id)
select n2.id, n1.id
from public.nodes n1
join public.nodes n2 on n1.slug = 'shop-safety-fundamentals' and n2.slug = 'drill-press-basics'
on conflict do nothing;

insert into public.node_prerequisites (node_id, prerequisite_node_id)
select n3.id, n2.id
from public.nodes n2
join public.nodes n3 on n2.slug = 'drill-press-basics' and n3.slug = 'lathe-intro'
on conflict do nothing;

insert into public.machines (name, location, required_node_ids)
select
	'Drill Press',
	'Shop Bay A',
	array[(select id from public.nodes where slug = 'drill-press-basics')]
where not exists (select 1 from public.machines where name = 'Drill Press');

insert into public.machines (name, location, required_node_ids)
select
	'Lathe',
	'Shop Bay B',
	array[(select id from public.nodes where slug = 'lathe-intro')]
where not exists (select 1 from public.machines where name = 'Lathe');
