-- Let mentors (not just admins) manage course content so they can author
-- and maintain modules, quizzes, and prerequisites from the mentor app.

drop policy if exists "nodes_admin_write" on public.nodes;
drop policy if exists "nodes_mentor_write" on public.nodes;
create policy "nodes_mentor_write" on public.nodes
	for all
	using (public.is_mentor_or_admin())
	with check (public.is_mentor_or_admin());

drop policy if exists "node_prereq_admin_write" on public.node_prerequisites;
drop policy if exists "node_prereq_mentor_write" on public.node_prerequisites;
create policy "node_prereq_mentor_write" on public.node_prerequisites
	for all
	using (public.is_mentor_or_admin())
	with check (public.is_mentor_or_admin());

drop policy if exists "assessments_admin_write" on public.assessments;
drop policy if exists "assessments_mentor_write" on public.assessments;
create policy "assessments_mentor_write" on public.assessments
	for all
	using (public.is_mentor_or_admin())
	with check (public.is_mentor_or_admin());
