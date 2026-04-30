-- Follow-up migration to ensure parent-application uses grouped grids.

with target_quiz as (
	select b.id, b.config
	from public.node_blocks b
	join public.nodes n on n.id = b.node_id
	where n.slug = 'parent-application'
		and b.type = 'quiz'
	order by b.position
	limit 1
),
updated_questions as (
	select
		t.id,
		jsonb_agg(
			case
				-- Parent/Guardian info as grouped short-answer grid
				when q.elem->>'id' = 'q7' then
					jsonb_build_object(
						'id','q7',
						'type','short_grid',
						'prompt','Parent/Guardian Information',
						'rows',jsonb_build_array('Parent 1','Parent 2'),
						'columns',jsonb_build_array(
							'LAST name',
							'FIRST name',
							'cell phone (404.404.4040)',
							'email',
							'occupation',
							'employer'
						)
					)
				-- Mentoring interests should be single-select matrix (not multi-select)
				when q.elem->>'id' = 'q13' then
					jsonb_build_object(
						'id','q13',
						'type','matrix',
						'prompt','Mentoring Interests',
						'rows',jsonb_build_array(
							'Community Service',
							'Mechanical / Electrical',
							'Programming',
							'CAD',
							'Communications',
							'Financial Accounting',
							'Photo/video',
							'Business',
							'Event Planning',
							'Travel Coordination',
							'Public Speaking',
							'Graphics',
							'Open Field event management',
							'Girls FIRST event management',
							'Summer Camps event management'
						),
						'columns',jsonb_build_array('Yes!','No','Maybe - contact me'),
						'correct_map',jsonb_build_object()
					)
				when q.elem->>'id' = 'q24' then
					jsonb_build_object(
						'id','q24',
						'type','matrix',
						'prompt','Mentoring Interests',
						'rows',jsonb_build_array(
							'Community Service',
							'Mechanical / Electrical',
							'Programming',
							'CAD',
							'Communications',
							'Financial Accounting',
							'Photo/video',
							'Business',
							'Event Planning',
							'Travel Coordination',
							'Public Speaking',
							'Graphics',
							'Open Field event management',
							'Girls FIRST event management',
							'Summer Camps event management'
						),
						'columns',jsonb_build_array('Yes!','No','Maybe - contact me'),
						'correct_map',jsonb_build_object()
					)
				else q.elem
			end
			order by q.ord
		) as questions
	from target_quiz t
	cross join lateral jsonb_array_elements(coalesce(t.config->'questions', '[]'::jsonb)) with ordinality as q(elem, ord)
	group by t.id
)
update public.node_blocks b
set config = jsonb_set(
	coalesce(b.config, '{}'::jsonb),
	'{questions}',
	u.questions,
	true
)
from updated_questions u
where b.id = u.id;
