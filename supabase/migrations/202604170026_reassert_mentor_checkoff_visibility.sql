alter table public.certifications enable row level security;
alter table public.checkoff_submissions enable row level security;
alter table public.checkoff_reviews enable row level security;

drop policy if exists "certifications_select_own_or_mentor" on public.certifications;
create policy "certifications_select_own_or_mentor" on public.certifications
	for select
	using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "checkoff_submissions_select" on public.checkoff_submissions;
create policy "checkoff_submissions_select" on public.checkoff_submissions
	for select
	using (user_id = auth.uid() or public.is_mentor_or_admin());

drop policy if exists "checkoff_reviews_select" on public.checkoff_reviews;
create policy "checkoff_reviews_select" on public.checkoff_reviews
	for select
	using (user_id = auth.uid() or public.is_mentor_or_admin());
