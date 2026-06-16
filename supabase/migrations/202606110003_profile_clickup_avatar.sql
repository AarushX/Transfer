-- ClickUp account link (avatar source of truth when linked) plus the
-- storage path of a user-uploaded fallback avatar. profiles.avatar_url
-- stays the single resolved display value; these columns record the inputs.
alter table public.profiles
  add column if not exists clickup_user_id text,
  add column if not exists clickup_avatar_url text,
  add column if not exists uploaded_avatar_path text;
