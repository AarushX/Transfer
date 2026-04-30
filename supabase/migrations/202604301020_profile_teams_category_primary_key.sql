-- Allow multiple subteam roles per main group (e.g. technical + business on the same team_group_id).
-- Previously PK (user_id, team_group_id) made onboarding impossible when both picks shared one group.

alter table public.profile_teams
    add column if not exists category_slug text;

update public.profile_teams pt
set category_slug = coalesce(t.category_slug, 'general')
from public.teams t
where t.id = pt.team_id
  and pt.category_slug is null;

update public.profile_teams
set category_slug = 'general'
where category_slug is null;

alter table public.profile_teams
    alter column category_slug set not null;

alter table public.profile_teams
    add constraint profile_teams_category_slug_fkey
    foreign key (category_slug) references public.subteam_categories (slug) on delete restrict;

do $$
declare
    pk_name text;
begin
    select c.conname
    into pk_name
    from pg_constraint c
    where c.conrelid > 0
        and c.conrelid = 'public.profile_teams'::regclass
        and c.contype = 'p';
    if pk_name is not null then
        execute format('alter table public.profile_teams drop constraint %I', pk_name);
    end if;
end;
$$;

alter table public.profile_teams
    add primary key (user_id, team_group_id, category_slug);

create or replace function public.apply_survey_outcomes_for_user(p_survey_id uuid, p_user_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    r record;
    v_answer_text text;
    v_team_group uuid;
    v_category_slug text;
begin
    delete from public.profile_teams where user_id = p_user_id and source_survey_id = p_survey_id;
    delete from public.profile_tags where user_id = p_user_id and source_survey_id = p_survey_id;

    for r in
        select *
        from public.survey_outcome_rules
        where survey_id = p_survey_id
        order by sort_order, id
    loop
        v_answer_text := trim(coalesce(p_answers ->> r.question_id, ''));
        if v_answer_text is distinct from trim(r.match_value) then
            continue;
        end if;

        if r.target_team_id is not null then
            select team_group_id, coalesce(category_slug, 'general')
            into v_team_group, v_category_slug
            from public.teams
            where id = r.target_team_id;
            if v_team_group is null then
                continue;
            end if;
            insert into public.profile_teams (user_id, team_group_id, team_id, source_survey_id, category_slug)
            values (p_user_id, v_team_group, r.target_team_id, p_survey_id, v_category_slug)
            on conflict (user_id, team_group_id, category_slug) do update set
                team_id = excluded.team_id,
                source_survey_id = excluded.source_survey_id,
                updated_at = now();
        elsif r.tag_slug is not null then
            insert into public.profile_tags (user_id, tag_slug, source_survey_id)
            values (p_user_id, r.tag_slug, p_survey_id)
            on conflict (user_id, tag_slug) do update set source_survey_id = excluded.source_survey_id;
        elsif r.target_role is not null then
            if exists (
                select 1
                from public.surveys s
                where s.id = p_survey_id and s.allow_role_mapping is true
            ) then
                update public.profiles set role = r.target_role where id = p_user_id;
            end if;
        end if;
    end loop;
end;
$$;
