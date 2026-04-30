-- Dynamic categories for subteams and onboarding requirements.

create table if not exists public.subteam_categories (
    slug text primary key,
    name text not null,
    sort_order int not null default 0,
    is_required_onboarding boolean not null default false,
    created_at timestamptz not null default now()
);

insert into public.subteam_categories (slug, name, sort_order, is_required_onboarding)
values
    ('technical', 'Technical', 10, true),
    ('business', 'Business', 20, true),
    ('program', 'Program', 30, false),
    ('general', 'General', 40, false)
on conflict (slug) do nothing;

alter table public.teams
    add column if not exists category_slug text references public.subteam_categories (slug) on delete set null;

update public.teams t
set category_slug = coalesce(g.designator, 'general')
from public.team_groups g
where g.id = t.team_group_id
  and t.category_slug is null;

alter table public.subteam_categories enable row level security;

drop policy if exists "subteam_categories_read" on public.subteam_categories;
create policy "subteam_categories_read" on public.subteam_categories
    for select using (auth.role() = 'authenticated');

drop policy if exists "subteam_categories_mentor_write" on public.subteam_categories;
create policy "subteam_categories_mentor_write" on public.subteam_categories
    for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());
