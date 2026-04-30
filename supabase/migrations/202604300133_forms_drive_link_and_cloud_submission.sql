alter table public.form_types
	add column if not exists template_drive_link text not null default '';

alter table public.form_submissions
	add column if not exists cloud_link text not null default '';
