create table if not exists public.training_categories (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	slug text not null unique,
	parent_id uuid references public.training_categories (id) on delete cascade,
	kind text not null default 'group',
	color_token text not null default 'slate',
	sort_order int not null default 0,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (kind in ('group', 'program', 'subteam', 'topic'))
);

create table if not exists public.node_categories (
	node_id uuid not null references public.nodes (id) on delete cascade,
	category_id uuid not null references public.training_categories (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (node_id, category_id)
);

create table if not exists public.rank_tiers (
	slug text primary key,
	name text not null,
	min_points int not null check (min_points >= 0),
	medal_label text not null,
	medal_icon text not null default 'medal',
	color_token text not null default 'slate',
	sort_order int not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.member_rank_state (
	user_id uuid primary key references public.profiles (id) on delete cascade,
	points_total int not null default 0,
	attendance_points int not null default 0,
	course_points int not null default 0,
	rank_slug text references public.rank_tiers (slug) on delete set null,
	updated_at timestamptz not null default now()
);

create index if not exists idx_training_categories_parent_sort
	on public.training_categories (parent_id, sort_order);

create index if not exists idx_node_categories_category
	on public.node_categories (category_id, node_id);

alter table public.training_categories enable row level security;
alter table public.node_categories enable row level security;
alter table public.rank_tiers enable row level security;
alter table public.member_rank_state enable row level security;

drop policy if exists "training_categories_read" on public.training_categories;
create policy "training_categories_read" on public.training_categories
	for select using (auth.role() = 'authenticated');

drop policy if exists "training_categories_mentor_write" on public.training_categories;
create policy "training_categories_mentor_write" on public.training_categories
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "node_categories_read" on public.node_categories;
create policy "node_categories_read" on public.node_categories
	for select using (auth.role() = 'authenticated');

drop policy if exists "node_categories_mentor_write" on public.node_categories;
create policy "node_categories_mentor_write" on public.node_categories
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "rank_tiers_read" on public.rank_tiers;
create policy "rank_tiers_read" on public.rank_tiers
	for select using (auth.role() = 'authenticated');

drop policy if exists "rank_tiers_mentor_write" on public.rank_tiers;
create policy "rank_tiers_mentor_write" on public.rank_tiers
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

drop policy if exists "member_rank_state_read_own_or_mentor" on public.member_rank_state;
create policy "member_rank_state_read_own_or_mentor" on public.member_rank_state
	for select using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "member_rank_state_write_mentor" on public.member_rank_state;
create policy "member_rank_state_write_mentor" on public.member_rank_state
	for all using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
values
	('Technical', 'technical', null, 'group', 'sky', 10),
	('Business', 'business', null, 'group', 'amber', 20)
on conflict (slug) do update set
	name = excluded.name,
	parent_id = excluded.parent_id,
	kind = excluded.kind,
	color_token = excluded.color_token,
	sort_order = excluded.sort_order,
	is_active = true,
	updated_at = now();

insert into public.training_categories (name, slug, parent_id, kind, color_token, sort_order)
select
	child.name,
	child.slug,
	parent.id,
	child.kind,
	child.color_token,
	child.sort_order
from (
	values
		('FRC', 'frc', 'technical', 'program', 'blue', 10),
		('FTC', 'ftc', 'technical', 'program', 'indigo', 20),
		('Leadership', 'leadership-track', 'business', 'subteam', 'violet', 10),
		('Business Core', 'business-core', 'business', 'subteam', 'amber', 20),
		('Mechanical', 'frc-mechanical', 'frc', 'subteam', 'cyan', 10),
		('Electrical', 'frc-electrical', 'frc', 'subteam', 'emerald', 20),
		('Software', 'frc-software', 'frc', 'subteam', 'fuchsia', 30),
		('Strategy', 'frc-strategy', 'frc', 'subteam', 'purple', 40),
		('Operations', 'frc-operations', 'frc', 'subteam', 'rose', 50)
) as child(name, slug, parent_slug, kind, color_token, sort_order)
join public.training_categories parent on parent.slug = child.parent_slug
on conflict (slug) do update set
	name = excluded.name,
	parent_id = excluded.parent_id,
	kind = excluded.kind,
	color_token = excluded.color_token,
	sort_order = excluded.sort_order,
	is_active = true,
	updated_at = now();

insert into public.rank_tiers (slug, name, min_points, medal_label, medal_icon, color_token, sort_order)
values
	('rookie', 'Rookie', 0, 'Bronze Medal', 'bronze', 'amber', 10),
	('builder', 'Builder', 60, 'Silver Medal', 'silver', 'slate', 20),
	('specialist', 'Specialist', 140, 'Gold Medal', 'gold', 'yellow', 30),
	('master', 'Master', 240, 'Platinum Medal', 'platinum', 'cyan', 40),
	('legend', 'Legend', 380, 'Champion Medal', 'champion', 'violet', 50)
on conflict (slug) do update set
	name = excluded.name,
	min_points = excluded.min_points,
	medal_label = excluded.medal_label,
	medal_icon = excluded.medal_icon,
	color_token = excluded.color_token,
	sort_order = excluded.sort_order,
	updated_at = now();

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.subteams s on s.id = n.subteam_id
join public.training_categories c
	on c.slug = case
		when s.slug = 'mechanical' then 'frc-mechanical'
		when s.slug = 'electrical' then 'frc-electrical'
		when s.slug = 'software' then 'frc-software'
		when s.slug = 'strategy' then 'frc-strategy'
		when s.slug = 'operations' then 'frc-operations'
		when s.slug = 'business' then 'business-core'
		when s.slug = 'leadership' then 'leadership-track'
		else null
	end
where c.id is not null
on conflict do nothing;

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.subteams s on s.id = n.subteam_id
join public.training_categories c
	on c.slug = case
		when s.slug in ('mechanical', 'electrical', 'software', 'strategy', 'operations') then 'frc'
		when s.slug in ('business', 'leadership') then 'business'
		else null
	end
where c.id is not null
on conflict do nothing;

with subteam_ids as (
	select id, slug from public.subteams
),
new_courses as (
	select *
	from (
		values
			(
				'FTC Match Strategy Foundations',
				'ftc-match-strategy-foundations',
				'Build practical FTC match strategy skills, role planning, and alliance decision making.',
				'https://www.youtube.com/results?search_query=FTC+match+strategy+tutorial',
				'strategy',
				990
			),
			(
				'Sponsor Relationship Management Basics',
				'sponsor-relationship-management-basics',
				'Learn sponsor communication cadence, updates, and retention techniques for team sustainability.',
				'https://www.youtube.com/results?search_query=nonprofit+sponsor+relationship+management',
				'business',
				991
			)
	) as v(title, slug, description, video_url, subteam_slug, ordering)
)
insert into public.nodes (title, slug, description, video_url, subteam_id, ordering)
select
	nc.title,
	nc.slug,
	nc.description,
	nc.video_url,
	s.id,
	nc.ordering
from new_courses nc
join subteam_ids s on s.slug = nc.subteam_slug
on conflict (slug) do update set
	title = excluded.title,
	description = excluded.description,
	video_url = excluded.video_url,
	subteam_id = excluded.subteam_id,
	ordering = excluded.ordering;

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug in ('frc-strategy', 'frc')
where n.slug = 'ftc-match-strategy-foundations'
on conflict do nothing;

insert into public.node_categories (node_id, category_id)
select n.id, c.id
from public.nodes n
join public.training_categories c on c.slug in ('business-core', 'business')
where n.slug = 'sponsor-relationship-management-basics'
on conflict do nothing;
