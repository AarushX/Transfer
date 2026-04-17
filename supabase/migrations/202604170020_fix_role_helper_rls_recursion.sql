create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and (
				p.role = 'admin'::public.app_role
				or p.base_role = 'admin'::public.app_base_role
			)
	);
$$;

create or replace function public.is_mentor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and (
				p.role in ('mentor'::public.app_role, 'admin'::public.app_role)
				or p.base_role = 'admin'::public.app_base_role
				or p.is_mentor = true
			)
	);
$$;
