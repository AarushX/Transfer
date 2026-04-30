alter table public.form_types
	drop column if exists allow_multiple,
	drop column if exists require_attestation,
	drop column if exists attestation_text,
	drop column if exists allow_student_edits,
	drop column if exists student_edit_deadline;

alter table public.form_submissions
	drop column if exists attested;
