-- Remove hardcoded program/technical/business team logic.
-- Courseload eligibility is now generic by team_group slug.

create or replace function public.sync_profile_courseloads_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	cl record;
	group_key text;
	group_values jsonb;
	required_team_slug text;
	user_team_slug text;
	eligible boolean;
begin
	delete from public.profile_courseloads where user_id = p_user_id;

	for cl in select * from public.courseloads where is_active is true
	loop
		eligible := true;

		for group_key, group_values in
			select key, value
			from jsonb_each(coalesce(cl.eligibility, '{}'::jsonb))
		loop
			if jsonb_typeof(group_values) <> 'array' or jsonb_array_length(group_values) = 0 then
				continue;
			end if;

			select t.slug into user_team_slug
			from public.profile_teams pt
			join public.teams t on t.id = pt.team_id
			join public.team_groups g on g.id = pt.team_group_id
			where pt.user_id = p_user_id and g.slug = group_key
			limit 1;

			if user_team_slug is null then
				eligible := false;
				exit;
			end if;

			if not exists (
				select 1
				from jsonb_array_elements_text(group_values) as x(val)
				where trim(x.val) = user_team_slug
			) then
				eligible := false;
				exit;
			end if;
		end loop;

		if eligible then
			insert into public.profile_courseloads (user_id, courseload_id)
			values (p_user_id, cl.id)
			on conflict do nothing;
		end if;
	end loop;
end;
$$;

grant execute on function public.sync_profile_courseloads_for_user(uuid) to authenticated;
