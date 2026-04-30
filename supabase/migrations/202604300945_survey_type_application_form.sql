alter table public.surveys
add column if not exists survey_type text not null default 'application'
check (survey_type in ('application', 'form'));

