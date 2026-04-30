import type { PageServerLoad } from './$types';
import { inferWorkflowKindFromSlug } from '$lib/surveys/workflows';

const isVisible = (survey: any) => {
	const now = Date.now();
	const from = survey.visible_from ? new Date(survey.visible_from).getTime() : null;
	const until = survey.visible_until ? new Date(survey.visible_until).getTime() : null;
	const inWindow = (from == null || now >= from) && (until == null || now <= until);
	return (survey.is_active && inWindow) || survey.show_when_inactive;
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return { surveys: [] };

	const { data: surveys } = await locals.supabase
		.from('surveys')
		.select('id,title,slug,description,is_active,show_when_inactive,visible_from,visible_until,max_submissions')
		.order('updated_at', { ascending: false });

	const visibleSurveys = (surveys ?? []).filter(isVisible);
	const { data: mySubmissionCounts } = await locals.supabase
		.from('survey_submissions')
		.select('survey_id')
		.eq('user_id', user.id);

	const countBySurveyId = new Map<string, number>();
	for (const row of mySubmissionCounts ?? []) {
		const key = String((row as any).survey_id);
		countBySurveyId.set(key, (countBySurveyId.get(key) ?? 0) + 1);
	}

	return {
		surveys: visibleSurveys.map((survey: any) => {
			const submissions = countBySurveyId.get(String(survey.id)) ?? 0;
			const max = Number(survey.max_submissions ?? 1);
			return {
				...survey,
				workflowKind: inferWorkflowKindFromSlug(String(survey.slug ?? '')),
				submissions,
				maxSubmissions: max,
				capReached: submissions >= max
			};
		})
	};
};
