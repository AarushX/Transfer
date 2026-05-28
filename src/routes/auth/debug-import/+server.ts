import { redirect, type RequestHandler } from '@sveltejs/kit';

// Debug-only: accept a base64(JSON) payload of Supabase session cookies and
// install them on the response, so the next page load sees the importer as
// the user the cookies belong to. Pairs with the `exportSession` action in
// /admin. Allowed unauthenticated on purpose (the whole point is to log
// yourself in) — the only thing being "trusted" here is the payload, and
// the payload's authenticity is enforced by Supabase the moment any
// subsequent request validates the JWT inside it. Setting a bogus payload
// just produces a broken session; you can't forge a valid one without
// already having the JWT.
//
// The cookie-name filter (only `sb-*-auth-token[.N]`) prevents this
// endpoint from being abused to set arbitrary cookies on the origin.

const SUPABASE_COOKIE_RE = /^sb-.+-auth-token(\.\d+)?$/;

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const form = await request.formData();
	const payload = String(form.get('payload') ?? '').trim();
	if (!payload) throw redirect(303, '/login?error=debug_empty');

	let parsed: unknown;
	try {
		const decoded = Buffer.from(payload, 'base64').toString('utf-8');
		parsed = JSON.parse(decoded);
	} catch {
		throw redirect(303, '/login?error=debug_decode');
	}
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw redirect(303, '/login?error=debug_shape');
	}

	const secure = url.protocol === 'https:';
	let count = 0;
	for (const entry of parsed as Array<{ name?: unknown; value?: unknown }>) {
		const name = typeof entry?.name === 'string' ? entry.name : '';
		const value = typeof entry?.value === 'string' ? entry.value : '';
		if (!name || !value || !SUPABASE_COOKIE_RE.test(name)) continue;
		cookies.set(name, value, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure,
			maxAge: 60 * 60 * 24 * 365
		});
		count += 1;
	}
	if (count === 0) throw redirect(303, '/login?error=debug_invalid');

	throw redirect(303, '/dashboard');
};
