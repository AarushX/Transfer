-- Lettering requirements system: seasons, outreach events, competition attendance,
-- parent volunteer hours, and admin-configurable lettering thresholds.

-- 1. Seasons ----------------------------------------------------------------

create table if not exists public.lettering_seasons (
    id          uuid primary key default gen_random_uuid(),
    label       text not null,
    start_date  date not null,
    end_date    date not null,
    is_active   boolean not null default false,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint  lettering_seasons_date_order check (end_date > start_date)
);

create unique index idx_lettering_seasons_one_active
    on public.lettering_seasons (is_active)
    where (is_active = true);

alter table public.lettering_seasons enable row level security;

create policy "lettering_seasons_select"
    on public.lettering_seasons for select
    to authenticated
    using (true);

create policy "lettering_seasons_admin_insert"
    on public.lettering_seasons for insert
    to authenticated
    with check (public.is_admin());

create policy "lettering_seasons_admin_update"
    on public.lettering_seasons for update
    to authenticated
    using (public.is_admin());

create policy "lettering_seasons_admin_delete"
    on public.lettering_seasons for delete
    to authenticated
    using (public.is_admin());

-- 2. Requirements (admin-configurable thresholds) ----------------------------

create table if not exists public.lettering_requirements (
    id              uuid primary key default gen_random_uuid(),
    season_id       uuid not null references public.lettering_seasons (id) on delete cascade,
    category        text not null,
    label           text not null,
    required_value  numeric not null check (required_value > 0),
    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (season_id, category)
);

create index idx_lettering_requirements_season
    on public.lettering_requirements (season_id, sort_order);

alter table public.lettering_requirements enable row level security;

create policy "lettering_requirements_select"
    on public.lettering_requirements for select
    to authenticated
    using (true);

create policy "lettering_requirements_admin_insert"
    on public.lettering_requirements for insert
    to authenticated
    with check (public.is_admin());

create policy "lettering_requirements_admin_update"
    on public.lettering_requirements for update
    to authenticated
    using (public.is_admin());

create policy "lettering_requirements_admin_delete"
    on public.lettering_requirements for delete
    to authenticated
    using (public.is_admin());

-- 3. Outreach events ---------------------------------------------------------

create table if not exists public.outreach_events (
    id               uuid primary key default gen_random_uuid(),
    season_id        uuid not null references public.lettering_seasons (id) on delete cascade,
    title            text not null,
    description      text not null default '',
    location         text not null default '',
    event_date       date not null,
    start_time       time,
    end_time         time,
    max_signups      int,
    signup_deadline   timestamptz,
    created_by       uuid references public.profiles (id) on delete set null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    constraint outreach_events_time_order check (end_time is null or start_time is null or end_time > start_time)
);

create index idx_outreach_events_season_date
    on public.outreach_events (season_id, event_date desc);

create index idx_outreach_events_created_by
    on public.outreach_events (created_by);

alter table public.outreach_events enable row level security;

create policy "outreach_events_select"
    on public.outreach_events for select
    to authenticated
    using (true);

create policy "outreach_events_mentor_insert"
    on public.outreach_events for insert
    to authenticated
    with check (public.is_mentor_or_admin());

create policy "outreach_events_mentor_update"
    on public.outreach_events for update
    to authenticated
    using (public.is_mentor_or_admin());

create policy "outreach_events_mentor_delete"
    on public.outreach_events for delete
    to authenticated
    using (public.is_mentor_or_admin());

-- 4. Outreach event sign-ups -------------------------------------------------

create table if not exists public.outreach_event_signups (
    id          uuid primary key default gen_random_uuid(),
    event_id    uuid not null references public.outreach_events (id) on delete cascade,
    user_id     uuid not null references public.profiles (id) on delete cascade,
    created_at  timestamptz not null default now(),
    unique (event_id, user_id)
);

create index idx_outreach_event_signups_user
    on public.outreach_event_signups (user_id);

create index idx_outreach_event_signups_event
    on public.outreach_event_signups (event_id);

alter table public.outreach_event_signups enable row level security;

create policy "outreach_event_signups_select"
    on public.outreach_event_signups for select
    to authenticated
    using (user_id = auth.uid() or public.is_mentor_or_admin());

create policy "outreach_event_signups_self_insert"
    on public.outreach_event_signups for insert
    to authenticated
    with check (user_id = auth.uid());

create policy "outreach_event_signups_self_delete"
    on public.outreach_event_signups for delete
    to authenticated
    using (user_id = auth.uid() or public.is_mentor_or_admin());

-- 5. Outreach hours (with verification) --------------------------------------

create table if not exists public.outreach_hours (
    id                    uuid primary key default gen_random_uuid(),
    user_id               uuid not null references public.profiles (id) on delete cascade,
    event_id              uuid references public.outreach_events (id) on delete set null,
    season_id             uuid not null references public.lettering_seasons (id) on delete cascade,
    hours                 numeric not null check (hours > 0),
    description           text not null default '',
    verification_status   text not null default 'pending',
    verified_by           uuid references public.profiles (id) on delete set null,
    verified_at           timestamptz,
    rejection_reason      text not null default '',
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    constraint outreach_hours_status_check check (verification_status in ('pending', 'verified', 'rejected'))
);

create index idx_outreach_hours_user_season
    on public.outreach_hours (user_id, season_id);

create index idx_outreach_hours_event
    on public.outreach_hours (event_id);

create index idx_outreach_hours_pending
    on public.outreach_hours (verification_status)
    where verification_status = 'pending';

alter table public.outreach_hours enable row level security;

create policy "outreach_hours_select"
    on public.outreach_hours for select
    to authenticated
    using (user_id = auth.uid() or public.is_mentor_or_admin());

create policy "outreach_hours_self_insert"
    on public.outreach_hours for insert
    to authenticated
    with check (user_id = auth.uid());

create policy "outreach_hours_mentor_update"
    on public.outreach_hours for update
    to authenticated
    using (public.is_mentor_or_admin());

-- 6. Competition events ------------------------------------------------------

create table if not exists public.competition_events (
    id          uuid primary key default gen_random_uuid(),
    season_id   uuid not null references public.lettering_seasons (id) on delete cascade,
    name        text not null,
    location    text not null default '',
    start_date  date not null,
    end_date    date not null,
    comp_type   text not null default 'regional',
    created_by  uuid references public.profiles (id) on delete set null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint competition_events_date_order check (end_date >= start_date)
);

create index idx_competition_events_season
    on public.competition_events (season_id, start_date);

alter table public.competition_events enable row level security;

create policy "competition_events_select"
    on public.competition_events for select
    to authenticated
    using (true);

create policy "competition_events_admin_insert"
    on public.competition_events for insert
    to authenticated
    with check (public.is_admin());

create policy "competition_events_admin_update"
    on public.competition_events for update
    to authenticated
    using (public.is_admin());

create policy "competition_events_admin_delete"
    on public.competition_events for delete
    to authenticated
    using (public.is_admin());

-- 7. Competition attendance (sign-in/sign-out with authorized verifier) ------

create table if not exists public.competition_attendance (
    id               uuid primary key default gen_random_uuid(),
    competition_id   uuid not null references public.competition_events (id) on delete cascade,
    user_id          uuid not null references public.profiles (id) on delete cascade,
    attendance_date  date not null,
    check_in_at      timestamptz,
    check_out_at     timestamptz,
    checked_in_by    uuid references public.profiles (id) on delete set null,
    checked_out_by   uuid references public.profiles (id) on delete set null,
    notes            text not null default '',
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique (competition_id, user_id, attendance_date)
);

create index idx_competition_attendance_user
    on public.competition_attendance (user_id, attendance_date desc);

create index idx_competition_attendance_comp
    on public.competition_attendance (competition_id, attendance_date);

alter table public.competition_attendance enable row level security;

create policy "competition_attendance_select"
    on public.competition_attendance for select
    to authenticated
    using (user_id = auth.uid() or public.is_mentor_or_admin());

create policy "competition_attendance_mentor_insert"
    on public.competition_attendance for insert
    to authenticated
    with check (public.is_mentor_or_admin());

create policy "competition_attendance_mentor_update"
    on public.competition_attendance for update
    to authenticated
    using (public.is_mentor_or_admin());

-- 8. Parent volunteer hours --------------------------------------------------

create table if not exists public.parent_volunteer_hours (
    id                    uuid primary key default gen_random_uuid(),
    parent_user_id        uuid not null references public.profiles (id) on delete cascade,
    student_user_id       uuid not null references public.profiles (id) on delete cascade,
    season_id             uuid not null references public.lettering_seasons (id) on delete cascade,
    hours                 numeric not null check (hours > 0),
    activity_date         date not null,
    description           text not null default '',
    verification_status   text not null default 'pending',
    verified_by           uuid references public.profiles (id) on delete set null,
    verified_at           timestamptz,
    rejection_reason      text not null default '',
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    constraint parent_volunteer_hours_status_check check (verification_status in ('pending', 'verified', 'rejected'))
);

create index idx_parent_volunteer_hours_student_season
    on public.parent_volunteer_hours (student_user_id, season_id);

create index idx_parent_volunteer_hours_parent
    on public.parent_volunteer_hours (parent_user_id);

create index idx_parent_volunteer_hours_pending
    on public.parent_volunteer_hours (verification_status)
    where verification_status = 'pending';

alter table public.parent_volunteer_hours enable row level security;

create policy "parent_volunteer_hours_select"
    on public.parent_volunteer_hours for select
    to authenticated
    using (
        parent_user_id = auth.uid()
        or student_user_id = auth.uid()
        or public.is_mentor_or_admin()
    );

create policy "parent_volunteer_hours_parent_insert"
    on public.parent_volunteer_hours for insert
    to authenticated
    with check (parent_user_id = auth.uid() or public.is_mentor_or_admin());

create policy "parent_volunteer_hours_mentor_update"
    on public.parent_volunteer_hours for update
    to authenticated
    using (public.is_mentor_or_admin());
