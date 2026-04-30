-- Deduplicate historical form submissions so we can enforce single-submit at DB level.
with ranked as (
	select
		id,
		row_number() over (
			partition by form_type_id, user_id
			order by created_at desc, id desc
		) as rn
	from public.form_submissions
)
delete from public.form_submissions fs
using ranked r
where fs.id = r.id
	and r.rn > 1;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'form_submissions_form_type_user_unique'
			and conrelid = 'public.form_submissions'::regclass
	) then
		alter table public.form_submissions
			add constraint form_submissions_form_type_user_unique
			unique (form_type_id, user_id);
	end if;
end
$$;

create or replace function public.submit_form_submission_once(
	p_form_type_id uuid,
	p_notes text,
	p_external_doc_links_json jsonb,
	p_cloud_link text,
	p_file_name text default 'cloud-link',
	p_file_mime text default 'text/uri-list',
	p_file_data_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_submission_id uuid;
begin
	if v_user_id is null then
		raise exception 'Unauthorized';
	end if;

	insert into public.form_submissions (
		form_type_id,
		user_id,
		notes,
		external_doc_links_json,
		cloud_link,
		file_name,
		file_mime,
		file_data_url
	)
	values (
		p_form_type_id,
		v_user_id,
		coalesce(p_notes, ''),
		coalesce(p_external_doc_links_json, '[]'::jsonb),
		coalesce(p_cloud_link, ''),
		coalesce(p_file_name, 'cloud-link'),
		coalesce(p_file_mime, 'text/uri-list'),
		coalesce(p_file_data_url, p_cloud_link)
	)
	on conflict (form_type_id, user_id) do nothing
	returning id into v_submission_id;

	if v_submission_id is null then
		raise exception 'You already submitted this form.';
	end if;

	return v_submission_id;
end;
$$;

create or replace function public.submit_survey_submission_atomic(
	p_survey_id uuid,
	p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_submission_id uuid;
	v_max_submissions int;
	v_count int;
begin
	if v_user_id is null then
		raise exception 'Unauthorized';
	end if;

	select max_submissions
	into v_max_submissions
	from public.surveys
	where id = p_survey_id
	for update;

	if v_max_submissions is null then
		raise exception 'Survey not found.';
	end if;

	select count(*)
	into v_count
	from public.survey_submissions
	where survey_id = p_survey_id
		and user_id = v_user_id;

	if v_count >= v_max_submissions then
		raise exception 'This survey allows at most % submission%.',
			v_max_submissions,
			case when v_max_submissions = 1 then '' else 's' end;
	end if;

	insert into public.survey_submissions (survey_id, user_id, answers, submitted_at)
	values (p_survey_id, v_user_id, coalesce(p_answers, '{}'::jsonb), now())
	returning id into v_submission_id;

	perform public.apply_survey_outcomes_for_user(p_survey_id, v_user_id, coalesce(p_answers, '{}'::jsonb));
	perform public.sync_profile_courseloads_for_user(v_user_id);

	return v_submission_id;
end;
$$;

create or replace function public.carpool_signup_atomic(
	p_role_id uuid,
	p_notes text default '',
	p_capacity_count int default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_signup_id uuid;
	v_slot_count int;
	v_signup_mode text;
	v_day_date date;
	v_is_active boolean;
	v_used int;
	v_capacity int := greatest(1, coalesce(p_capacity_count, 1));
begin
	if v_user_id is null then
		raise exception 'Unauthorized';
	end if;

	select
		r.slot_count,
		r.signup_mode,
		d.day_date,
		e.is_active
	into
		v_slot_count,
		v_signup_mode,
		v_day_date,
		v_is_active
	from public.carpool_day_roles r
	join public.carpool_event_days d on d.id = r.day_id
	join public.carpool_events e on e.id = d.event_id
	where r.id = p_role_id
	for update of r;

	if v_slot_count is null then
		raise exception 'Slot not found.';
	end if;
	if not coalesce(v_is_active, false) then
		raise exception 'This event is not active.';
	end if;
	if v_day_date < current_date then
		raise exception 'This signup slot is no longer active.';
	end if;

	if coalesce(v_signup_mode, 'slots') = 'capacity' then
		select coalesce(sum(greatest(1, capacity_count)), 0)
		into v_used
		from public.carpool_signups
		where role_id = p_role_id;
		if v_used + v_capacity > v_slot_count then
			raise exception 'Not enough remaining capacity for that amount.';
		end if;
	else
		select count(*)
		into v_used
		from public.carpool_signups
		where role_id = p_role_id;
		if v_used >= v_slot_count then
			raise exception 'That slot is already full.';
		end if;
		v_capacity := 1;
	end if;

	insert into public.carpool_signups (role_id, user_id, notes, capacity_count)
	values (p_role_id, v_user_id, coalesce(p_notes, ''), v_capacity)
	returning id into v_signup_id;

	return v_signup_id;
exception
	when unique_violation then
		raise exception 'You are already signed up for this slot.';
end;
$$;

grant execute on function public.submit_form_submission_once(uuid, text, jsonb, text, text, text, text) to authenticated;
grant execute on function public.submit_survey_submission_atomic(uuid, jsonb) to authenticated;
grant execute on function public.carpool_signup_atomic(uuid, text, int) to authenticated;
