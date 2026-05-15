-- Returns, for a set of learning node ids: how many distinct users are assigned
-- to each course (via direct team target OR team-group target) and how many have
-- completed it.
create or replace function public.course_completion_aggregate(node_ids uuid[])
returns table (
  node_id uuid,
  assigned bigint,
  completed bigint
)
language sql
stable
security invoker
as $$
  with assignees as (
    select distinct ntt.node_id, pt.user_id
    from node_team_targets ntt
    join profile_teams pt on pt.team_id = ntt.team_id
    where ntt.node_id = any(node_ids)
    union
    select distinct ngt.node_id, pt.user_id
    from node_team_group_targets ngt
    join profile_teams pt on pt.team_group_id = ngt.team_group_id
    where ngt.node_id = any(node_ids)
  ),
  done as (
    select node_id, user_id
    from certifications
    where node_id = any(node_ids) and status = 'completed'
  )
  select
    a.node_id,
    count(distinct a.user_id) as assigned,
    count(distinct d.user_id) as completed
  from assignees a
  left join done d using (node_id, user_id)
  group by a.node_id;
$$;

grant execute on function public.course_completion_aggregate(uuid[]) to authenticated;
