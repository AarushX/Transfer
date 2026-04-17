import { json, type RequestHandler } from '@sveltejs/kit';

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const formData = await request.formData();
	const nodeId = String(formData.get('nodeId') ?? '');
	if (!nodeId) return json({ error: 'nodeId required' }, { status: 400 });

	const [{ data: assessment }, { data: cert }] = await Promise.all([
		locals.supabase
			.from('assessments')
			.select(
				'questions,passing_score,min_seconds_between_attempts,fail_window_minutes,max_failed_in_window,short_answer_min_chars,short_answer_max_chars'
			)
			.eq('node_id', nodeId)
			.single(),
		locals.supabase
			.from('certifications')
			.select('status')
			.eq('node_id', nodeId)
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	if (!assessment) return json({ error: 'Assessment missing' }, { status: 404 });
	if (!cert) return json({ error: 'Certification state missing for this module' }, { status: 400 });
	if (cert.status === 'completed') return json({ error: 'This module is already completed.' }, { status: 409 });
	if (cert.status === 'mentor_checkoff_pending')
		return json({ error: 'Quiz already passed. Awaiting mentor checkoff.' }, { status: 409 });
	if (cert.status !== 'quiz_pending') {
		return json({ error: 'Quiz is not unlocked yet. Complete the video first.' }, { status: 400 });
	}

	const minSecondsBetweenAttempts = clampInt(assessment.min_seconds_between_attempts, 15, 0, 3600);
	const failWindowMinutes = clampInt(assessment.fail_window_minutes, 10, 1, 1440);
	const maxFailedInWindow = clampInt(assessment.max_failed_in_window, 5, 1, 200);
	const shortAnswerMinChars = clampInt(assessment.short_answer_min_chars, 3, 0, 5000);
	const shortAnswerMaxChars = clampInt(assessment.short_answer_max_chars, 300, 1, 5000);

	const { data: recentAttempts } = await locals.supabase
		.from('quiz_attempts')
		.select('created_at,passed')
		.eq('user_id', user.id)
		.eq('node_id', nodeId)
		.order('created_at', { ascending: false })
		.limit(25);

	const now = Date.now();
	const newest = recentAttempts?.[0];
	if (newest?.created_at) {
		const secondsSince = Math.floor((now - new Date(newest.created_at).getTime()) / 1000);
		if (secondsSince < minSecondsBetweenAttempts) {
			const waitSeconds = minSecondsBetweenAttempts - secondsSince;
			return json(
				{ error: `Please wait ${waitSeconds}s before trying again.` },
				{ status: 429, headers: { 'retry-after': String(waitSeconds) } }
			);
		}
	}

	const failWindowStart = now - failWindowMinutes * 60 * 1000;
	const failedInWindow =
		recentAttempts?.filter(
			(a) => !a.passed && new Date(a.created_at).getTime() >= failWindowStart
		).length ?? 0;
	if (failedInWindow >= maxFailedInWindow) {
		return json(
			{
				error: `Too many failed attempts. Please wait ${failWindowMinutes} minutes and review the module before retrying.`
			},
			{ status: 429, headers: { 'retry-after': String(failWindowMinutes * 60) } }
		);
	}

	const questions = assessment.questions ?? [];
	const answers: Record<string, string> = {};
	let correct = 0;
	for (const question of questions) {
		const rawAnswer = String(formData.get(question.id) ?? '').trim();
		const answer = rawAnswer.toLowerCase();
		answers[question.id] = answer;

		if (question.type === 'mc') {
			const normalizedOptions = (question.options ?? [])
				.map((option: unknown) => String(option).trim().toLowerCase())
				.filter(Boolean);
			if (!normalizedOptions.includes(answer)) {
				return json({ error: 'Invalid multiple-choice answer submitted.' }, { status: 400 });
			}
		}
		if (question.type === 'tf' && !['true', 'false'].includes(answer)) {
			return json({ error: 'Invalid true/false answer submitted.' }, { status: 400 });
		}
		if (question.type === 'short') {
			if (rawAnswer.length < shortAnswerMinChars) {
				return json(
					{ error: `Short answers must be at least ${shortAnswerMinChars} characters.` },
					{ status: 400 }
				);
			}
			if (rawAnswer.length > shortAnswerMaxChars) {
				return json(
					{ error: `Short answers must be at most ${shortAnswerMaxChars} characters.` },
					{ status: 400 }
				);
			}
		}

		if (
			answer ===
			String(question.correct ?? '')
				.trim()
				.toLowerCase()
		)
			correct += 1;
	}
	const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
	const passed = score >= Number(assessment.passing_score ?? 80);

	await locals.supabase.from('quiz_attempts').insert({
		user_id: user.id,
		node_id: nodeId,
		answers,
		score,
		passed
	});

	if (passed) {
		await locals.supabase.rpc('transition_certification', {
			p_node_id: nodeId,
			p_new_status: 'mentor_checkoff_pending',
			p_target_user_id: user.id
		});
		await locals.supabase
			.from('certifications')
			.update({ quiz_passed_at: new Date().toISOString(), quiz_score: score })
			.eq('node_id', nodeId)
			.eq('user_id', user.id);
	}

	return json({ passed, score });
};
