alter table public.checkoff_submissions
	add column if not exists photo_data_urls jsonb not null default '[]'::jsonb;

update public.checkoff_submissions
set photo_data_urls =
	case
		when coalesce(photo_data_url, '') = '' then '[]'::jsonb
		else jsonb_build_array(photo_data_url)
	end
where coalesce(photo_data_urls, '[]'::jsonb) = '[]'::jsonb;

create table if not exists public.checkoff_reviews (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles (id) on delete cascade,
	node_id uuid not null references public.nodes (id) on delete cascade,
	reviewer_id uuid not null references public.profiles (id) on delete restrict,
	status text not null check (status in ('approved', 'needs_review')),
	mentor_notes text not null default '',
	checklist_results jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (user_id, node_id)
);

alter table public.checkoff_reviews enable row level security;

drop policy if exists "checkoff_reviews_select" on public.checkoff_reviews;
create policy "checkoff_reviews_select" on public.checkoff_reviews
	for select
	using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "checkoff_reviews_mentor_insert" on public.checkoff_reviews;
create policy "checkoff_reviews_mentor_insert" on public.checkoff_reviews
	for insert
	with check (public.is_mentor_or_admin() and reviewer_id = auth.uid());

drop policy if exists "checkoff_reviews_mentor_update" on public.checkoff_reviews;
create policy "checkoff_reviews_mentor_update" on public.checkoff_reviews
	for update
	using (public.is_mentor_or_admin() and reviewer_id = auth.uid())
	with check (public.is_mentor_or_admin() and reviewer_id = auth.uid());
