import type { SupabaseClient } from '@supabase/supabase-js';

export type SurveySubmitResult =
	| { ok: true; submissionId: string }
	| { ok: false; code: 'cap_reached' | 'db_error'; message: string };

/**
 * Inserts a new submission row, applies outcome rules (replacing prior mappings from this survey),
 * and syncs courseload assignments. Caller must enforce prerequisites and visibility.
 */
export async function finalizeSurveySubmission(
	supabase: SupabaseClient,
	args: {
		surveyId: string;
		userId: string;
		answers: Record<string, unknown>;
		maxSubmissions: number;
	}
): Promise<SurveySubmitResult> {
	const { count, error: countErr } = await supabase
		.from('survey_submissions')
		.select('id', { count: 'exact', head: true })
		.eq('survey_id', args.surveyId)
		.eq('user_id', args.userId);

	if (countErr) {
		return { ok: false, code: 'db_error', message: countErr.message };
	}
	if ((count ?? 0) >= args.maxSubmissions) {
		return {
			ok: false,
			code: 'cap_reached',
			message: `This survey allows at most ${args.maxSubmissions} submission${args.maxSubmissions === 1 ? '' : 's'}.`
		};
	}

	const { data: inserted, error: insErr } = await supabase
		.from('survey_submissions')
		.insert({
			survey_id: args.surveyId,
			user_id: args.userId,
			answers: args.answers as object,
			submitted_at: new Date().toISOString()
		})
		.select('id')
		.single();

	if (insErr || !inserted?.id) {
		return { ok: false, code: 'db_error', message: insErr?.message ?? 'Could not save submission.' };
	}

	const { error: applyErr } = await supabase.rpc('apply_survey_outcomes_for_user', {
		p_survey_id: args.surveyId,
		p_user_id: args.userId,
		p_answers: args.answers
	});
	if (applyErr) {
		return { ok: false, code: 'db_error', message: applyErr.message };
	}

	const { error: syncErr } = await supabase.rpc('sync_profile_courseloads_for_user', {
		p_user_id: args.userId
	});
	if (syncErr) {
		return { ok: false, code: 'db_error', message: syncErr.message };
	}

	return { ok: true, submissionId: String(inserted.id) };
}
