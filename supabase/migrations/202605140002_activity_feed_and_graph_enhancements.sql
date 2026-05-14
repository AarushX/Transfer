-- Activity feed for dashboard team activity + graph/UI enhancements

-- 1. Team activity feed (user-visible activity log) -------------------------

create table if not exists public.team_activity (
    id               uuid primary key default gen_random_uuid(),
    actor_id         uuid not null references public.profiles (id) on delete cascade,
    activity_type    text not null,
    target_node_id   uuid references nodes (id) on delete set null,
    target_user_id   uuid references public.profiles (id) on delete set null,
    message          text not null default '',
    metadata         jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now(),
    constraint team_activity_type_check check (
        activity_type in (
            'module_completed',
            'checkoff_approved',
            'checkoff_submitted',
            'quiz_passed',
            'rank_achieved',
            'streak_milestone',
            'badge_earned',
            'course_started'
        )
    )
);

create index idx_team_activity_created
    on public.team_activity (created_at desc);

create index idx_team_activity_actor
    on public.team_activity (actor_id, created_at desc);

create index idx_team_activity_type
    on public.team_activity (activity_type, created_at desc);

alter table public.team_activity enable row level security;

create policy "team_activity_select"
    on public.team_activity for select
    to authenticated
    using (true);

create policy "team_activity_system_insert"
    on public.team_activity for insert
    to authenticated
    with check (actor_id = auth.uid() or public.is_mentor_or_admin());

-- 2. Graph cluster labels on nodes (for skill graph grouping) ---------------

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'nodes' and column_name = 'graph_cluster'
    ) then
        alter table public.nodes add column graph_cluster text not null default 'general';
    end if;
end $$;

-- 3. Trigger to auto-create activity on certification completion ------------

create or replace function public.on_certification_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if NEW.status = 'completed' and (OLD.status is null or OLD.status <> 'completed') then
        insert into public.team_activity (actor_id, activity_type, target_node_id, message)
        select
            NEW.user_id,
            'module_completed',
            NEW.node_id,
            coalesce(n.title, 'a module')
        from public.nodes n
        where n.id = NEW.node_id;
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_certification_activity on public.certifications;
create trigger trg_certification_activity
    after insert or update on public.certifications
    for each row
    execute function public.on_certification_completed();

-- 4. Trigger to auto-create activity on checkoff submission -----------------

create or replace function public.on_checkoff_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.team_activity (actor_id, activity_type, target_node_id, message)
    select
        NEW.user_id,
        'checkoff_submitted',
        NEW.node_id,
        coalesce(n.title, 'a module')
    from public.nodes n
    where n.id = NEW.node_id;
    return NEW;
end;
$$;

drop trigger if exists trg_checkoff_submission_activity on public.checkoff_submissions;
create trigger trg_checkoff_submission_activity
    after insert on public.checkoff_submissions
    for each row
    execute function public.on_checkoff_submitted();

-- 5. Trigger to auto-create activity on checkoff approval -------------------

create or replace function public.on_checkoff_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if NEW.status = 'approved' and (OLD.status is null or OLD.status <> 'approved') then
        insert into public.team_activity (actor_id, activity_type, target_node_id, target_user_id, message)
        select
            NEW.reviewer_id,
            'checkoff_approved',
            NEW.node_id,
            NEW.user_id,
            coalesce(n.title, 'a module')
        from public.nodes n
        where n.id = NEW.node_id;
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_checkoff_review_activity on public.checkoff_reviews;
create trigger trg_checkoff_review_activity
    after insert or update on public.checkoff_reviews
    for each row
    execute function public.on_checkoff_reviewed();

-- 6. Trigger to auto-create activity on quiz pass --------------------------

create or replace function public.on_quiz_passed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if NEW.passed = true then
        insert into public.team_activity (actor_id, activity_type, target_node_id, message, metadata)
        select
            NEW.user_id,
            'quiz_passed',
            nb.node_id,
            coalesce(n.title, 'a quiz'),
            jsonb_build_object('score', NEW.score, 'block_id', NEW.block_id)
        from public.node_blocks nb
        join public.nodes n on n.id = nb.node_id
        where nb.id = NEW.block_id;
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_quiz_pass_activity on public.block_quiz_attempts;
create trigger trg_quiz_pass_activity
    after insert on public.block_quiz_attempts
    for each row
    execute function public.on_quiz_passed();

-- 7. Trigger to auto-create activity on rank change ------------------------

create or replace function public.on_rank_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if NEW.rank_slug is distinct from OLD.rank_slug then
        insert into public.team_activity (actor_id, activity_type, message, metadata)
        values (
            NEW.user_id,
            'rank_achieved',
            NEW.rank_slug,
            jsonb_build_object('points', NEW.points_total, 'prev_rank', OLD.rank_slug)
        );
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_rank_change_activity on public.member_rank_state;
create trigger trg_rank_change_activity
    after update on public.member_rank_state
    for each row
    execute function public.on_rank_changed();
