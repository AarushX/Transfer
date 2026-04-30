alter table public.parent_applications
	add column if not exists application_payload jsonb not null default '{}'::jsonb,
	add column if not exists submitted_at timestamptz,
	add column if not exists reviewed_at timestamptz,
	add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
