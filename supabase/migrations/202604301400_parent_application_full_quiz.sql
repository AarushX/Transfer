-- Expand parent-application quiz block to include the full question set.

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
	'title', 'WRT 2026-27 Parent Application (Full)',
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
		jsonb_build_object('id','q7','type','short','prompt','Parent 1 - LAST name','correct','acknowledged'),
		jsonb_build_object('id','q8','type','short','prompt','Parent 1 - FIRST name','correct','acknowledged'),
		jsonb_build_object('id','q9','type','short','prompt','Parent 1 - cell phone (404.404.4040)','correct','acknowledged'),
		jsonb_build_object('id','q10','type','short','prompt','Parent 1 - email','correct','acknowledged'),
		jsonb_build_object('id','q11','type','short','prompt','Parent 1 - occupation','correct','acknowledged'),
		jsonb_build_object('id','q12','type','short','prompt','Parent 1 - employer','correct','acknowledged'),
		jsonb_build_object('id','q13','type','short','prompt','Parent 2 - LAST name','correct','acknowledged'),
		jsonb_build_object('id','q14','type','short','prompt','Parent 2 - FIRST name','correct','acknowledged'),
		jsonb_build_object('id','q15','type','short','prompt','Parent 2 - cell phone (404.404.4040)','correct','acknowledged'),
		jsonb_build_object('id','q16','type','short','prompt','Parent 2 - email','correct','acknowledged'),
		jsonb_build_object('id','q17','type','short','prompt','Parent 2 - occupation','correct','acknowledged'),
		jsonb_build_object('id','q18','type','short','prompt','Parent 2 - employer','correct','acknowledged'),

		-- III. Team Status
		jsonb_build_object('id','q19','type','mc','prompt','My student fits in this group','options',jsonb_build_array('Rookie to Wheeler / CircuitRunners for 2026-27 Season','Returning to Wheeler / CircuitRunners'),'correct','Rookie to Wheeler / CircuitRunners for 2026-27 Season'),
		jsonb_build_object('id','q20','type','mc','prompt','Rookie year on team','options',jsonb_build_array('2023','2024','2025','2026 - My student will be a rookie this year!'),'correct','2026 - My student will be a rookie this year!'),

		-- IV. Parent Volunteer Commitment
		jsonb_build_object('id','q21','type','mc','prompt','Host 3 evenings of field practice for other teams','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q22','type','mc','prompt','Participate in at least 12 hours of field build','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q23','type','mc','prompt','Plan team travel details (transportation, meals, hotel, etc.)','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q24','type','mc','prompt','Serve as a chaperone for an out of town trip','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q25','type','mc','prompt','Provide team member transportation to two team competitions within driving distance','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q26','type','mc','prompt','Serve as a team mentor in an area of your expertise','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q27','type','mc','prompt','Supervise 3 evenings of team meetings','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q28','type','mc','prompt','Take part in 3 outreach activities','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),
		jsonb_build_object('id','q29','type','mc','prompt','Provide food on at least 3 occasions for the whole team','options',jsonb_build_array('Yes','No','Maybe - contact me'),'correct','Yes'),

		-- V. Leadership & Specialized Skills
		jsonb_build_object('id','q30','type','mc','prompt','Leadership: Parent volunteer coordination and parent communication','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q31','type','mc','prompt','Leadership: Getting team sponsorships','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q32','type','mc','prompt','Leadership: DE field coordinator','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q33','type','mc','prompt','Leadership: Field build chair','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q34','type','mc','prompt','Leadership: Food committee chairperson','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q35','type','mc','prompt','Leadership: End of year banquet chairperson','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q36','type','mc','prompt','Leadership: Shadow a role for future leadership','options',jsonb_build_array('Yes','No','Maybe - Contact me'),'correct','Yes'),
		jsonb_build_object('id','q37','type','mc','prompt','Skills/Talents: Fundraising','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q38','type','mc','prompt','Skills/Talents: Transportation for equipment','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q39','type','mc','prompt','Skills/Talents: Sponsorship recruitment and relations','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q40','type','mc','prompt','Skills/Talents: I would like to sponsor the team!','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q41','type','mc','prompt','Mentoring Interest: Community Service','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q42','type','mc','prompt','Mentoring Interest: Mechanical / Electrical','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q43','type','mc','prompt','Mentoring Interest: Programming','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q44','type','mc','prompt','Mentoring Interest: CAD','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q45','type','mc','prompt','Mentoring Interest: Communications','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q46','type','mc','prompt','Mentoring Interest: Financial Accounting','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q47','type','mc','prompt','Mentoring Interest: Photo/video','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q48','type','mc','prompt','Mentoring Interest: Business','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q49','type','mc','prompt','Mentoring Interest: Event Planning','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q50','type','mc','prompt','Mentoring Interest: Travel Coordination','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q51','type','mc','prompt','Mentoring Interest: Public Speaking','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q52','type','mc','prompt','Mentoring Interest: Graphics','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q53','type','mc','prompt','Mentoring Interest: Open Field event management','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q54','type','mc','prompt','Mentoring Interest: Girls FIRST event management','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q55','type','mc','prompt','Mentoring Interest: Summer Camps event management','options',jsonb_build_array('Yes!','No','Maybe - contact me'),'correct','Yes!'),
		jsonb_build_object('id','q56','type','short','prompt','Other ways you see yourself helping Wheeler / CircuitRunners Robotics','correct','acknowledged'),

		-- VI. Commitment and Signature
		jsonb_build_object('id','q57','type','mc','prompt','I understand Walton/Wheeler Robotics is a competitive team, not a club.','options',jsonb_build_array('Yes!','No - probably not the team for you'),'correct','Yes!'),
		jsonb_build_object('id','q58','type','mc','prompt','I understand involvement is a major commitment of time.','options',jsonb_build_array('Yes!','No - probably not the team for you'),'correct','Yes!'),
		jsonb_build_object('id','q59','type','mc','prompt','I understand students are expected to attend all competitions.','options',jsonb_build_array('Yes!','No - probably not the team for you'),'correct','Yes!'),
		jsonb_build_object('id','q60','type','mc','prompt','I understand parent involvement is required.','options',jsonb_build_array('Yes!','No - probably not the team for you'),'correct','Yes!'),
		jsonb_build_object('id','q61','type','mc','prompt','I understand students and parents are expected to follow all team rules, including travel rules.','options',jsonb_build_array('Yes!','No - probably not the team for you'),'correct','Yes!'),
		jsonb_build_object('id','q62','type','short','prompt','Type name of student applicant','correct','acknowledged'),
		jsonb_build_object('id','q63','type','short','prompt','Type student email address as signature','correct','acknowledged'),
		jsonb_build_object('id','q64','type','short','prompt','Date student signed application','correct','acknowledged'),
		jsonb_build_object('id','q65','type','short','prompt','Type name of parent applicant','correct','acknowledged'),
		jsonb_build_object('id','q66','type','short','prompt','Type parent email address as signature','correct','acknowledged'),
		jsonb_build_object('id','q67','type','short','prompt','Date parent signed application','correct','acknowledged')
	)
)
from target_quiz t
where b.id = t.id;
