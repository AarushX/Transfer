-- Course proficiency level + auto-generated catalog code.
--
-- proficiency_level: mentors tag each course as Beginner / Intermediate /
-- Advanced. A member's level in a subteam is derived from the highest level
-- they've completed at least one course in (no profile column needed).
--
-- code: mentor-friendly catalog identifier of the form <LEVEL><N>
-- (e.g. B1, B2, I1, A1). Numbered per (subteam, proficiency_level). Auto-
-- assigned on insert and whenever the level changes.

do $$
begin
	if not exists (select 1 from pg_type where typname = 'node_proficiency_level') then
		create type public.node_proficiency_level as enum ('beginner', 'intermediate', 'advanced');
	end if;
end
$$;

alter table public.nodes
	add column if not exists proficiency_level public.node_proficiency_level,
	add column if not exists code text;

create unique index if not exists nodes_code_per_subteam_idx
	on public.nodes (subteam_id, code)
	where code is not null;

-- Generator: pick the next free <LEVEL><N> within (subteam, level).
create or replace function public.next_node_code(
	p_subteam_id uuid,
	p_level public.node_proficiency_level
) returns text
language plpgsql
as $$
declare
	v_prefix text;
	v_next int;
begin
	v_prefix := case p_level
		when 'beginner' then 'B'
		when 'intermediate' then 'I'
		when 'advanced' then 'A'
	end;
	-- Find the highest existing integer suffix for this prefix in the same
	-- subteam and add one. coalesce so the first ever code is <prefix>1.
	select coalesce(max(substring(code from length(v_prefix) + 1)::int), 0) + 1
		into v_next
		from public.nodes
		where subteam_id = p_subteam_id
		  and code is not null
		  and code like v_prefix || '%'
		  and substring(code from length(v_prefix) + 1) ~ '^[0-9]+$';
	return v_prefix || v_next::text;
end;
$$;

create or replace function public.nodes_assign_code()
returns trigger
language plpgsql
as $$
begin
	-- Only auto-assign when the level is set and either the code is empty
	-- or the prefix no longer matches the level. Never overwrite a code a
	-- mentor manually edited unless they also changed the level.
	if new.proficiency_level is null then
		return new;
	end if;
	if new.code is null or new.code = '' or
		(tg_op = 'UPDATE' and new.proficiency_level is distinct from old.proficiency_level)
	then
		new.code := public.next_node_code(new.subteam_id, new.proficiency_level);
	end if;
	return new;
end;
$$;

drop trigger if exists nodes_assign_code_trg on public.nodes;
create trigger nodes_assign_code_trg
	before insert or update of proficiency_level, code, subteam_id on public.nodes
	for each row execute function public.nodes_assign_code();

-- Backfill: default existing courses to beginner so the catalog gets a
-- consistent set of codes today. Mentors can re-tag any course later and the
-- trigger will reassign its code.
update public.nodes set proficiency_level = 'beginner' where proficiency_level is null;
