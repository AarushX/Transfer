alter table public.attendance_display_sessions
	alter column attendee_user_id drop not null;

insert into public.attendance_display_sessions (attendee_user_id, access_token)
values (null, 'public-attendance-display')
on conflict (access_token) do nothing;
