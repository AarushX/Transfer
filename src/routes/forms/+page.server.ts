import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	const [
		{ data: formTypes },
		{ data: submissions },
		{ data: surveys },
		{ data: surveyPrerequisites },
		{ data: surveySubmissions },
		{ data: statuses }
	] = await Promise.all([
		locals.supabase.from('form_types').select('*').eq('is_active', true).order('name'),
		locals.supabase
			.from('form_submissions')
			.select('id,form_type_id,notes,file_name,file_mime,status,review_notes,reviewed_at,created_at')
			.eq('user_id', user!.id)
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('surveys')
			.select(
				'id,title,slug,description,is_active,show_when_inactive,visible_from,visible_until,max_submissions,updated_at'
			)
			.or('is_active.eq.true,slug.eq.team-path-selection')
			.order('updated_at', { ascending: false }),
		locals.supabase.from('survey_prerequisites').select('survey_id,node_id'),
		locals.supabase
			.from('survey_submissions')
			.select('survey_id,submitted_at')
			.eq('user_id', user!.id),
		locals.supabase.from('v_user_node_status').select('node_id,computed_status').eq('user_id', user!.id)
	]);

	const statusByNode = new Map(
		(statuses ?? []).map((row: { node_id: string; computed_status: string }) => [
			String(row.node_id),
			String(row.computed_status)
		])
	);
	const prereqBySurvey = new Map<string, string[]>();
	for (const edge of (surveyPrerequisites ?? []) as { survey_id: string; node_id: string }[]) {
		const list = prereqBySurvey.get(String(edge.survey_id)) ?? [];
		list.push(String(edge.node_id));
		prereqBySurvey.set(String(edge.survey_id), list);
	}
	const submissionSummaryBySurvey = new Map<string, { count: number; latestAt: string | null }>();
	for (const row of (surveySubmissions ?? []) as { survey_id: string; submitted_at: string }[]) {
		const surveyId = String(row.survey_id);
		const prev = submissionSummaryBySurvey.get(surveyId) ?? { count: 0, latestAt: null };
		prev.count += 1;
		if (!prev.latestAt || row.submitted_at > prev.latestAt) prev.latestAt = row.submitted_at;
		submissionSummaryBySurvey.set(surveyId, prev);
	}
	const now = Date.now();
	const visibleSurveys = (surveys ?? [])
		.map((survey: any) => {
			const from = survey.visible_from ? new Date(survey.visible_from).getTime() : null;
			const until = survey.visible_until ? new Date(survey.visible_until).getTime() : null;
			const inWindow = (from == null || now >= from) && (until == null || now <= until);
			const visible = (survey.is_active && inWindow) || survey.show_when_inactive;
			const prereqs = prereqBySurvey.get(String(survey.id)) ?? [];
			const missing = prereqs.filter((nodeId) => statusByNode.get(nodeId) !== 'completed');
			const maxSubmissions = Number(survey.max_submissions ?? 1);
			const summary = submissionSummaryBySurvey.get(String(survey.id));
			const submissionCount = summary?.count ?? 0;
			const alreadyCompletedTeamPlacement =
				String(survey.slug) === 'team-path-selection' && submissionCount > 0;
			return {
				id: String(survey.id),
				title: String(survey.title ?? 'Survey'),
				slug: String(survey.slug ?? ''),
				description: String(survey.description ?? ''),
				missingCount: missing.length,
				submittedAt: summary?.latestAt ?? null,
				canOpen: visible && missing.length === 0 && submissionCount < maxSubmissions,
				visible,
				showWhenInactive: Boolean(survey.show_when_inactive),
				alreadyCompletedTeamPlacement
			};
		})
		.filter(
			(survey) =>
				(survey.visible || survey.showWhenInactive) && !survey.alreadyCompletedTeamPlacement
		);

	return {
		formTypes: formTypes ?? [],
		submissions: submissions ?? [],
		surveys: visibleSurveys
	};
};

export const actions: Actions = {
	submitForm: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const formTypeId = String(form.get('form_type_id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const upload = form.get('file');
		if (!formTypeId) return fail(400, { error: 'Form type is required.' });
		if (!(upload instanceof File)) return fail(400, { error: 'Please upload a file.' });
		if (upload.size <= 0) return fail(400, { error: 'Please upload a non-empty file.' });
		if (upload.size > MAX_FILE_BYTES) return fail(400, { error: 'File too large (max 10MB).' });

		const { data: formType } = await locals.supabase
			.from('form_types')
			.select('id,allow_multiple,is_active')
			.eq('id', formTypeId)
			.maybeSingle();
		if (!formType || !formType.is_active) return fail(400, { error: 'Invalid form type.' });
		if (!formType.allow_multiple) {
			const { count } = await locals.supabase
				.from('form_submissions')
				.select('id', { count: 'exact', head: true })
				.eq('form_type_id', formTypeId)
				.eq('user_id', user.id);
			if ((count ?? 0) > 0) return fail(400, { error: 'This form only allows one submission.' });
		}

		const arrayBuffer = await upload.arrayBuffer();
		const dataUrl = `data:${upload.type || 'application/octet-stream'};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
		const { error } = await locals.supabase.from('form_submissions').insert({
			form_type_id: formTypeId,
			user_id: user.id,
			notes,
			file_name: upload.name || 'submission',
			file_mime: upload.type || 'application/octet-stream',
			file_data_url: dataUrl
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
