import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!profile || !['mentor', 'admin'].includes(profile.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { nodeId, userId, action, notes } = await request.json();
	if (!nodeId || !userId || !['approve', 'review'].includes(action)) {
		return json({ error: 'Invalid request payload' }, { status: 400 });
	}

	if (action === 'approve') {
		const [{ data: requirement }, { data: submission }] = await Promise.all([
			locals.supabase
				.from('node_checkoff_requirements')
				.select('evidence_mode')
				.eq('node_id', nodeId)
				.maybeSingle(),
			locals.supabase
				.from('checkoff_submissions')
				.select('photo_data_url')
				.eq('node_id', nodeId)
				.eq('user_id', userId)
				.maybeSingle()
		]);
		if (requirement?.evidence_mode === 'photo_required' && !submission?.photo_data_url) {
			return json(
				{ error: 'Photo evidence is required before this checkoff can be approved.' },
				{ status: 400 }
			);
		}
	}

	if (profile.role === 'mentor' && user) {
		const [{ data: node }, { data: prefs }] = await Promise.all([
			locals.supabase.from('nodes').select('subteam_id').eq('id', nodeId).maybeSingle(),
			locals.supabase
				.from('mentor_subteam_preferences')
				.select('subteam_id')
				.eq('mentor_id', user.id)
		]);
		const prefIds = (prefs ?? []).map((row: { subteam_id: string }) => row.subteam_id);
		if (prefIds.length > 0 && node?.subteam_id && !prefIds.includes(node.subteam_id)) {
			return json({ error: 'This checkoff is outside your selected mentor teams.' }, { status: 403 });
		}
	}

	const status = action === 'approve' ? 'completed' : 'quiz_pending';
	const { error } = await locals.supabase.rpc('transition_certification', {
		p_node_id: nodeId,
		p_new_status: status,
		p_target_user_id: userId,
		p_mentor_notes: notes ?? null
	});
	if (error) return json({ error: error.message }, { status: 400 });
	return json({ ok: true });
};
