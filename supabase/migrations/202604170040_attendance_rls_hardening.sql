-- Harden attendance RLS and allow read-only public kiosk state.

drop policy if exists "attendance_daily_sessions_insert_authenticated" on public.attendance_daily_sessions;
create policy "attendance_daily_sessions_insert_own_or_mentor" on public.attendance_daily_sessions
	for insert
	with check (
		attendee_user_id = auth.uid()
		or public.is_mentor_or_admin()
	);

drop policy if exists "attendance_daily_sessions_update_authenticated" on public.attendance_daily_sessions;
create policy "attendance_daily_sessions_update_own_or_mentor" on public.attendance_daily_sessions
	for update
	using (
		attendee_user_id = auth.uid()
		or public.is_mentor_or_admin()
	)
	with check (
		attendee_user_id = auth.uid()
		or public.is_mentor_or_admin()
	);

drop policy if exists "attendance_display_sessions_insert_authenticated" on public.attendance_display_sessions;
create policy "attendance_display_sessions_insert_mentor_only" on public.attendance_display_sessions
	for insert
	with check (public.is_mentor_or_admin());

drop policy if exists "attendance_display_sessions_public_read_kiosk" on public.attendance_display_sessions;
create policy "attendance_display_sessions_public_read_kiosk" on public.attendance_display_sessions
	for select
	using (access_token = 'public-attendance-display');
