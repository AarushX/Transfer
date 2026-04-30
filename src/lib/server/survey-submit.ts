import type { SupabaseClient } from '@supabase/supabase-js';

export type SurveySubmitResult =
	| { ok: true; submissionId: string }
	| { ok: false; code: 'cap_reached' | 'db_error'; message: string };

/**
 * Inserts a new survey submission and syncs courseload assignments.
 * Caller must enforce prerequisites and visibility.
 */
export async function finalizeSurveySubmission(
	supabase: SupabaseClient,
	args: {
		surveyId: string;
		userId: string;
		answers: Record<string, unknown>;
	}
): Promise<SurveySubmitResult> {
	const { data: insertedId, error: submitErr } = await supabase.rpc('submit_survey_submission_atomic', {
		p_survey_id: args.surveyId,
		p_answers: args.answers as object
	});
	if (submitErr) {
		const isCapError = /at most\s+\d+\s+submission/i.test(submitErr.message);
		return {
			ok: false,
			code: isCapError ? 'cap_reached' : 'db_error',
			message: submitErr.message
		};
	}

	return { ok: true, submissionId: String(insertedId) };
}
