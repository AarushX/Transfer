alter table public.profiles
	add column if not exists passport_qr_version integer not null default 0;
