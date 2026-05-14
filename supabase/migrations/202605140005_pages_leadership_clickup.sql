-- Lead-managed pages system, ClickUp signup tracking, leadership assignments, drop manual hours

-- 1. Drop manual volunteer hours (full schema removal)
drop table if exists public.volunteer_hour_logs cascade;
drop table if exists public.parent_volunteer_hours cascade;

-- 2. Profile additions
alter table public.profiles
	add column if not exists clickup_signed_up boolean not null default false,
	add column if not exists lead_team_group_id uuid references public.team_groups(id) on delete set null,
	add column if not exists lead_subteam_id uuid references public.subteams(id) on delete set null;

-- 3. Pages — owned by team_group (team lead), subteam (subteam lead), or admin (dashboard)
create table if not exists public.pages (
	id uuid primary key default gen_random_uuid(),
	scope_kind text not null check (scope_kind in ('team_group', 'subteam', 'dashboard')),
	scope_id uuid,
	title text not null,
	slug text not null,
	kind text not null default 'content' check (kind in ('content', 'redirect', 'application')),
	redirect_url text,
	application_survey_id uuid references public.surveys(id) on delete set null,
	sort_order int not null default 0,
	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (scope_kind, scope_id, slug)
);
create index if not exists idx_pages_scope on public.pages(scope_kind, scope_id, sort_order);

-- 4. Page blocks — ordered content blocks within a page
create table if not exists public.page_blocks (
	id uuid primary key default gen_random_uuid(),
	page_id uuid not null references public.pages(id) on delete cascade,
	kind text not null check (kind in ('heading', 'text', 'link', 'image', 'embed', 'divider')),
	payload jsonb not null default '{}',
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists idx_page_blocks_page on public.page_blocks(page_id, sort_order);

-- RLS
alter table public.pages enable row level security;
alter table public.page_blocks enable row level security;

create policy "pages_read_all_authenticated" on public.pages for select using (auth.role() = 'authenticated');

-- Page write: admin, or team lead for their team_group, or subteam lead for their subteam
create policy "pages_admin_all" on public.pages for all using (public.is_admin()) with check (public.is_admin());

create policy "pages_team_lead_write" on public.pages for insert with check (
	scope_kind = 'team_group'
	and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_team_group_id = scope_id)
);
create policy "pages_team_lead_update" on public.pages for update using (
	scope_kind = 'team_group'
	and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_team_group_id = scope_id)
);
create policy "pages_team_lead_delete" on public.pages for delete using (
	scope_kind = 'team_group'
	and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_team_group_id = scope_id)
);

create policy "pages_subteam_lead_write" on public.pages for insert with check (
	scope_kind = 'subteam'
	and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_subteam_id = scope_id)
);
create policy "pages_subteam_lead_update" on public.pages for update using (
	scope_kind = 'subteam'
	and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_subteam_id = scope_id)
);
create policy "pages_subteam_lead_delete" on public.pages for delete using (
	scope_kind = 'subteam'
	and exists (select 1 from public.profiles p where p.id = auth.uid() and p.lead_subteam_id = scope_id)
);

create policy "page_blocks_read" on public.page_blocks for select using (auth.role() = 'authenticated');
create policy "page_blocks_admin_all" on public.page_blocks for all using (public.is_admin()) with check (public.is_admin());

create policy "page_blocks_lead_write" on public.page_blocks for insert with check (
	exists (
		select 1 from public.pages pg
		join public.profiles pr on pr.id = auth.uid()
		where pg.id = page_id
		and (
			(pg.scope_kind = 'team_group' and pr.lead_team_group_id = pg.scope_id)
			or (pg.scope_kind = 'subteam' and pr.lead_subteam_id = pg.scope_id)
		)
	)
);
create policy "page_blocks_lead_update" on public.page_blocks for update using (
	exists (
		select 1 from public.pages pg
		join public.profiles pr on pr.id = auth.uid()
		where pg.id = page_id
		and (
			(pg.scope_kind = 'team_group' and pr.lead_team_group_id = pg.scope_id)
			or (pg.scope_kind = 'subteam' and pr.lead_subteam_id = pg.scope_id)
		)
	)
);
create policy "page_blocks_lead_delete" on public.page_blocks for delete using (
	exists (
		select 1 from public.pages pg
		join public.profiles pr on pr.id = auth.uid()
		where pg.id = page_id
		and (
			(pg.scope_kind = 'team_group' and pr.lead_team_group_id = pg.scope_id)
			or (pg.scope_kind = 'subteam' and pr.lead_subteam_id = pg.scope_id)
		)
	)
);
