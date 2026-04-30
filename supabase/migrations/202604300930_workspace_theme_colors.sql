alter table public.org_settings
	add column if not exists color_background text not null default '#020617',
	add column if not exists color_surface text not null default '#0f172a',
	add column if not exists color_surface_alt text not null default '#1e293b',
	add column if not exists color_border text not null default '#334155',
	add column if not exists color_text text not null default '#e2e8f0',
	add column if not exists color_text_muted text not null default '#94a3b8',
	add column if not exists color_accent text not null default '#facc15',
	add column if not exists color_accent_text text not null default '#0f172a';
