create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, full_name, email)
	values (
		new.id,
		coalesce(
			nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
			nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
			split_part(coalesce(new.email, ''), '@', 1)
		),
		coalesce(new.email, '')
	)
	on conflict (id) do update
	set
		full_name = coalesce(
			nullif(trim(excluded.full_name), ''),
			public.profiles.full_name
		),
		email = case
			when excluded.email <> '' then excluded.email
			else public.profiles.email
		end;
	return new;
end;
$$;

update public.profiles p
set
	full_name = coalesce(
		nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
		nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
		nullif(trim(p.full_name), ''),
		split_part(coalesce(u.email, p.email, ''), '@', 1)
	),
	email = coalesce(nullif(u.email, ''), p.email)
from auth.users u
where p.id = u.id
	and (
		coalesce(nullif(trim(p.full_name), ''), '') = ''
		or coalesce(nullif(p.email, ''), '') = ''
	);
