alter table public.assessments
	add column if not exists min_seconds_between_attempts int not null default 15,
	add column if not exists fail_window_minutes int not null default 10,
	add column if not exists max_failed_in_window int not null default 5,
	add column if not exists short_answer_min_chars int not null default 3,
	add column if not exists short_answer_max_chars int not null default 300;

alter table public.assessments
	drop constraint if exists assessments_min_seconds_between_attempts_check,
	add constraint assessments_min_seconds_between_attempts_check check (min_seconds_between_attempts >= 0),
	drop constraint if exists assessments_fail_window_minutes_check,
	add constraint assessments_fail_window_minutes_check check (fail_window_minutes >= 1),
	drop constraint if exists assessments_max_failed_in_window_check,
	add constraint assessments_max_failed_in_window_check check (max_failed_in_window >= 1),
	drop constraint if exists assessments_short_answer_min_chars_check,
	add constraint assessments_short_answer_min_chars_check check (short_answer_min_chars >= 0),
	drop constraint if exists assessments_short_answer_max_chars_check,
	add constraint assessments_short_answer_max_chars_check check (short_answer_max_chars >= 1),
	drop constraint if exists assessments_short_answer_range_check,
	add constraint assessments_short_answer_range_check check (short_answer_max_chars >= short_answer_min_chars);
