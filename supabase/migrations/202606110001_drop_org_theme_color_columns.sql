-- Runtime-configurable theming is removed: the app now uses the fixed token
-- set in src/routes/layout.css. Drop the per-org color overrides; keep
-- workspace name + icon.
alter table public.org_settings
  drop column if exists color_background,
  drop column if exists color_surface,
  drop column if exists color_surface_alt,
  drop column if exists color_border,
  drop column if exists color_text,
  drop column if exists color_text_muted,
  drop column if exists color_accent,
  drop column if exists color_accent_text,
  drop column if exists color_success,
  drop column if exists color_warning,
  drop column if exists color_danger,
  drop column if exists color_info,
  drop column if exists color_link,
  drop column if exists color_link_hover,
  drop column if exists color_input_bg,
  drop column if exists color_input_text,
  drop column if exists color_table_header_bg,
  drop column if exists color_table_row_hover,
  drop column if exists color_overlay_scrim,
  drop column if exists color_focus_ring,
  drop column if exists color_button_secondary_bg,
  drop column if exists color_button_secondary_text,
  drop column if exists color_button_secondary_border;
