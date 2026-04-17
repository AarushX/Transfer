import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !['mentor', 'admin'].includes(profile.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { nodeId, userId, action, notes } = await request.json();
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
