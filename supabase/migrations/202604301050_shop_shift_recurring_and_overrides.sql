create table if not exists public.shop_shift_recurring_availability (
	user_id uuid not null references public.profiles (id) on delete cascade,
	day_of_week smallint not null check (day_of_week between 0 and 6),
	shift_number smallint not null check (shift_number in (1, 2)),
	is_active boolean not null default false,
	updated_at timestamptz not null default now(),
	primary key (user_id, day_of_week, shift_number)
);

create index if not exists shop_shift_recurring_user_idx
	on public.shop_shift_recurring_availability (user_id);

alter table public.shop_shift_recurring_availability enable row level security;

drop policy if exists shop_shift_recurring_select on public.shop_shift_recurring_availability;
create policy shop_shift_recurring_select on public.shop_shift_recurring_availability
	for select
	using (
		user_id = auth.uid()
		or exists (
			select 1 from public.profiles me
			where me.id = auth.uid() and me.role = 'admin'
		)
		or exists (
			select 1
			from public.profiles me
			join public.profiles them on them.id = public.shop_shift_recurring_availability.user_id
			where me.id = auth.uid()
			  and me.role in ('mentor', 'student_lead')
			  and me.subteam_id is not null
			  and me.subteam_id = them.subteam_id
		)
	);

drop policy if exists shop_shift_recurring_insert on public.shop_shift_recurring_availability;
create policy shop_shift_recurring_insert on public.shop_shift_recurring_availability
	for insert
	with check (user_id = auth.uid());

drop policy if exists shop_shift_recurring_update on public.shop_shift_recurring_availability;
create policy shop_shift_recurring_update on public.shop_shift_recurring_availability
	for update
	using (user_id = auth.uid())
	with check (user_id = auth.uid());

alter table public.shop_shift_availability
	add column if not exists is_active boolean not null default true;

drop policy if exists shop_shift_availability_update on public.shop_shift_availability;
create policy shop_shift_availability_update on public.shop_shift_availability
	for update
	using (user_id = auth.uid())
	with check (user_id = auth.uid());
