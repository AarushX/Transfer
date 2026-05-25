-- Course-by-course veteran approvers.
--
-- Any member who has completed a course can be granted "veteran" status
-- for that specific course. Veterans can approve checkoffs ONLY for the
-- courses they've been granted, on top of the normal mentor/admin path.

create table if not exists public.course_veterans (
	node_id uuid not null references public.nodes(id) on delete cascade,
	user_id uuid not null references public.profiles(id) on delete cascade,
	granted_by uuid references public.profiles(id) on delete set null,
	granted_at timestamptz not null default now(),
	primary key (node_id, user_id)
);

create index if not exists course_veterans_user_idx on public.course_veterans (user_id);

alter table public.course_veterans enable row level security;

-- Anyone authenticated can read (small table; needed by the mentor queue
-- to decide which courses to show veterans).
create policy "course_veterans_read" on public.course_veterans for select
	using (auth.role() = 'authenticated');

-- Only admins manage grants. Mentors can also grant via the service client
-- in actions; admin policy below covers them when using the user-scoped
-- supabase client.
create policy "course_veterans_admin_write" on public.course_veterans for all
	using (public.is_admin()) with check (public.is_admin());

-- Permission check used by the checkoff API.
create or replace function public.can_user_approve_checkoff(
	p_user_id uuid,
	p_node_id uuid
) returns boolean
language sql
stable
set search_path = public
as $$
	select
		exists (
			select 1 from public.profiles p
			where p.id = p_user_id
				and (
					coalesce(p.is_mentor, false)
					or coalesce(p.base_role, 'member'::public.app_base_role) = 'admin'
					or p.role in ('mentor'::public.app_role, 'admin'::public.app_role)
				)
		)
		or exists (
			select 1 from public.course_veterans cv
			where cv.user_id = p_user_id and cv.node_id = p_node_id
		);
$$;

grant execute on function public.can_user_approve_checkoff(uuid, uuid) to authenticated;
