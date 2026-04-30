alter table public.attendance_guest_signins
	alter column created_by_user_id drop not null;

drop policy if exists "attendance_guest_signins_insert_mentor_or_admin" on public.attendance_guest_signins;
create policy "attendance_guest_signins_insert_public" on public.attendance_guest_signins
	for insert with check (true);
