-- Volunteer Events (competitions, trips, build days) + Announcements + Email

-- 1. Volunteer Events — the organizing unit for volunteer needs
create table if not exists public.volunteer_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.lettering_seasons(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vol_events_season on public.volunteer_events(season_id, start_date);

-- 2. Link opportunities to events
alter table public.volunteer_opportunities
  add column if not exists event_id uuid references public.volunteer_events(id) on delete cascade;
create index if not exists idx_vol_opportunities_event on public.volunteer_opportunities(event_id);

-- 3. Add signup_payload for category-specific data (seats, food items, etc.)
alter table public.volunteer_signups
  add column if not exists signup_payload jsonb not null default '{}';

-- 4. Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.lettering_seasons(id) on delete cascade,
  title text not null,
  body text not null default '',
  audience text not null default 'all' check (audience in ('all', 'parents', 'students', 'mentors')),
  is_pinned boolean not null default false,
  emailed_at timestamptz,
  email_count int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_announcements_season on public.announcements(season_id, created_at desc);

-- RLS for new tables
alter table public.volunteer_events enable row level security;
alter table public.announcements enable row level security;

create policy "volunteer_events_read" on public.volunteer_events for select using (true);
create policy "volunteer_events_write" on public.volunteer_events for insert with check (public.is_mentor_or_admin());
create policy "volunteer_events_update" on public.volunteer_events for update using (public.is_mentor_or_admin());
create policy "volunteer_events_delete" on public.volunteer_events for delete using (public.is_mentor_or_admin());

create policy "announcements_read" on public.announcements for select using (true);
create policy "announcements_write" on public.announcements for insert with check (public.is_mentor_or_admin());
create policy "announcements_update" on public.announcements for update using (public.is_mentor_or_admin());
create policy "announcements_delete" on public.announcements for delete using (public.is_mentor_or_admin());
