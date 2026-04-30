import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { finalizeSurveySubmission } from '$lib/server/survey-submit';
import { inferWorkflowKindFromSlug } from '$lib/surveys/workflows';

const isSurveyVisibleNow = (survey: any) => {
	const now = Date.now();
	const from = survey.visible_from ? new Date(survey.visible_from).getTime() : null;
	const until = survey.visible_until ? new Date(survey.visible_until).getTime() : null;
	const inWindow = (from == null || now >= from) && (until == null || now <= until);
	return (survey.is_active && inWindow) || survey.show_when_inactive;
};

const canEditSubmission = (survey: any) => {
	if (!survey?.allow_student_edits) return false;
	if (!survey?.student_edit_deadline) return true;
	return Date.now() <= new Date(survey.student_edit_deadline).getTime();
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: survey } = await locals.supabase.from('surveys').select('*').eq('slug', params.slug).maybeSingle();
	if (!survey) throw error(404, 'Survey not found');
	if (!isSurveyVisibleNow(survey)) throw error(403, 'Survey is not currently available');

	const maxSubmissions = Number(survey.max_submissions ?? 1);

	const [{ data: prereqs }, { data: statuses }, { data: submissionRows }, { count: submissionCount }] =
		await Promise.all([
			locals.supabase
				.from('survey_prerequisites')
				.select('node_id,nodes(title,slug)')
				.eq('survey_id', survey.id),
			locals.supabase.from('v_user_node_status').select('node_id,computed_status').eq('user_id', user.id),
			locals.supabase
				.from('survey_submissions')
				.select('id,answers,submitted_at')
				.eq('survey_id', survey.id)
				.eq('user_id', user.id)
				.order('submitted_at', { ascending: false })
				.limit(50),
			locals.supabase
				.from('survey_submissions')
				.select('id', { count: 'exact', head: true })
				.eq('survey_id', survey.id)
				.eq('user_id', user.id)
		]);

	const statusByNode = new Map((statuses ?? []).map((row: any) => [String(row.node_id), String(row.computed_status)]));
	const prereqRows = (prereqs ?? []).map((row: any) => ({
		node_id: String(row.node_id),
		title: String(row.nodes?.title ?? 'Module'),
		slug: String(row.nodes?.slug ?? ''),
		completed: statusByNode.get(String(row.node_id)) === 'completed'
	}));
	const missingPrereqs = prereqRows.filter((row) => !row.completed);

	const submissions = submissionRows ?? [];
	const submission = submissions[0] ?? null;
	const count = submissionCount ?? 0;
	const submissionCapReached = count >= maxSubmissions;
	const editAllowed = canEditSubmission(survey);
	const canEditExisting = editAllowed && Boolean(submission);
	const submissionBlocked = submissionCapReached && !canEditExisting;
	const showSubmissions = Boolean(survey.allow_student_view_submissions);

	return {
		survey,
		workflowKind: inferWorkflowKindFromSlug(String(survey.slug ?? '')),
		maxSubmissions,
		submissionCount: count,
		submissionCapReached,
		submissionBlocked,
		editAllowed,
		showSubmissions,
		prereqs: prereqRows,
		missingPrereqs,
		submission,
		submissions
	};
};

export const actions: Actions = {
	submitSurvey: async ({ locals, request, params }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const { data: survey } = await locals.supabase.from('surveys').select('*').eq('slug', params.slug).maybeSingle();
		if (!survey) return fail(404, { error: 'Survey not found' });
		if (!isSurveyVisibleNow(survey)) return fail(403, { error: 'Survey is not currently available' });

		const maxSubmissions = Number(survey.max_submissions ?? 1);
		const editAllowed = canEditSubmission(survey);

		const { data: prereqs } = await locals.supabase
			.from('survey_prerequisites')
			.select('node_id')
			.eq('survey_id', survey.id);
		const prereqIds = (prereqs ?? []).map((row: any) => String(row.node_id));
		if (prereqIds.length > 0) {
			const { data: statuses } = await locals.supabase
				.from('v_user_node_status')
				.select('node_id,computed_status')
				.eq('user_id', user.id)
				.in('node_id', prereqIds);
			const completed = new Set(
				(statuses ?? [])
					.filter((row: any) => String(row.computed_status) === 'completed')
					.map((row: any) => String(row.node_id))
			);
			const missing = prereqIds.filter((id) => !completed.has(id));
			if (missing.length > 0) return fail(400, { error: 'Complete prerequisites before submitting.' });
		}

		const form = await request.formData();
		const answers: Record<string, string | string[]> = {};
		for (const question of Array.isArray(survey.questions) ? survey.questions : []) {
			const key = String(question.id ?? '');
			if (!key) continue;
			if (question.type === 'ms') {
				const raw = String(form.get(key) ?? '[]');
				try {
					const parsed = JSON.parse(raw);
					const selected = Array.isArray(parsed)
						? parsed.map((v) => String(v)).filter(Boolean)
						: [];
					const maxSelectRaw = Number(question.max_select);
					const maxSelect =
						Number.isFinite(maxSelectRaw) && maxSelectRaw > 0 ? Math.trunc(maxSelectRaw) : null;
					if (maxSelect != null && selected.length > maxSelect) {
						return fail(400, {
							error: `Too many selections for "${String(question.prompt ?? key)}". Max is ${maxSelect}.`
						});
					}
					answers[key] = selected;
				} catch {
					answers[key] = [];
				}
			} else {
				answers[key] = String(form.get(key) ?? '').trim();
			}
		}

		if (editAllowed) {
			const { data: existingRows } = await locals.supabase
				.from('survey_submissions')
				.select('id')
				.eq('survey_id', survey.id)
				.eq('user_id', user.id)
				.order('submitted_at', { ascending: false })
				.limit(1);
			const existing = existingRows?.[0] ?? null;
			if (existing?.id) {
				const { error: updateErr } = await locals.supabase
					.from('survey_submissions')
					.update({ answers, submitted_at: new Date().toISOString() })
					.eq('id', existing.id)
					.eq('user_id', user.id);
				if (updateErr) return fail(400, { error: updateErr.message });
				return { ok: true };
			}
		}

		const result = await finalizeSurveySubmission(locals.supabase, {
			surveyId: survey.id,
			userId: user.id,
			answers,
			maxSubmissions
		});

		if (!result.ok) {
			if (result.code === 'cap_reached') {
				return fail(400, { error: result.message });
			}
			return fail(400, { error: result.message });
		}

		return { ok: true };
	}
};
