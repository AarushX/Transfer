update public.subteams
set slug = 'mechanical'
where slug = 'machining'
	and not exists (select 1 from public.subteams where slug = 'mechanical');

update public.subteams
set
	name = 'Mechanical',
	description = 'CAD, fabrication, and robot construction'
where slug = 'mechanical';

insert into public.subteams (name, slug, description)
values
	('Leadership', 'leadership', 'Leadership, planning, communication, and team operations'),
	('Mechanical', 'mechanical', 'CAD, fabrication, and robot construction'),
	('Electrical', 'electrical', 'Wiring, controls, CAN, pneumatics, and power systems'),
	('Software', 'software', 'Programming, controls, and robot software architecture'),
	('Strategy', 'strategy', 'Scouting, match strategy, and drive team execution'),
	('Business', 'business', 'Sponsorships, branding, media, and team administration'),
	('Operations', 'operations', 'Reliability, troubleshooting, pit systems, and team process')
on conflict (slug) do update set
	name = excluded.name,
	description = excluded.description;

delete from public.machines where name in ('Drill Press', 'Lathe');
delete from public.nodes where slug in ('drill-press-basics', 'lathe-intro');

with curriculum as (
	select *
	from (
		values
			(
				'Project Management (1678 Fall Workshops)',
				'project-management-1678',
				'Learn project planning fundamentals used by elite FRC programs.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Project+Management',
				'leadership',
				1,
				1,
				'Build a one-week project plan for a real team deliverable and review it with your subteam lead.'
			),
			(
				'Gantt Chart Excel Tutorial',
				'gantt-chart-excel',
				'Use Gantt charts to visualize schedules, milestones, and dependencies.',
				'https://www.youtube.com/results?search_query=Gantt+Chart+Excel+Tutorial+Kevin+Stratvert',
				'leadership',
				1,
				2,
				'Create a Gantt chart for your current robot build sprint with at least five tasks and two dependencies.'
			),
			(
				'Strategic Design (1678 Fall Workshops)',
				'strategic-design-1678',
				'Connect game analysis to architecture and subsystem priorities.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Strategic+Design',
				'leadership',
				2,
				3,
				'Present a strategic design brief that explains three prioritized scoring objectives for a game.'
			),
			(
				'Finding the Critical Path',
				'critical-path-method',
				'Identify schedule-critical tasks and sequence work to avoid slips.',
				'https://www.youtube.com/results?search_query=Project+Management+Finding+the+Critical+Path+Eugene+O%27Loughlin',
				'leadership',
				2,
				4,
				'Calculate the critical path for your team project timeline and explain which delays would affect delivery.'
			),
			(
				'Scrum and Agile in FRC',
				'scrum-agile-frc',
				'Apply iterative planning and standup rhythms to student projects.',
				'https://www.youtube.com/results?search_query=Scrum+and+Agile+in+FRC+FUN',
				'leadership',
				2,
				5,
				'Run a 10-minute standup with your pod and capture blockers, owners, and next actions.'
			),
			(
				'Agile Project Management Tutorial',
				'agile-pm-tutorial',
				'Understand agile terminology and practical planning techniques.',
				'https://www.youtube.com/results?search_query=Agile+Project+Management+Tutorial+Simplilearn',
				'leadership',
				2,
				6,
				'Draft a backlog of at least eight tasks and organize them into a one-week sprint.'
			),
			(
				'How to Prioritize Tasks Effectively',
				'prioritize-tasks',
				'Prioritize team work with urgency and impact frameworks.',
				'https://www.youtube.com/results?search_query=How+to+Prioritize+Tasks+Effectively+Thomas+Frank',
				'leadership',
				1,
				7,
				'Rank five active team tasks using an urgency-impact matrix and justify your top two.'
			),
			(
				'How to Write Meeting Minutes',
				'meeting-minutes-how-to',
				'Capture decisions, owners, and deadlines in concise meeting notes.',
				'https://www.youtube.com/results?search_query=How+to+Write+Meeting+Minutes+Brain+Sensei',
				'leadership',
				1,
				8,
				'Take minutes for a real meeting and publish notes with actions and owners within 24 hours.'
			),
			(
				'Crucial Conversations Summary',
				'crucial-conversations',
				'Use conflict-resolution tools that preserve trust and accountability.',
				'https://www.youtube.com/results?search_query=Crucial+Conversations+Summary+Joseph+Rodrigues',
				'leadership',
				2,
				9,
				'Role-play a difficult team conversation and demonstrate a clear, respectful feedback approach.'
			),
			(
				'Think Fast, Talk Smart',
				'think-fast-talk-smart',
				'Communicate clearly under pressure in technical and leadership contexts.',
				'https://www.youtube.com/results?search_query=Think+Fast+Talk+Smart+Stanford',
				'leadership',
				3,
				10,
				'Deliver a 90-second impromptu update on subsystem status with a clear ask and next step.'
			),
			(
				'Robot Architecture (1678 Fall Workshops)',
				'robot-architecture-1678',
				'Structure cross-subsystem decisions to reduce integration risk.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Robot+Architecture',
				'leadership',
				3,
				11,
				'Lead an architecture review where each subsystem reports interfaces, assumptions, and risks.'
			),
			(
				'FRC Team Budgeting and Finances',
				'frc-budgeting-finances-fun',
				'Plan team finances to support build season and outreach goals.',
				'https://www.youtube.com/results?search_query=FRC+Team+Budgeting+and+Finances+FUN',
				'leadership',
				2,
				12,
				'Create a draft monthly budget with categories, assumptions, and one cost-control recommendation.'
			),
			(
				'How to be a Good FRC Mentor',
				'good-frc-mentor',
				'Develop mentorship behaviors that grow student ownership and safety.',
				'https://www.youtube.com/results?search_query=How+to+be+a+Good+FRC+Mentor+FUN',
				'leadership',
				3,
				13,
				'Observe a team work session and document three mentor behaviors you will apply this week.'
			),
			(
				'The Socratic Method',
				'socratic-method',
				'Use guided questions to coach problem-solving without taking over.',
				'https://www.youtube.com/results?search_query=The+Socratic+Method+Sprouts',
				'leadership',
				3,
				14,
				'Coach a teammate through a technical issue using only questions, then summarize their final reasoning.'
			),
			(
				'Prototyping & Design Process (1678)',
				'prototyping-design-process-1678',
				'Run rapid prototype cycles that validate assumptions early.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Prototyping+Design+Process',
				'leadership',
				2,
				15,
				'Plan and execute one prototype experiment with a success metric and documented result.'
			),
			(
				'FMEA Explained in 10 Minutes',
				'fmea-explained',
				'Assess failure modes and prioritize mitigation actions.',
				'https://www.youtube.com/results?search_query=FMEA+Explained+in+10+Minutes+QualityGurus',
				'leadership',
				3,
				16,
				'Complete an FMEA table for one subsystem and identify the top two highest-risk failure modes.'
			),
			(
				'UL Safety Captain Training',
				'ul-safety-captain-training',
				'Establish safety leadership habits for daily team operations.',
				'https://www.youtube.com/results?search_query=UL+Safety+Captain+Training+FIRST',
				'leadership',
				1,
				17,
				'Lead a pre-meeting safety briefing and document one shop improvement action.'
			),
			(
				'Shop Safety Fundamentals',
				'shop-safety-fundamentals',
				'PPE, hazard recognition, and safe behavior in the machine shop.',
				'https://www.youtube.com/results?search_query=UL+Safety+Captain+Training+FIRST',
				'mechanical',
				1,
				1,
				'Demonstrate correct PPE and identify three hazards in your current work area before starting fabrication.'
			),
			(
				'CAD 2 Top Down Design (1678)',
				'cad2-top-down-design-1678',
				'Use top-down CAD methods to control interfaces and design intent.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+CAD+2+Top+Down+Design',
				'mechanical',
				2,
				2,
				'Create a top-down CAD layout for one subsystem with at least three driven dimensions.'
			),
			(
				'Onshape Master Model Tutorial',
				'onshape-master-model',
				'Build robust assemblies with a shared master model workflow.',
				'https://www.youtube.com/results?search_query=Onshape+Master+Model+Tutorial',
				'mechanical',
				2,
				3,
				'Build a master sketch and derive two dependent parts while keeping references stable.'
			),
			(
				'Dogbone Fillets for CNC',
				'dogbone-fillets-cnc',
				'Apply CNC-friendly geometry to improve manufacturability and fit.',
				'https://www.youtube.com/results?search_query=Why+You+Need+Dogbone+Fillets+for+CNC+Routing+Winston+Moy',
				'mechanical',
				3,
				4,
				'Update a plate design with dogbones and show why the updated corners assemble correctly.'
			),
			(
				'Intro to reca.lc for FRC',
				'recalc-intro-frc',
				'Estimate robot performance and tradeoffs with quick calculations.',
				'https://www.youtube.com/results?search_query=Intro+to+reca.lc+for+FRC',
				'mechanical',
				2,
				5,
				'Model a drivetrain setup in reca.lc and compare predicted speed/acceleration for two gear ratios.'
			),
			(
				'Understanding DC Motor Curves',
				'dc-motor-curves',
				'Interpret torque-speed curves to inform mechanism design choices.',
				'https://www.youtube.com/results?search_query=Understanding+DC+Motor+Curves+VEX+Robotics',
				'mechanical',
				1,
				6,
				'Use a motor curve to estimate operating point for one planned mechanism load case.'
			),
			(
				'FRC Materials & Fasteners Guide',
				'materials-fasteners-spectrum',
				'Choose hardware and materials appropriate for FRC loads and service.',
				'https://www.youtube.com/results?search_query=FRC+Materials+Fasteners+Guide+Spectrum+3847',
				'mechanical',
				1,
				7,
				'Select fasteners and material thickness for one joint and justify the choice.'
			),
			(
				'How to Read a Digital Caliper',
				'digital-caliper',
				'Take accurate measurements and verify fabricated parts.',
				'https://www.youtube.com/results?search_query=How+to+Read+a+Digital+Caliper+Haas',
				'mechanical',
				1,
				8,
				'Measure three parts with a caliper and report tolerance pass/fail against drawing dimensions.'
			),
			(
				'Tap and Drill Chart Basics',
				'tap-drill-chart',
				'Use tap drill charts to prepare threaded holes correctly.',
				'https://www.youtube.com/results?search_query=How+to+Read+and+Use+a+Tap+and+Drill+Chart+Toms+Techniques',
				'mechanical',
				1,
				9,
				'Look up drill sizes for two thread standards and set up the correct tooling for each.'
			),
			(
				'Speeds and Feeds for CNC',
				'speeds-feeds-cnc',
				'Pick feeds and spindle speeds that balance tool life and finish.',
				'https://www.youtube.com/results?search_query=Speeds+and+Feeds+Tutorial+for+CNC+Winston+Moy',
				'mechanical',
				3,
				10,
				'Create a CAM setup with justified speed/feed settings and cut a test coupon.'
			),
			(
				'Fusion 360 CAM for Beginners',
				'fusion360-cam-beginners',
				'Create practical CAM toolpaths from CAD geometry.',
				'https://www.youtube.com/results?search_query=Fusion+360+CAM+Tutorial+for+Beginners+NYC+CNC',
				'mechanical',
				3,
				11,
				'Generate and simulate toolpaths for a simple plate and export a manufacturing-ready setup sheet.'
			),
			(
				'Fasteners and Materials in FRC',
				'fasteners-materials-fim',
				'Apply robust fastener strategy for maintainable robot assemblies.',
				'https://www.youtube.com/results?search_query=Fasteners+and+Materials+in+FRC+FIRST+in+Michigan',
				'mechanical',
				1,
				12,
				'Assemble a sample joint using selected hardware and explain serviceability tradeoffs.'
			),
			(
				'Blind Rivets: How They Work',
				'blind-rivets',
				'Install and inspect riveted joints for structure and reliability.',
				'https://www.youtube.com/results?search_query=Blind+Rivets+How+They+Work+The+Fab+Forums',
				'mechanical',
				1,
				13,
				'Install three blind rivets in scrap material and verify clamp quality and alignment.'
			),
			(
				'Threadlocker Basics',
				'threadlocker-loctite',
				'Prevent vibration loosening with correct threadlocker usage.',
				'https://www.youtube.com/results?search_query=Threadlocker+Basics+Engineering+Explained',
				'mechanical',
				1,
				14,
				'Apply the correct threadlocker to a test assembly and document cure and service steps.'
			),
			(
				'Clecos and How to Use Them',
				'clecos-howto',
				'Use temporary fasteners for alignment during fabrication.',
				'https://www.youtube.com/results?search_query=What+are+Clecos+and+How+to+Use+Them+HomeBuiltHelp',
				'mechanical',
				1,
				15,
				'Use clecos to fixture a two-panel assembly before final fastening.'
			),
			(
				'FRC Electrical Best Practices',
				'frc-electrical-best-practices-6328',
				'Build clean, serviceable electrical systems with FRC-specific conventions.',
				'https://www.youtube.com/results?search_query=FRC+Electrical+Best+Practices+6328',
				'electrical',
				1,
				1,
				'Review your robot wiring and identify three concrete improvements with before/after photos.'
			),
			(
				'Installing Anderson Powerpoles',
				'anderson-powerpoles',
				'Crimp and assemble Powerpoles correctly for reliable power distribution.',
				'https://www.youtube.com/results?search_query=How+to+install+Anderson+Powerpole+Connectors+Powerwerx',
				'electrical',
				1,
				2,
				'Terminate one test lead with Powerpoles and pass a pull test supervised by a mentor.'
			),
			(
				'How to Use Wire Ferrules',
				'wire-ferrules',
				'Improve terminal reliability with proper ferrule sizing and crimping.',
				'https://www.youtube.com/results?search_query=How+to+Use+Wire+Ferrules+The+Engineering+Mindset',
				'electrical',
				1,
				3,
				'Prepare and crimp ferrules for two wire gauges and verify secure terminal fit.'
			),
			(
				'CAN Bus Wiring Best Practices',
				'can-bus-best-practices',
				'Design robust CAN topologies with clean wiring and diagnostics in mind.',
				'https://www.youtube.com/results?search_query=CAN+Bus+Wiring+Best+Practices+CTR+Electronics',
				'electrical',
				2,
				4,
				'Create a CAN wiring plan for a drivetrain including node order and service loops.'
			),
			(
				'Cable Management and Strain Relief',
				'cable-management-strain-relief',
				'Route and anchor wiring to resist vibration and repeated maintenance.',
				'https://www.youtube.com/results?search_query=Cable+Management+and+Strain+Relief+Tips+EEVblog',
				'electrical',
				2,
				5,
				'Rework one cable run to include strain relief, labeling, and protected bend radius.'
			),
			(
				'FRC Pneumatics Step-by-Step',
				'frc-pneumatics-step-by-step',
				'Assemble and verify safe pneumatic systems for FRC robots.',
				'https://www.youtube.com/results?search_query=FRC+Pneumatics+Step-by-Step+AutomationDirect',
				'electrical',
				2,
				6,
				'Assemble a small pneumatic test circuit and validate leak-free operation.'
			),
			(
				'Testing FRC Battery Internal Resistance',
				'battery-internal-resistance',
				'Evaluate battery health to reduce brownouts and match failures.',
				'https://www.youtube.com/results?search_query=Testing+FRC+Batteries+Internal+Resistance',
				'electrical',
				2,
				7,
				'Measure internal resistance for three batteries and tag one as preferred competition stock.'
			),
			(
				'Git and GitHub for FRC',
				'git-github-frc-0to-autonomous',
				'Use version control workflows for safe robot code collaboration.',
				'https://www.youtube.com/results?search_query=Git+and+GitHub+for+FRC+0+to+Autonomous',
				'software',
				1,
				1,
				'Create a branch, commit a change, and open a pull request in your team repo.'
			),
			(
				'Git Tutorial for Beginners',
				'git-tutorial-mosh',
				'Learn core Git concepts: commits, branches, merges, and history.',
				'https://www.youtube.com/results?search_query=Git+Tutorial+for+Beginners+Programming+with+Mosh',
				'software',
				1,
				2,
				'Resolve one simple merge conflict in a practice branch and explain your resolution.'
			),
			(
				'WPILib Command-Based Programming',
				'wpilib-command-based',
				'Structure robot software with commands, subsystems, and scheduling.',
				'https://www.youtube.com/results?search_query=WPILib+Command+Based+Programming+FRC+0+to+Autonomous',
				'software',
				2,
				3,
				'Implement one subsystem plus two commands and demonstrate scheduler behavior on robot sim.'
			),
			(
				'PID Control in FRC',
				'pid-control-frc',
				'Apply PID loops to stabilize robot mechanisms and drivetrain behavior.',
				'https://www.youtube.com/results?search_query=PID+Control+in+FRC+0+to+Autonomous',
				'software',
				3,
				4,
				'Tune PID gains for a test mechanism and record response before and after tuning.'
			),
			(
				'Understanding PID Control',
				'pid-control-matlab',
				'Understand PID dynamics deeply to improve tuning decisions.',
				'https://www.youtube.com/results?search_query=Understanding+PID+Control+MATLAB',
				'software',
				3,
				5,
				'Explain overshoot, settling time, and steady-state error using one of your robot logs.'
			),
			(
				'Limelight Vision Setup and Tuning',
				'limelight-vision',
				'Configure vision pipelines and verify targeting performance.',
				'https://www.youtube.com/results?search_query=Limelight+Vision+Setup+and+Tuning',
				'software',
				3,
				6,
				'Set up a Limelight pipeline and demonstrate stable target acquisition under two lighting conditions.'
			),
			(
				'Programming a Swerve Drive',
				'swerve-drive-programming',
				'Implement and validate modern swerve drive control software.',
				'https://www.youtube.com/results?search_query=Programming+a+Swerve+Drive+FRC+0+to+Autonomous',
				'software',
				3,
				7,
				'Drive a swerve test routine that demonstrates field-relative and robot-relative control.'
			),
			(
				'Effective FIRST Strategies by Karthik',
				'karthik-effective-first-strategies',
				'Learn strategic frameworks for alliance selection and match planning.',
				'https://www.youtube.com/results?search_query=Effective+FIRST+Strategies+by+Karthik',
				'strategy',
				1,
				1,
				'Create a one-match strategic plan including autonomous goals, cycle priorities, and fallback options.'
			),
			(
				'How to Use a Decision Matrix',
				'decision-matrix',
				'Score alternatives objectively using weighted criteria.',
				'https://www.youtube.com/results?search_query=How+to+Use+a+Decision+Matrix+MindToolsVideos',
				'strategy',
				1,
				2,
				'Build a weighted decision matrix for two strategic options and present the chosen path.'
			),
			(
				'Scouting App (1678 Fall Workshops)',
				'scouting-app-1678',
				'Design and run effective scouting systems for competition decisions.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Scouting+App',
				'strategy',
				2,
				3,
				'Define a scouting data schema with key fields and mock-collect data for one sample match.'
			),
			(
				'VLOOKUP and INDEX/MATCH in Excel',
				'excel-vlookup-indexmatch',
				'Connect and query scouting datasets with spreadsheet lookup tools.',
				'https://www.youtube.com/results?search_query=VLOOKUP+INDEX+MATCH+Excel+Tutorial+Kevin+Stratvert',
				'strategy',
				2,
				4,
				'Use lookup formulas to join two scouting tables and compute a derived performance metric.'
			),
			(
				'Pivot Tables in Excel',
				'excel-pivot-tables',
				'Summarize scouting data quickly for alliance and match decisions.',
				'https://www.youtube.com/results?search_query=Pivot+Tables+in+Excel+for+Beginners+Excel+Campus',
				'strategy',
				2,
				5,
				'Build a pivot table that ranks teams by at least two performance indicators.'
			),
			(
				'Understanding OPR, DPR, and CCWM',
				'opr-dpr-ccwm',
				'Interpret common FRC stats and use them with context.',
				'https://www.youtube.com/results?search_query=Understanding+OPR+DPR+and+CCWM+FRC',
				'strategy',
				2,
				6,
				'Compare two teams using OPR/DPR/CCWM and justify which metric matters for your strategy.'
			),
			(
				'Closed-Loop Communication Training',
				'closed-loop-communication',
				'Use explicit communication loops for safer, faster execution.',
				'https://www.youtube.com/results?search_query=Closed-Loop+Communication+Training',
				'strategy',
				1,
				7,
				'Run a short drill using closed-loop callouts and show confirmation discipline.'
			),
			(
				'How to Fly RC Airplanes: Reversed Controls',
				'rc-airplane-reversed-controls',
				'Train mental inversion skills useful for field-oriented driving.',
				'https://www.youtube.com/results?search_query=How+to+Fly+RC+Airplanes+Reversed+Controls',
				'strategy',
				2,
				8,
				'Complete a directional control drill while operating from the opposite field perspective.'
			),
			(
				'Drive Team Communication & Operations',
				'drive-team-comms-fun',
				'Coordinate roles and callouts for consistent match execution.',
				'https://www.youtube.com/results?search_query=Drive+Team+Communication+Operations+FUN',
				'strategy',
				3,
				9,
				'Run a mock match with driver, operator, and coach callout script and post-match debrief.'
			),
			(
				'Drive Coaching (1678 Fall Workshops)',
				'drive-coaching-1678',
				'Improve in-match adaptation and coaching decisions.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Drive+Coaching',
				'strategy',
				3,
				10,
				'Coach a scrimmage match and document one strategic adjustment made mid-match.'
			),
			(
				'Drive Coaching & Practice (1678)',
				'drive-coaching-practice-1678',
				'Structure driver development with deliberate practice loops.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Drive+Coaching+Practice',
				'strategy',
				3,
				11,
				'Create a two-week driver practice plan with measurable drill goals.'
			),
			(
				'FRC Driver Practice Drills',
				'driver-practice-drills',
				'Build consistent cycle performance through repeatable drills.',
				'https://www.youtube.com/results?search_query=FRC+Driver+Practice+Drills',
				'strategy',
				3,
				12,
				'Run three timed driving drills and log cycle-time improvement over five attempts.'
			),
			(
				'Business & Sponsorship (1678)',
				'business-sponsorship-1678',
				'Build sponsor strategy, relationship cadence, and outreach execution.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Business+Sponsorship',
				'business',
				1,
				1,
				'Draft a sponsor outreach plan with target list, cadence, and owner assignments.'
			),
			(
				'Cold Emailing for B2B Sales',
				'cold-emailing-b2b',
				'Write concise outreach that improves sponsor response rates.',
				'https://www.youtube.com/results?search_query=Cold+Emailing+for+B2B+Sales+Alex+Berman',
				'business',
				2,
				2,
				'Write and peer-review two sponsor outreach emails with different subject and CTA strategies.'
			),
			(
				'FRC Grant Writing Basics',
				'grant-writing-basics-fun',
				'Structure compelling grant applications for team funding.',
				'https://www.youtube.com/results?search_query=FRC+Grant+Writing+Basics+FUN',
				'business',
				2,
				3,
				'Complete a one-page grant draft including mission, impact, and budget narrative.'
			),
			(
				'Team Management: Finances and Budgeting',
				'finances-budgeting-fim',
				'Track team spending and forecast seasonal funding needs.',
				'https://www.youtube.com/results?search_query=Team+Management+Finances+and+Budgeting+FIRST+in+Michigan',
				'business',
				1,
				4,
				'Build a season budget sheet and identify one overrun risk with mitigation.'
			),
			(
				'FRC Team Branding',
				'team-branding-1538',
				'Create a consistent visual and messaging identity for the team.',
				'https://www.youtube.com/results?search_query=FRC+Team+Branding+The+Holy+Cows',
				'business',
				1,
				5,
				'Produce a mini brand guide with logo usage, color palette, and voice guidelines.'
			),
			(
				'Vector vs Raster Graphics Explained',
				'vector-vs-raster',
				'Choose the right asset format for print and digital media.',
				'https://www.youtube.com/results?search_query=Vector+vs+Raster+Graphics+Explained+Envato',
				'business',
				2,
				6,
				'Prepare one print and one web graphic in the correct format and explain why.'
			),
			(
				'How to Make a Robot Reveal Video',
				'robot-reveal-video',
				'Plan and produce compelling reveal content for outreach.',
				'https://www.youtube.com/results?search_query=How+to+Make+a+Robot+Reveal+Video+FUN',
				'business',
				3,
				7,
				'Storyboard a 60-second reveal video and record one polished sample segment.'
			),
			(
				'DaVinci Resolve for Beginners',
				'davinci-resolve-beginners',
				'Edit team video content efficiently in a professional tool.',
				'https://www.youtube.com/results?search_query=DaVinci+Resolve+for+Beginners+Casey+Faris',
				'business',
				3,
				8,
				'Edit a short promo clip with titles, cuts, and audio balancing.'
			),
			(
				'Media and Marketing (1678)',
				'media-marketing-1678',
				'Build campaigns that connect robot performance with team story.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Media+and+Marketing',
				'business',
				2,
				9,
				'Create a one-month content calendar for build season updates across two platforms.'
			),
			(
				'Super Pit Walkthroughs',
				'super-pit-walkthroughs',
				'Learn pit storytelling and event-facing brand presentation.',
				'https://www.youtube.com/results?search_query=Super+Pit+Walkthroughs+FUN',
				'business',
				2,
				10,
				'Present a three-minute pit tour that explains robot highlights and outreach impact.'
			),
			(
				'How to Write a Lesson Plan',
				'lesson-plan-howto',
				'Design repeatable training sessions for new members.',
				'https://www.youtube.com/results?search_query=How+to+Write+a+Lesson+Plan+Teachings+in+Education',
				'business',
				2,
				11,
				'Write a 30-minute lesson plan for one rookie training topic with objective and assessment.'
			),
			(
				'Chairman''s / Impact Award (1678)',
				'chairmans-impact-award-1678',
				'Understand high-quality Impact award strategy and storytelling.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Chairmans+Impact+Award',
				'business',
				2,
				12,
				'Draft a two-minute Impact pitch highlighting one measurable community outcome.'
			),
			(
				'Impact Award Presentation Examples',
				'impact-award-presentation-examples',
				'Analyze winning presentation structure and delivery style.',
				'https://www.youtube.com/results?search_query=FRC+Impact+Award+Presentation+Examples',
				'business',
				3,
				13,
				'Deliver a practice Impact segment and gather mentor scoring feedback.'
			),
			(
				'Media Training: Difficult Questions',
				'media-training-hard-questions',
				'Handle challenging interviews with composure and clarity.',
				'https://www.youtube.com/results?search_query=Media+Training+Handling+Difficult+Questions',
				'business',
				3,
				14,
				'Complete a mock interview with five difficult questions and evaluate response quality.'
			),
			(
				'Root Cause Analysis / 5 Whys',
				'root-cause-5-whys',
				'Find underlying causes instead of repeatedly treating symptoms.',
				'https://www.youtube.com/results?search_query=5+Whys+Root+Cause+Analysis',
				'operations',
				1,
				1,
				'Run a 5-Whys analysis on a recent failure and propose one corrective action.'
			),
			(
				'Robot Reliability (1678)',
				'robot-reliability-1678',
				'Increase match consistency with proactive reliability engineering.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Robot+Reliability',
				'operations',
				2,
				2,
				'Create a reliability checklist for one subsystem and run it during a practice cycle.'
			),
			(
				'Systematic Troubleshooting',
				'systematic-troubleshooting-eevblog',
				'Debug faults using repeatable, evidence-driven procedures.',
				'https://www.youtube.com/results?search_query=Systematic+Troubleshooting+EEVblog',
				'operations',
				2,
				3,
				'Diagnose a staged fault using a documented troubleshooting tree and report your findings.'
			),
			(
				'Lean Six Sigma 5S Basics',
				'lean-6sigma-5s',
				'Apply 5S methods to improve pit and shop readiness.',
				'https://www.youtube.com/results?search_query=Lean+Six+Sigma+5S+Basics',
				'operations',
				1,
				4,
				'Perform a 5S pass on one team area and document before/after improvements.'
			),
			(
				'FRC Pit Organization & Checklists',
				'pit-organization-checklists',
				'Create pit systems that reduce errors and turnaround time.',
				'https://www.youtube.com/results?search_query=FRC+Pit+Organization+Checklists',
				'operations',
				1,
				5,
				'Build a pit checklist for pre-match, post-match, and emergency repair flow.'
			),
			(
				'Team Culture & Student Leadership (1678)',
				'team-culture-leadership-1678',
				'Build team culture that supports accountability and growth.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Team+Culture+Student+Leadership',
				'operations',
				2,
				6,
				'Facilitate a retrospective discussion and capture two team culture action items.'
			),
			(
				'Notion Tutorial for Team Wikis',
				'notion-wikis',
				'Document team knowledge for fast onboarding and continuity.',
				'https://www.youtube.com/results?search_query=Notion+Tutorial+for+Team+Wikis',
				'operations',
				1,
				7,
				'Create a wiki page for one recurring team process with owner and update cadence.'
			),
			(
				'Prototyping (1678)',
				'prototyping-1678',
				'Use structured prototyping methods for better design outcomes.',
				'https://www.youtube.com/results?search_query=1678+Fall+Workshops+Prototyping',
				'operations',
				2,
				8,
				'Run one constrained-time prototype sprint and present findings with next decisions.'
			),
			(
				'Robot in 3 Days: Cranberry Alarm',
				'ri3d-cranberry-alarm',
				'Study complete engineering execution from kickoff to integrated robot.',
				'https://www.youtube.com/results?search_query=Ri3D+Cranberry+Alarm',
				'operations',
				3,
				9,
				'Write a short postmortem: three process choices from Ri3D you would adopt this season.'
			)
	) as v(title, slug, description, video_url, subteam_slug, tier, ordering, physical_task)
),
upserted_nodes as (
	insert into public.nodes (title, slug, description, video_url, subteam_id, tier, physical_task, ordering)
	select
		c.title,
		c.slug,
		c.description,
		c.video_url,
		s.id,
		c.tier,
		c.physical_task,
		c.ordering
	from curriculum c
	join public.subteams s on s.slug = c.subteam_slug
	on conflict (slug) do update set
		title = excluded.title,
		description = excluded.description,
		video_url = excluded.video_url,
		subteam_id = excluded.subteam_id,
		tier = excluded.tier,
		physical_task = excluded.physical_task,
		ordering = excluded.ordering
	returning id, slug, subteam_id, tier
),
target_nodes as (
	select n.id, n.slug, n.subteam_id, n.tier
	from public.nodes n
	join curriculum c on c.slug = n.slug
)
insert into public.assessments (node_id, passing_score, questions)
select
	tn.id,
	80,
	'[
		{
			"id":"q1",
			"prompt":"Which statement best reflects the core idea of this module?",
			"type":"short",
			"correct":"applies module concepts accurately"
		},
		{
			"id":"q2",
			"prompt":"Can you perform the required hands-on task for this module to mentor standards?",
			"type":"tf",
			"correct":"true"
		}
	]'::jsonb
from target_nodes tn
on conflict (node_id) do update set
	passing_score = excluded.passing_score,
	questions = excluded.questions;

with curriculum as (
	select slug, subteam_slug, tier
	from (
		values
			('project-management-1678','leadership',1),
			('gantt-chart-excel','leadership',1),
			('strategic-design-1678','leadership',2),
			('critical-path-method','leadership',2),
			('scrum-agile-frc','leadership',2),
			('agile-pm-tutorial','leadership',2),
			('prioritize-tasks','leadership',1),
			('meeting-minutes-how-to','leadership',1),
			('crucial-conversations','leadership',2),
			('think-fast-talk-smart','leadership',3),
			('robot-architecture-1678','leadership',3),
			('frc-budgeting-finances-fun','leadership',2),
			('good-frc-mentor','leadership',3),
			('socratic-method','leadership',3),
			('prototyping-design-process-1678','leadership',2),
			('fmea-explained','leadership',3),
			('ul-safety-captain-training','leadership',1),
			('shop-safety-fundamentals','mechanical',1),
			('cad2-top-down-design-1678','mechanical',2),
			('onshape-master-model','mechanical',2),
			('dogbone-fillets-cnc','mechanical',3),
			('recalc-intro-frc','mechanical',2),
			('dc-motor-curves','mechanical',1),
			('materials-fasteners-spectrum','mechanical',1),
			('digital-caliper','mechanical',1),
			('tap-drill-chart','mechanical',1),
			('speeds-feeds-cnc','mechanical',3),
			('fusion360-cam-beginners','mechanical',3),
			('fasteners-materials-fim','mechanical',1),
			('blind-rivets','mechanical',1),
			('threadlocker-loctite','mechanical',1),
			('clecos-howto','mechanical',1),
			('frc-electrical-best-practices-6328','electrical',1),
			('anderson-powerpoles','electrical',1),
			('wire-ferrules','electrical',1),
			('can-bus-best-practices','electrical',2),
			('cable-management-strain-relief','electrical',2),
			('frc-pneumatics-step-by-step','electrical',2),
			('battery-internal-resistance','electrical',2),
			('git-github-frc-0to-autonomous','software',1),
			('git-tutorial-mosh','software',1),
			('wpilib-command-based','software',2),
			('pid-control-frc','software',3),
			('pid-control-matlab','software',3),
			('limelight-vision','software',3),
			('swerve-drive-programming','software',3),
			('karthik-effective-first-strategies','strategy',1),
			('decision-matrix','strategy',1),
			('scouting-app-1678','strategy',2),
			('excel-vlookup-indexmatch','strategy',2),
			('excel-pivot-tables','strategy',2),
			('opr-dpr-ccwm','strategy',2),
			('closed-loop-communication','strategy',1),
			('rc-airplane-reversed-controls','strategy',2),
			('drive-team-comms-fun','strategy',3),
			('drive-coaching-1678','strategy',3),
			('drive-coaching-practice-1678','strategy',3),
			('driver-practice-drills','strategy',3),
			('business-sponsorship-1678','business',1),
			('cold-emailing-b2b','business',2),
			('grant-writing-basics-fun','business',2),
			('finances-budgeting-fim','business',1),
			('team-branding-1538','business',1),
			('vector-vs-raster','business',2),
			('robot-reveal-video','business',3),
			('davinci-resolve-beginners','business',3),
			('media-marketing-1678','business',2),
			('super-pit-walkthroughs','business',2),
			('lesson-plan-howto','business',2),
			('chairmans-impact-award-1678','business',2),
			('impact-award-presentation-examples','business',3),
			('media-training-hard-questions','business',3),
			('root-cause-5-whys','operations',1),
			('robot-reliability-1678','operations',2),
			('systematic-troubleshooting-eevblog','operations',2),
			('lean-6sigma-5s','operations',1),
			('pit-organization-checklists','operations',1),
			('team-culture-leadership-1678','operations',2),
			('notion-wikis','operations',1),
			('prototyping-1678','operations',2),
			('ri3d-cranberry-alarm','operations',3)
	) as v(slug, subteam_slug, tier)
),
target_nodes as (
	select n.id, n.slug, c.subteam_slug, c.tier
	from curriculum c
	join public.nodes n on n.slug = c.slug
),
deleted as (
	delete from public.node_prerequisites np
	using target_nodes t
	where np.node_id = t.id
	returning np.node_id
)
insert into public.node_prerequisites (node_id, prerequisite_node_id)
select t2.id, t1.id
from target_nodes t1
join target_nodes t2
	on t1.subteam_slug = t2.subteam_slug
	and t1.tier = 1
	and t2.tier = 2
union
select t3.id, t2.id
from target_nodes t2
join target_nodes t3
	on t2.subteam_slug = t3.subteam_slug
	and t2.tier = 2
	and t3.tier = 3
union
select t.id, safety.id
from target_nodes t
join public.nodes safety on safety.slug = 'shop-safety-fundamentals'
where t.subteam_slug in ('mechanical', 'electrical')
	and t.tier = 1
	and t.slug <> 'shop-safety-fundamentals'
on conflict do nothing;
