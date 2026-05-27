-- Subteam pinboard: a grid of admin-/lead-curated resource cards on the
-- subteam page. Replaces the old free-form team notes + activity timeline,
-- which never quite earned their space and are dropped in the next migration.
--
-- A card is a labeled link to anything useful (a CAD file, a strategy doc,
-- a tracker), with optional image and description.

create table if not exists public.subteam_resources (
	id uuid primary key default gen_random_uuid(),
	team_id uuid not null references public.teams (id) on delete cascade,
	title text not null,
	url text not null,
	description text not null default '',
	image_url text,
	position int not null default 100,
	created_by uuid references public.profiles (id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_subteam_resources_team on public.subteam_resources (team_id, position);

alter table public.subteam_resources enable row level security;

drop policy if exists "subteam_resources_read" on public.subteam_resources;
create policy "subteam_resources_read" on public.subteam_resources
	for select using (auth.role() = 'authenticated');

-- Leads of this team_group, leads of this specific team, and admins can
-- manage cards. The lead_team_group_id / lead_subteam_id lookups come from
-- the profiles row; falling back to admin keeps the door open if those
-- columns aren't yet populated.
drop policy if exists "subteam_resources_lead_write" on public.subteam_resources;
create policy "subteam_resources_lead_write" on public.subteam_resources
	for all using (
		public.is_admin()
		or exists (
			select 1
			from public.profiles p
			join public.teams t on t.id = subteam_resources.team_id
			where p.id = auth.uid()
				and (
					p.lead_team_group_id = t.team_group_id
					or p.lead_subteam_id = t.id
				)
		)
	) with check (
		public.is_admin()
		or exists (
			select 1
			from public.profiles p
			join public.teams t on t.id = subteam_resources.team_id
			where p.id = auth.uid()
				and (
					p.lead_team_group_id = t.team_group_id
					or p.lead_subteam_id = t.id
				)
		)
	);
