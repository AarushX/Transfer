-- Destructive cleanup: remove legacy non-block course content paths.
-- Courses must now be defined through node_blocks only.

update public.nodes
set video_url = ''
where coalesce(trim(video_url), '') <> '';

update public.assessments
set questions = '[]'::jsonb
where jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) > 0;

update public.node_checkoff_requirements
set directions = '',
	mentor_checklist = '[]'::jsonb,
	resource_links = '[]'::jsonb,
	evidence_mode = 'none'
where coalesce(trim(directions), '') <> ''
	or jsonb_array_length(coalesce(mentor_checklist, '[]'::jsonb)) > 0
	or jsonb_array_length(coalesce(resource_links, '[]'::jsonb)) > 0
	or evidence_mode in ('photo_optional', 'photo_required');
