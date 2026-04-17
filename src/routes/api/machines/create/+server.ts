import { json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !['mentor', 'admin'].includes(profile.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = await request.json().catch(() => null);
	const name = String(body?.name ?? '').trim();
	const description = String(body?.description ?? '').trim();
	const location = String(body?.location ?? '').trim();
	const requiredNodeIds = Array.isArray(body?.requiredNodeIds)
		? body.requiredNodeIds.map((v: unknown) => String(v)).filter(Boolean)
		: [];

	if (!name) return json({ error: 'Machine name is required.' }, { status: 400 });

	const qrToken = crypto.randomUUID();
	const { data, error } = await locals.supabase
		.from('machines')
		.insert({
			name,
			description,
			location,
			required_node_ids: requiredNodeIds,
			qr_token: qrToken
		})
		.select('id,name,description,location,required_node_ids,qr_token')
		.single();
	if (error) return json({ error: error.message }, { status: 400 });

	return json({ ok: true, machine: data });
};
