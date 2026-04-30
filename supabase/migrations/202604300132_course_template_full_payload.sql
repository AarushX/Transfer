alter table public.course_templates
	add column if not exists prereq_ids jsonb not null default '[]'::jsonb,
	add column if not exists blocks_json jsonb not null default '[]'::jsonb;
