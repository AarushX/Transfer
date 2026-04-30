alter table public.org_settings
	add column if not exists icon_data_url text not null default '';
