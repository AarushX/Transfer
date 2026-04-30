import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const normalizeQuestions = (input: unknown) => {
	const rawList = Array.isArray(input) ? input : [];
	const normalized: any[] = [];
	for (let i = 0; i < rawList.length; i += 1) {
		const q = (rawList[i] ?? {}) as Record<string, unknown>;
		const type = String(q.type ?? 'short');
		const id = String(q.id ?? `q${i + 1}`).trim() || `q${i + 1}`;
		const prompt = String(q.prompt ?? '').trim();
		if (!prompt) return { error: `Question ${i + 1} prompt is required.` };
		if (type === 'mc' || type === 'ms') {
			const options = Array.from(
				new Set(
					(Array.isArray(q.options) ? q.options : [])
						.map((v) => String(v ?? '').trim())
						.filter(Boolean)
				)
			);
			if (options.length < 2) return { error: `Question ${i + 1} needs at least 2 options.` };
			if (type === 'mc') {
				const correct = String(q.correct ?? '').trim();
				if (!correct || !options.includes(correct))
					return { error: `Question ${i + 1} must select one correct option.` };
				normalized.push({ id, prompt, type, options, correct, randomize_options: Boolean(q.randomize_options) });
			} else {
				const correct = Array.isArray(q.correct)
					? q.correct.map((v) => String(v ?? '').trim()).filter((v) => options.includes(v))
					: [];
				if (correct.length === 0)
					return { error: `Question ${i + 1} must select at least one correct option.` };
				const maxSelectRaw = Number(q.max_select);
				const maxSelect =
					Number.isFinite(maxSelectRaw) && maxSelectRaw > 0
						? Math.min(Math.trunc(maxSelectRaw), options.length)
						: null;
				if (maxSelect != null && correct.length > maxSelect) {
					return { error: `Question ${i + 1} has more correct answers than max selections.` };
				}
				normalized.push({
					id,
					prompt,
					type,
					options,
					correct: Array.from(new Set(correct)),
					max_select: maxSelect ?? undefined,
					randomize_options: Boolean(q.randomize_options)
				});
			}
			continue;
		}
		if (type === 'tf') {
			normalized.push({ id, prompt, type, correct: String(q.correct ?? '').toLowerCase() === 'false' ? 'false' : 'true' });
			continue;
		}
		normalized.push({
			id,
			prompt,
			type: 'short',
			correct: String(q.correct ?? '').trim(),
			short_ignore_case: q.short_ignore_case == null ? true : Boolean(q.short_ignore_case),
			short_ignore_punctuation: Boolean(q.short_ignore_punctuation)
		});
	}
	return { questions: normalized };
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const [{ data: survey }, { data: nodes }] = await Promise.all([
		locals.supabase.from('surveys').select('*').eq('slug', params.slug).maybeSingle(),
		locals.supabase.from('nodes').select('id,title').order('title')
	]);
	if (!survey) throw error(404, 'Survey not found');
	const [{ data: prereqs }, { data: submissions }] = await Promise.all([
		locals.supabase.from('survey_prerequisites').select('node_id').eq('survey_id', survey.id),
		locals.supabase
			.from('survey_submissions')
			.select('id,user_id,answers,submitted_at')
			.eq('survey_id', survey.id)
			.order('submitted_at', { ascending: false })
	]);
	const profileIds = Array.from(new Set((submissions ?? []).map((row: any) => String(row.user_id))));
	const { data: profiles } = profileIds.length
		? await locals.supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
		: { data: [] as any[] };
	const profileById = new Map((profiles ?? []).map((row: any) => [String(row.id), row]));
	return {
		survey,
		nodes: nodes ?? [],
		prereqIds: (prereqs ?? []).map((row: any) => String(row.node_id)),
		submissions: (submissions ?? []).map((row: any) => ({
			...row,
			profile: profileById.get(String(row.user_id)) ?? null
		}))
	};
};

export const actions: Actions = {
	saveSurvey: async ({ locals, request, params }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const questionsRaw = String(form.get('questions_json') ?? '[]').trim();
		const isActive = String(form.get('is_active') ?? '') === 'on';
		const showWhenInactive = String(form.get('show_when_inactive') ?? '') === 'on';
		const visibleFromRaw = String(form.get('visible_from') ?? '').trim();
		const visibleUntilRaw = String(form.get('visible_until') ?? '').trim();
		const maxSubmissionsRaw = Number(form.get('max_submissions') ?? '1');
		const maxSubmissions =
			Number.isFinite(maxSubmissionsRaw) && maxSubmissionsRaw >= 1 ? Math.trunc(maxSubmissionsRaw) : 1;
		const prereqIds = form
			.getAll('prereq_node_ids')
			.map((v) => String(v))
			.filter(Boolean);

		let questions: unknown;
		try {
			questions = JSON.parse(questionsRaw || '[]');
		} catch {
			return fail(400, { error: 'Questions JSON must be valid JSON.' });
		}
		if (!Array.isArray(questions)) return fail(400, { error: 'Questions JSON must be an array.' });
		const normalized = normalizeQuestions(questions);
		if ('error' in normalized) return fail(400, { error: normalized.error });

		const { data: survey, error: surveyErr } = await locals.supabase
			.from('surveys')
			.update({
				title,
				description,
				questions: normalized.questions,
				is_active: isActive,
				show_when_inactive: showWhenInactive,
				visible_from: visibleFromRaw || null,
				visible_until: visibleUntilRaw || null,
				max_submissions: maxSubmissions
			})
			.eq('slug', params.slug)
			.select('id')
			.single();
		if (surveyErr || !survey) return fail(400, { error: surveyErr?.message ?? 'Could not save survey.' });

		const { error: deleteErr } = await locals.supabase
			.from('survey_prerequisites')
			.delete()
			.eq('survey_id', survey.id);
		if (deleteErr) return fail(400, { error: deleteErr.message });
		if (prereqIds.length > 0) {
			const { error: insertErr } = await locals.supabase.from('survey_prerequisites').insert(
				prereqIds.map((nodeId) => ({
					survey_id: survey.id,
					node_id: nodeId
				}))
			);
			if (insertErr) return fail(400, { error: insertErr.message });
		}

		return { ok: true };
	},
	deleteSurvey: async ({ locals, params }) => {
		const { error: deleteErr } = await locals.supabase.from('surveys').delete().eq('slug', params.slug);
		if (deleteErr) return fail(400, { error: deleteErr.message });
		throw redirect(303, '/mentor/surveys');
	}
};
