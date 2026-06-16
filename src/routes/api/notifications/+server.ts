import { json, type RequestHandler } from '@sveltejs/kit';

// List the current user's notifications. RLS scopes rows to the caller.
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20) || 20, 1), 100);
	const { data, error } = await locals.supabase
		.from('notifications')
		.select('id,type,title,body,href,read_at,created_at')
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) return json({ error: error.message }, { status: 400 });
	return json({ notifications: data ?? [] });
};

// Mark notifications read: { ids: string[] } or { all: true }.
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	let body: { ids?: unknown; all?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Malformed request body' }, { status: 400 });
	}
	const markAll = body.all === true;
	const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
	if (!markAll && ids.length === 0) {
		return json({ error: 'Provide ids or all: true' }, { status: 400 });
	}
	let query = locals.supabase
		.from('notifications')
		.update({ read_at: new Date().toISOString() })
		.is('read_at', null);
	if (!markAll) query = query.in('id', ids);
	const { error } = await query;
	if (error) return json({ error: error.message }, { status: 400 });
	return json({ ok: true });
};
