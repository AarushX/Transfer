create index if not exists idx_certifications_user_status
    on public.certifications (user_id, status);

create index if not exists idx_certifications_status
    on public.certifications (status)
    where status <> 'locked';

create index if not exists idx_quiz_attempts_user_node_created
    on public.quiz_attempts (user_id, node_id, created_at desc);

create index if not exists idx_certifications_node_status
    on public.certifications (node_id, status);

create index if not exists idx_attendance_daily_sessions_attendee
    on public.attendance_daily_sessions (attendee_user_id, attendance_day desc);

create index if not exists idx_checkoff_reviews_user_status
    on public.checkoff_reviews (user_id, status)
    where status in ('needs_review', 'blocked');

create index if not exists idx_survey_submissions_survey_user
    on public.survey_submissions (survey_id, user_id);
