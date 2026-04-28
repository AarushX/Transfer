import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadTrainingCategories } from '$lib/server/training-categories';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const [
		nodesResp,
		statusesResp,
		subteamsResp,
		prereqResp,
		reviewResp,
		blockRowsResp,
		blockProgressResp,
		trainingData,
		surveysResp,
		surveyPrereqResp,
		surveySubmissionResp,
		coursesDashboard
	] = await Promise.all([
		locals.supabase
			.from('nodes')
			.select('id,title,slug,subteam_id,video_url')
			.order('title', { ascending: true }),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('subteams').select('id,name,slug').order('name'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase
			.from('checkoff_reviews')
			.select('node_id,status,updated_at')
			.eq('user_id', user.id)
			.in('status', ['needs_review', 'blocked']),
		locals.supabase.from('node_blocks').select('node_id,id'),
		locals.supabase
			.from('user_node_block_progress')
			.select('node_id,block_id,completed_at')
			.eq('user_id', user.id),
		loadTrainingCategories(locals.supabase),
		locals.supabase
			.from('surveys')
			.select(
				'id,title,slug,description,is_active,show_when_inactive,visible_from,visible_until,updated_at,max_submissions'
			)
			.or('is_active.eq.true,slug.eq.team-path-selection')
			.order('updated_at', { ascending: false }),
		locals.supabase.from('survey_prerequisites').select('survey_id,node_id'),
		locals.supabase.from('survey_submissions').select('survey_id,submitted_at').eq('user_id', user.id),
		loadStudentCoursesDashboard(locals.supabase, user.id)
	]);

	const surveys = surveysResp.data ?? [];
	const surveySubmissions = surveySubmissionResp.data ?? [];

	const submissionSummaryBySurvey = new Map<string, { count: number; latestAt: string | null }>();
	for (const row of surveySubmissions as { survey_id: string; submitted_at: string }[]) {
		const sid = String(row.survey_id);
		const prev = submissionSummaryBySurvey.get(sid) ?? { count: 0, latestAt: null };
		prev.count += 1;
		if (!prev.latestAt || row.submitted_at > prev.latestAt) prev.latestAt = row.submitted_at;
		submissionSummaryBySurvey.set(sid, prev);
	}

	return {
		profile,
		nodes: nodesResp.data ?? [],
		statuses: statusesResp.data ?? [],
		subteams: subteamsResp.data ?? [],
		prerequisites: prereqResp.data ?? [],
		checkoffReviews: reviewResp.data ?? [],
		blockRows: blockRowsResp.data ?? [],
		blockProgress: blockProgressResp.data ?? [],
		trainingCategories: trainingData.categories,
		nodeCategories: trainingData.nodeCategories,
		surveys,
		surveyPrerequisites: surveyPrereqResp.data ?? [],
		surveySubmissions,
		submissionSummaryBySurvey: Object.fromEntries(submissionSummaryBySurvey.entries()),
		coursesDashboard
	};
};
