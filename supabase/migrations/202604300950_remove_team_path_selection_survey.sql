-- Remove legacy survey-based team assignment flow.
-- Team assignment now happens only through /onboarding.

delete from public.surveys
where slug = 'team-path-selection';
