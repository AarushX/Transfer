import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const formData = await request.formData();
	const nodeId = String(formData.get('nodeId') ?? '');
	if (!nodeId) return json({ error: 'nodeId required' }, { status: 400 });

	const { data: assessment } = await locals.supabase
		.from('assessments')
		.select('questions,passing_score')
		.eq('node_id', nodeId)
		.single();
	if (!assessment) return json({ error: 'Assessment missing' }, { status: 404 });

	const questions = assessment.questions ?? [];
	const answers: Record<string, string> = {};
	let correct = 0;
	for (const question of questions) {
		const answer = String(formData.get(question.id) ?? '')
			.trim()
			.toLowerCase();
		answers[question.id] = answer;
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
