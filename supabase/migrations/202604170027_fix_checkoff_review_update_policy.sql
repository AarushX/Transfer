drop policy if exists "checkoff_reviews_mentor_update" on public.checkoff_reviews;
create policy "checkoff_reviews_mentor_update" on public.checkoff_reviews
	for update
	using (public.is_mentor_or_admin())
	with check (public.is_mentor_or_admin());
