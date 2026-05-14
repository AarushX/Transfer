-- Volunteer Management Module
-- Family-centric volunteer tracking with categories, pledges, opportunities, signups, and hour verification

-- 1. Families — first-class entity linking parents and students
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  season_id uuid references public.lettering_seasons(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Family members — link profiles to a family with a role
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'student')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);
create index if not exists idx_family_members_user on public.family_members(user_id);
create index if not exists idx_family_members_family on public.family_members(family_id);

-- 2. Volunteer categories — seed table
create table if not exists public.volunteer_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  unit text not null default 'hours' check (unit in ('hours', 'occasions', 'shifts', 'count', 'trips')),
  target_value numeric not null default 0,
  requires_prereq text default null,
  approval_required boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed the categories
insert into public.volunteer_categories (slug, name, description, unit, target_value, requires_prereq, approval_required, sort_order) values
  ('field_build_hours', 'Field / Build Hours', 'Hands-on hours in the shop or at the field supporting build activities.', 'hours', 12, null, false, 1),
  ('travel_planning', 'Travel Planning', 'Help coordinate hotel blocks, flights, and logistics for away competitions.', 'occasions', 3, null, false, 2),
  ('chaperone', 'Chaperone', 'Overnight trip chaperone at competitions or outreach events.', 'trips', 2, 'Prior overnight trip experience required', false, 3),
  ('transport_to_comp', 'Transport to Competition', 'Drive students or haul equipment to/from competitions.', 'trips', 2, null, false, 4),
  ('mentor', 'Mentor', 'Serve as a technical or non-technical mentor working directly with students.', 'hours', 20, null, true, 5),
  ('shop_supervision', 'Shop Supervision', 'Supervise students during open shop hours. Safety-certified adults only.', 'shifts', 6, 'Safety certification required', false, 6),
  ('outreach', 'Outreach / Community Events', 'Represent the team at demos, STEM nights, community events.', 'occasions', 3, null, false, 7),
  ('food', 'Food / Meals', 'Coordinate or provide meals during build season, competitions, or events.', 'occasions', 4, null, false, 8),
  ('sponsorship', 'Sponsorship / Fundraising', 'Help secure sponsors, organize fundraisers, or manage donor relations.', 'count', 3, null, false, 9),
  ('equipment_transport', 'Equipment Transport', 'Transport robot, tools, pit supplies to/from venues.', 'trips', 2, null, false, 10)
on conflict (slug) do nothing;

-- 3. Commitments — start-of-season family pledge per category
create table if not exists public.volunteer_commitments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category_id uuid not null references public.volunteer_categories(id) on delete cascade,
  season_id uuid not null references public.lettering_seasons(id) on delete cascade,
  response text not null default 'no' check (response in ('yes', 'no', 'maybe')),
  notes text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, category_id, season_id)
);
create index if not exists idx_vol_commitments_family_season on public.volunteer_commitments(family_id, season_id);

-- 4. Opportunities — specific volunteer instances posted by mentors/admins
create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.volunteer_categories(id) on delete cascade,
  season_id uuid not null references public.lettering_seasons(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  event_date date not null,
  start_time time default null,
  end_time time default null,
  slots int not null default 1 check (slots > 0),
  requires_approval boolean not null default false,
  signup_deadline timestamptz default null,
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vol_opportunities_season on public.volunteer_opportunities(season_id, event_date);
create index if not exists idx_vol_opportunities_category on public.volunteer_opportunities(category_id);

-- 5. Signups — family claims an opportunity
create table if not exists public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'verified', 'cancelled')),
  notes text not null default '',
  confirmed_at timestamptz default null,
  completed_at timestamptz default null,
  created_at timestamptz not null default now(),
  unique (family_id, opportunity_id)
);
create index if not exists idx_vol_signups_opportunity on public.volunteer_signups(opportunity_id);
create index if not exists idx_vol_signups_family on public.volunteer_signups(family_id);

-- 6. Hour logs — actual fulfillment (can be tied to opportunity or ad-hoc)
create table if not exists public.volunteer_hour_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category_id uuid not null references public.volunteer_categories(id) on delete cascade,
  opportunity_id uuid references public.volunteer_opportunities(id) on delete set null,
  season_id uuid not null references public.lettering_seasons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  activity_date date not null,
  description text not null default '',
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verifier_id uuid references public.profiles(id) on delete set null,
  verified_at timestamptz default null,
  rejection_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vol_hour_logs_family_season on public.volunteer_hour_logs(family_id, season_id);
create index if not exists idx_vol_hour_logs_status on public.volunteer_hour_logs(verification_status) where verification_status = 'pending';

-- 7. Family progress view — computed pledged vs signed-up vs completed per category
create or replace view public.family_progress as
select
  f.id as family_id,
  f.name as family_name,
  vc.id as category_id,
  vc.slug as category_slug,
  vc.name as category_name,
  vc.unit,
  vc.target_value,
  coalesce(com.response, 'no') as pledge_response,
  com.season_id,
  coalesce(signup_counts.signup_count, 0) as signups_count,
  coalesce(completed_counts.completed_amount, 0) as completed_amount,
  coalesce(verified_counts.verified_amount, 0) as verified_amount,
  case
    when vc.target_value > 0 and coalesce(verified_counts.verified_amount, 0) >= vc.target_value then true
    else false
  end as target_met
from public.families f
cross join public.volunteer_categories vc
left join public.volunteer_commitments com
  on com.family_id = f.id and com.category_id = vc.id
left join lateral (
  select count(*) as signup_count
  from public.volunteer_signups vs
  join public.volunteer_opportunities vo on vo.id = vs.opportunity_id
  where vs.family_id = f.id and vo.category_id = vc.id
    and vs.status not in ('cancelled')
    and (com.season_id is null or vo.season_id = com.season_id)
) signup_counts on true
left join lateral (
  select coalesce(sum(amount), 0) as completed_amount
  from public.volunteer_hour_logs vhl
  where vhl.family_id = f.id and vhl.category_id = vc.id
    and vhl.verification_status in ('pending', 'verified')
    and (com.season_id is null or vhl.season_id = com.season_id)
) completed_counts on true
left join lateral (
  select coalesce(sum(amount), 0) as verified_amount
  from public.volunteer_hour_logs vhl
  where vhl.family_id = f.id and vhl.category_id = vc.id
    and vhl.verification_status = 'verified'
    and (com.season_id is null or vhl.season_id = com.season_id)
) verified_counts on true
where vc.is_active = true;

-- RLS policies
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.volunteer_categories enable row level security;
alter table public.volunteer_commitments enable row level security;
alter table public.volunteer_opportunities enable row level security;
alter table public.volunteer_signups enable row level security;
alter table public.volunteer_hour_logs enable row level security;

-- Categories: everyone can read
create policy "volunteer_categories_read" on public.volunteer_categories for select using (true);

-- Families: members can read their own, admin/mentor can read all
create policy "families_read_own" on public.families for select using (
  exists (select 1 from public.family_members fm where fm.family_id = id and fm.user_id = auth.uid())
  or public.is_mentor_or_admin()
);
create policy "families_insert" on public.families for insert with check (public.is_mentor_or_admin());
create policy "families_update" on public.families for update using (public.is_mentor_or_admin());

-- Family members: own family or admin/mentor
create policy "family_members_read" on public.family_members for select using (
  user_id = auth.uid()
  or exists (select 1 from public.family_members fm2 where fm2.family_id = family_id and fm2.user_id = auth.uid())
  or public.is_mentor_or_admin()
);
create policy "family_members_manage" on public.family_members for all using (public.is_mentor_or_admin());

-- Commitments: own family can read/write, admin/mentor can read all
create policy "commitments_read" on public.volunteer_commitments for select using (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
  or public.is_mentor_or_admin()
);
create policy "commitments_write" on public.volunteer_commitments for insert with check (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
);
create policy "commitments_update" on public.volunteer_commitments for update using (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
);

-- Opportunities: everyone can read, admin/mentor can write
create policy "opportunities_read" on public.volunteer_opportunities for select using (true);
create policy "opportunities_write" on public.volunteer_opportunities for insert with check (public.is_mentor_or_admin());
create policy "opportunities_update" on public.volunteer_opportunities for update using (public.is_mentor_or_admin());
create policy "opportunities_delete" on public.volunteer_opportunities for delete using (public.is_mentor_or_admin());

-- Signups: own family can read/write, admin/mentor can read all
create policy "signups_read" on public.volunteer_signups for select using (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
  or public.is_mentor_or_admin()
);
create policy "signups_write" on public.volunteer_signups for insert with check (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
);
create policy "signups_update" on public.volunteer_signups for update using (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
  or public.is_mentor_or_admin()
);

-- Hour logs: own family can insert, admin/mentor can read/verify
create policy "hour_logs_read" on public.volunteer_hour_logs for select using (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
  or public.is_mentor_or_admin()
);
create policy "hour_logs_insert" on public.volunteer_hour_logs for insert with check (
  exists (select 1 from public.family_members fm where fm.family_id = family_id and fm.user_id = auth.uid())
);
create policy "hour_logs_update" on public.volunteer_hour_logs for update using (public.is_mentor_or_admin());

-- Auto-create family when parent-student link is created
create or replace function public.auto_create_family()
returns trigger as $$
declare
  v_family_id uuid;
  v_season_id uuid;
  v_parent_name text;
begin
  -- Find active season
  select id into v_season_id from public.lettering_seasons where is_active = true limit 1;

  -- Check if parent already has a family for this season
  select fm.family_id into v_family_id
  from public.family_members fm
  join public.families fam on fam.id = fm.family_id
  where fm.user_id = NEW.parent_user_id
    and fm.role = 'parent'
    and (fam.season_id = v_season_id or fam.season_id is null)
  limit 1;

  if v_family_id is null then
    -- Get parent name for family name
    select coalesce(full_name, email, 'Family') into v_parent_name
    from public.profiles where id = NEW.parent_user_id;

    insert into public.families (name, season_id)
    values (v_parent_name || ' Family', v_season_id)
    returning id into v_family_id;

    -- Add parent as family member
    insert into public.family_members (family_id, user_id, role)
    values (v_family_id, NEW.parent_user_id, 'parent')
    on conflict (family_id, user_id) do nothing;
  end if;

  -- Add student as family member
  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, NEW.student_user_id, 'student')
  on conflict (family_id, user_id) do nothing;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: auto-create family on parent_student_links insert
drop trigger if exists trg_auto_create_family on public.parent_student_links;
create trigger trg_auto_create_family
  after insert on public.parent_student_links
  for each row
  when (NEW.status = 'active')
  execute function public.auto_create_family();

-- Backfill: create families for existing parent-student links
do $$
declare
  r record;
  v_family_id uuid;
  v_season_id uuid;
  v_parent_name text;
begin
  select id into v_season_id from public.lettering_seasons where is_active = true limit 1;

  for r in
    select distinct parent_user_id from public.parent_student_links where status = 'active'
  loop
    -- Check if family already exists
    select fm.family_id into v_family_id
    from public.family_members fm
    join public.families fam on fam.id = fm.family_id
    where fm.user_id = r.parent_user_id and fm.role = 'parent'
    limit 1;

    if v_family_id is null then
      select coalesce(full_name, email, 'Family') into v_parent_name
      from public.profiles where id = r.parent_user_id;

      insert into public.families (name, season_id)
      values (v_parent_name || ' Family', v_season_id)
      returning id into v_family_id;

      insert into public.family_members (family_id, user_id, role)
      values (v_family_id, r.parent_user_id, 'parent')
      on conflict do nothing;
    end if;

    -- Add all linked students
    insert into public.family_members (family_id, user_id, role)
    select v_family_id, psl.student_user_id, 'student'
    from public.parent_student_links psl
    where psl.parent_user_id = r.parent_user_id and psl.status = 'active'
    on conflict do nothing;
  end loop;
end $$;
