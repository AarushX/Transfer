-- Upgrade parent-application quiz to use matrix/table question types.

with target_quiz as (
	select b.id
	from public.node_blocks b
	join public.nodes n on n.id = b.node_id
	where n.slug = 'parent-application'
		and b.type = 'quiz'
	order by b.position
	limit 1
)
update public.node_blocks b
set config = jsonb_build_object(
	'title', 'WRT 2026-27 Parent Application (Matrix)',
	'passing_score', 100,
	'questions', jsonb_build_array(
		-- I. Introductory & Student Information
		jsonb_build_object('id','q1','type','mc','prompt','I''ve read the introductory letter for parents.','options',jsonb_build_array('Yes','No'),'correct','Yes'),
		jsonb_build_object('id','q2','type','mc','prompt','I attended the Wheeler / CircuitRunners Prospective Member Interest Meeting with my student.','options',jsonb_build_array('Yes','No','Not Applicable - I am a returning member parent'),'correct','Yes'),
		jsonb_build_object('id','q3','type','short','prompt','Student LAST name','correct','acknowledged'),
		jsonb_build_object('id','q4','type','short','prompt','Student FIRST name','correct','acknowledged'),
		jsonb_build_object('id','q5','type','mc','prompt','Grade - student''s grade in August','options',jsonb_build_array('9','10','11','12'),'correct','9'),
		jsonb_build_object('id','q6','type','mc','prompt','In August, my student will be in this grade','options',jsonb_build_array('9','10','11','12'),'correct','9'),

		-- II. Parent/Guardian Information
		jsonb_build_object(
			'id','q7',
			'type','short_grid',
			'prompt','Parent/Guardian Information',
			'rows',jsonb_build_array('Parent 1','Parent 2'),
			'columns',jsonb_build_array('LAST name','FIRST name','cell phone (404.404.4040)','email','occupation','employer')
		),

		-- III. Team Status
		jsonb_build_object('id','q8','type','mc','prompt','My student fits in this group','options',jsonb_build_array('Rookie to Wheeler / CircuitRunners for 2026-27 Season','Returning to Wheeler / CircuitRunners'),'correct','Rookie to Wheeler / CircuitRunners for 2026-27 Season'),
		jsonb_build_object('id','q9','type','mc','prompt','Rookie year on team','options',jsonb_build_array('2023','2024','2025','2026 - My student will be a rookie this year!'),'correct','2026 - My student will be a rookie this year!'),

		-- IV. Parent Volunteer Commitment (single-select matrix)
		jsonb_build_object(
			'id','q10',
			'type','matrix',
			'prompt','We really need you to volunteer! Choose at least 3 ways you''ll volunteer. Make one response in each row.',
			'rows',jsonb_build_array(
				'Host 3 evenings of field practice for other teams',
				'Participate in at least 12 hours of field build',
				'Plan team travel details (transportation, meals, hotel, etc.)',
				'Serve as a chaperone for an out of town trip',
				'Provide team member transportation to two team competitions within driving distance',
				'Serve as a team mentor in an area of your expertise',
				'Supervise 3 evenings of team meetings',
				'Take part in 3 outreach activities',
				'Provide food on at least 3 occasions for the whole team'
			),
			'columns',jsonb_build_array('Yes','No','Maybe - contact me'),
			'correct_map',jsonb_build_object()
		),

		-- V. Leadership & Specialized Skills (single-select matrix)
		jsonb_build_object(
			'id','q11',
			'type','matrix',
			'prompt','Leadership (Returning Members ONLY)',
			'rows',jsonb_build_array(
				'Parent volunteer coordination and parent communication',
				'Getting team sponsorships',
				'DE field coordinator',
				'Field build chair',
				'Food committee chairperson',
				'End of year banquet chairperson',
				'Shadow a role for future leadership'
			),
			'columns',jsonb_build_array('Yes','No','Maybe - Contact me'),
			'correct_map',jsonb_build_object()
		),
		jsonb_build_object(
			'id','q12',
			'type','matrix',
			'prompt','Skills/Talents/Interest Areas',
			'rows',jsonb_build_array(
				'Fundraising',
				'Transportation for equipment',
				'Sponsorship - recruitment and relations',
				'I would like to sponsor the team!'
			),
			'columns',jsonb_build_array('Yes!','No','Maybe - contact me'),
			'correct_map',jsonb_build_object()
		),
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
		),
		jsonb_build_object('id','q14','type','short','prompt','Other ways you see yourself helping Wheeler / CircuitRunners Robotics','correct','acknowledged'),

		-- VI. Commitment and Signature
		jsonb_build_object(
			'id','q15',
			'type','matrix',
			'prompt','Walton Robotics is a varsity-sport time commitment. Check each statement:',
			'rows',jsonb_build_array(
				'Walton Robotics is a competitive team – not a club.',
				'Involvement with Walton Robotics is a major commitment of time.',
				'Students are EXPECTED to attend all team competitions.',
				'Parent involvement is REQUIRED.',
				'Students and parents are expected to follow ALL team rules, including those established for travel.'
			),
			'columns',jsonb_build_array('Yes!','No - probably not the team for you'),
			'correct_map',jsonb_build_object()
		),
		jsonb_build_object('id','q16','type','short','prompt','Type name of student applicant','correct','acknowledged'),
		jsonb_build_object('id','q17','type','short','prompt','Type student email address as signature','correct','acknowledged'),
		jsonb_build_object('id','q18','type','short','prompt','Date student signed application','correct','acknowledged'),
		jsonb_build_object('id','q19','type','short','prompt','Type name of parent applicant','correct','acknowledged'),
		jsonb_build_object('id','q20','type','short','prompt','Type parent email address as signature','correct','acknowledged'),
		jsonb_build_object('id','q21','type','short','prompt','Date parent signed application','correct','acknowledged')
	)
)
from target_quiz t
where b.id = t.id;
