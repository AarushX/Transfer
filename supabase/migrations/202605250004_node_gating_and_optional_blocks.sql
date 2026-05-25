-- Per-course gating mode + per-block optional flag.
--
-- gating_mode='require_checkoff' (default): dependents stay locked until a
-- mentor approves the checkoff (today's behavior).
-- gating_mode='blocks_only': dependents unlock as soon as all *non-optional*
-- blocks are complete — no checkoff required to unblock students who are
-- working ahead.
--
-- node_blocks.optional: blocks marked optional don't count toward node
-- completion. Useful when a quiz should really be an FRQ that a mentor
-- signs off on in person, or when reading material is reference-only.

do $$
begin
	if not exists (select 1 from pg_type where typname = 'node_gating_mode') then
		create type public.node_gating_mode as enum ('require_checkoff', 'blocks_only');
	end if;
end
$$;

alter table public.nodes
	add column if not exists gating_mode public.node_gating_mode not null default 'require_checkoff';

alter table public.node_blocks
	add column if not exists optional boolean not null default false;

-- try_auto_complete_node: ignore optional blocks in the completion check.
create or replace function public.try_auto_complete_node(
	p_node_id uuid,
	p_target_user_id uuid default null
)
returns public.certifications
language plpgsql
security definer
set search_path = public
as $$
declare
	v_target uuid := coalesce(p_target_user_id, auth.uid());
	v_cert public.certifications;
	v_total_blocks int;
	v_completed_blocks int;
	v_pending_checkoff int;
begin
	if v_target is null then
		raise exception 'Unauthenticated';
	end if;

	select * into v_cert
	from public.certifications
	where user_id = v_target and node_id = p_node_id
	for update;
	if not found then
		raise exception 'Certification row missing for user % node %', v_target, p_node_id;
	end if;

	-- Only required (non-optional) blocks count toward completion.
	select count(*) into v_total_blocks
	from public.node_blocks
	where node_id = p_node_id and coalesce(optional, false) = false;

	if v_total_blocks = 0 then
		return v_cert;
	end if;

	select count(*) into v_completed_blocks
	from public.node_blocks b
	join public.user_node_block_progress p
		on p.block_id = b.id and p.user_id = v_target
	where b.node_id = p_node_id
		and coalesce(b.optional, false) = false
		and p.completed_at is not null;

	select count(*) into v_pending_checkoff
	from public.checkoff_reviews r
	where r.node_id = p_node_id and r.user_id = v_target
		and r.status in ('needs_review', 'blocked');

	if v_completed_blocks >= v_total_blocks and v_pending_checkoff = 0 then
		update public.certifications
		set status = 'completed',
			approved_by = coalesce(v_cert.approved_by, auth.uid()),
			approved_at = coalesce(v_cert.approved_at, now())
		where id = v_cert.id
		returning * into v_cert;
	end if;

	return v_cert;
end;
$$;

-- are_prereqs_completed: honor the prereq node's gating_mode. When the prereq
-- is in 'blocks_only' mode, accept it as "completed enough to unlock" when
-- all required blocks are done for the user, even if the cert status isn't
-- 'completed' (which would have required a mentor checkoff).
create or replace function public.are_prereqs_completed(p_user_id uuid, p_node_id uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
	v_blocked_by_prereq boolean;
begin
	select exists (
		select 1
		from public.node_prerequisites np
		join public.nodes pn on pn.id = np.prerequisite_node_id
		left join public.certifications c
			on c.user_id = p_user_id and c.node_id = np.prerequisite_node_id
		where np.node_id = p_node_id
			and coalesce(c.status, 'locked'::public.certification_status) <> 'completed'::public.certification_status
			and (
				pn.gating_mode = 'require_checkoff'
				or not public.prereq_blocks_done(p_user_id, np.prerequisite_node_id)
			)
	) into v_blocked_by_prereq;
	return not v_blocked_by_prereq;
end;
$$;

-- Helper: are all required (non-optional) blocks for a node completed by a
-- given user? Used by are_prereqs_completed for blocks_only gating.
create or replace function public.prereq_blocks_done(p_user_id uuid, p_node_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
	select
		(select count(*) from public.node_blocks where node_id = p_node_id and coalesce(optional, false) = false) > 0
		and
		(select count(*) from public.node_blocks where node_id = p_node_id and coalesce(optional, false) = false)
		=
		(select count(*) from public.node_blocks b
			join public.user_node_block_progress p on p.block_id = b.id and p.user_id = p_user_id
			where b.node_id = p_node_id and coalesce(b.optional, false) = false and p.completed_at is not null);
$$;

grant execute on function public.prereq_blocks_done(uuid, uuid) to authenticated;
