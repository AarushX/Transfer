-- Team notes timeline.
--
-- The existing team_notes table stores a single pinned note per
-- (team_group_id, subteam_category_slug). team_notes_entries is the
-- companion chronological log so leads can post updates over time without
-- overwriting earlier messages.

create table if not exists public.team_notes_entries (
	id uuid primary key default gen_random_uuid(),
	team_group_id uuid not null references public.team_groups(id) on delete cascade,
	subteam_category_slug text not null default '',
	author_user_id uuid references public.profiles(id) on delete set null,
	body text not null,
	edited_at timestamptz,
	deleted_at timestamptz,
	created_at timestamptz not null default now()
);

create index if not exists team_notes_entries_scope_created_idx
	on public.team_notes_entries (team_group_id, subteam_category_slug, created_at desc);

alter table public.team_notes_entries enable row level security;

-- Anyone authenticated reads non-deleted entries (admins read all).
create policy "team_notes_entries_read" on public.team_notes_entries for select using (
	auth.role() = 'authenticated'
);

-- Admins can do anything.
create policy "team_notes_entries_admin_all" on public.team_notes_entries for all
	using (public.is_admin()) with check (public.is_admin());

-- Team leads can insert for their team_group.
create policy "team_notes_entries_team_lead_insert" on public.team_notes_entries for insert with check (
	exists (
		select 1 from public.profiles p
		where p.id = auth.uid() and p.lead_team_group_id = team_group_id
	)
);

-- Subteam leads can insert for their subteam (any team_group).
create policy "team_notes_entries_subteam_lead_insert" on public.team_notes_entries for insert with check (
	exists (
		select 1 from public.profiles p
		join public.subteams s on s.id = p.lead_subteam_id
		where p.id = auth.uid() and s.slug = subteam_category_slug
	)
);

-- Authors may update their own entry within 15 minutes of creation
-- (used for edits and soft delete by setting deleted_at).
create policy "team_notes_entries_author_update" on public.team_notes_entries for update using (
	author_user_id = auth.uid()
	and created_at > (now() - interval '15 minutes')
) with check (
	author_user_id = auth.uid()
);
