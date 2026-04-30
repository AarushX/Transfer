-- Add admin-controlled designators and colors for team hierarchy.

alter table public.team_groups
	add column if not exists designator text not null default 'general'
		check (designator in ('general', 'program', 'technical', 'business'));

alter table public.team_groups
	add column if not exists color_hex text not null default '#475569';

alter table public.teams
	add column if not exists color_hex text not null default '#334155';
