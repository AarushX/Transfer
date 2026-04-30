alter table public.org_settings
	add column if not exists color_background text not null default '#0b1220',
	add column if not exists color_surface text not null default '#121a2b',
	add column if not exists color_surface_alt text not null default '#1a2438',
	add column if not exists color_border text not null default '#2a3754',
	add column if not exists color_text text not null default '#e6edf7',
	add column if not exists color_text_muted text not null default '#9fb0cc',
	add column if not exists color_accent text not null default '#8b5cf6',
	add column if not exists color_accent_text text not null default '#ffffff';
