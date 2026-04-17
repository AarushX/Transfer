import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { nodeId } = await request.json();
	const { error } = await locals.supabase.rpc('transition_certification', {
		p_node_id: nodeId,
		p_new_status: 'quiz_pending',
		p_target_user_id: user.id
	});

	if (error) return json({ error: error.message }, { status: 400 });
	return json({ ok: true });
};
