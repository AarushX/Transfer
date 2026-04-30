-- Admin-configurable onboarding team category requirements.

alter table public.org_settings
    add column if not exists onboarding_required_designators jsonb not null default '["technical","business"]'::jsonb;

update public.org_settings
set onboarding_required_designators = coalesce(onboarding_required_designators, '["technical","business"]'::jsonb)
where id = 1;
