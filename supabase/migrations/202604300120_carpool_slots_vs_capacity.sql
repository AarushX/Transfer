alter table public.carpool_day_roles
	add column if not exists signup_mode text not null default 'slots' check (signup_mode in ('slots', 'capacity')),
	add column if not exists role_description text not null default '';

alter table public.carpool_signups
	add column if not exists capacity_count int not null default 1 check (capacity_count >= 1);
