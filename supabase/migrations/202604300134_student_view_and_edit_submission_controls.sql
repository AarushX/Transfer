alter table public.surveys
	add column if not exists allow_student_view_submissions boolean not null default true,
	add column if not exists allow_student_edits boolean not null default false,
	add column if not exists student_edit_deadline timestamptz;

alter table public.form_types
	add column if not exists allow_student_view_submissions boolean not null default true,
	add column if not exists allow_student_edits boolean not null default false,
	add column if not exists student_edit_deadline timestamptz;
