-- Allow mentors and admins to insert/update block progress rows on behalf of
-- students. The checkoff approval endpoint (src/routes/api/mentor/checkoff)
-- runs as the mentor's anon session, so the prior policies (which restricted
-- writes to user_id = auth.uid()) blocked the approval upsert with
-- "new row violates row-level security policy for table user_node_block_progress".

drop policy if exists "user_node_block_progress_mentor_insert" on public.user_node_block_progress;
create policy "user_node_block_progress_mentor_insert" on public.user_node_block_progress
	for insert with check (public.is_mentor_or_admin());

drop policy if exists "user_node_block_progress_mentor_update" on public.user_node_block_progress;
create policy "user_node_block_progress_mentor_update" on public.user_node_block_progress
	for update using (public.is_mentor_or_admin()) with check (public.is_mentor_or_admin());
