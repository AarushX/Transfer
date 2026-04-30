import type { SupabaseClient } from '@supabase/supabase-js';

export type OutcomeRuleInput = {
	question_id: string;
	match_value: string;
	team_slug?: string;
	tag_slug?: string;
	target_role?: string;
};

/**
 * Replaces all outcome rules for a survey. Resolves `team_slug` to `teams.id` (slug is globally unique).
 */
export async function replaceSurveyOutcomeRules(
	supabase: SupabaseClient,
	surveyId: string,
	rawJson: string
): Promise<{ ok: true } | { ok: false; message: string }> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawJson || '[]');
	} catch {
		return { ok: false, message: 'Outcome rules must be valid JSON.' };
	}
	if (!Array.isArray(parsed)) {
		return { ok: false, message: 'Outcome rules must be a JSON array.' };
	}

	const { error: delErr } = await supabase
		.from('survey_outcome_rules')
		.delete()
		.eq('survey_id', surveyId);
	if (delErr) return { ok: false, message: delErr.message };

	let sortOrder = 0;
	for (const row of parsed as OutcomeRuleInput[]) {
		const question_id = String(row.question_id ?? '').trim();
		const match_value = String(row.match_value ?? '').trim();
		if (!question_id || !match_value) {
			return { ok: false, message: 'Each rule needs question_id and match_value.' };
		}

		const targets = (row.team_slug ? 1 : 0) + (row.tag_slug ? 1 : 0) + (row.target_role ? 1 : 0);
		if (targets !== 1) {
			return {
				ok: false,
				message: 'Each rule must set exactly one of team_slug, tag_slug, or target_role.'
			};
		}

		if (row.team_slug) {
			const { data: team, error: teamErr } = await supabase
				.from('teams')
				.select('id')
				.eq('slug', String(row.team_slug).trim())
				.maybeSingle();
			if (teamErr || !team?.id) {
				return { ok: false, message: `Unknown team_slug: ${row.team_slug}` };
			}
			const { error: insErr } = await supabase.from('survey_outcome_rules').insert({
				survey_id: surveyId,
				question_id,
				match_value,
				target_team_id: team.id,
				sort_order: sortOrder++
			});
			if (insErr) return { ok: false, message: insErr.message };
			continue;
		}

		if (row.tag_slug) {
			const { error: insErr } = await supabase.from('survey_outcome_rules').insert({
				survey_id: surveyId,
				question_id,
				match_value,
				tag_slug: String(row.tag_slug).trim(),
				sort_order: sortOrder++
			});
			if (insErr) return { ok: false, message: insErr.message };
			continue;
		}

		if (row.target_role) {
			const { error: insErr } = await supabase.from('survey_outcome_rules').insert({
				survey_id: surveyId,
				question_id,
				match_value,
				target_role: row.target_role as any,
				sort_order: sortOrder++
			});
			if (insErr) return { ok: false, message: insErr.message };
		}
	}

	return { ok: true };
}

export function serializeOutcomeRulesForEditor(
	rules: Array<{
		question_id: string;
		match_value: string;
		tag_slug: string | null;
		target_role: string | null;
		teams?: { slug: string } | { slug: string }[] | null;
	}>
): string {
	const rows = rules.map((r) => {
		const base: Record<string, unknown> = {
			question_id: r.question_id,
			match_value: r.match_value
		};
		const teamSlug = Array.isArray(r.teams) ? r.teams[0]?.slug : r.teams?.slug;
		if (teamSlug) base.team_slug = teamSlug;
		else if (r.tag_slug) base.tag_slug = r.tag_slug;
		else if (r.target_role) base.target_role = r.target_role;
		return base;
	});
	return JSON.stringify(rows, null, 2);
}
