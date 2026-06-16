import { redirect, type RequestHandler } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { isParentGuardian } from '$lib/roles';
import { CLICKUP_STATE_COOKIE } from '$lib/server/clickup';

// Start the ClickUp OAuth authorization-code flow. Form POST from /profile.
export const POST: RequestHandler = async ({ locals, url, cookies }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || isParentGuardian(profile)) {
		throw redirect(303, '/dashboard');
	}
	const clientId = privateEnv.CLICKUP_CLIENT_ID ?? '';
	if (!clientId) {
		throw redirect(303, '/profile?clickup=error&reason=not_configured');
	}
	const state = crypto.randomUUID();
	cookies.set(CLICKUP_STATE_COOKIE, state, {
		path: '/auth/clickup',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 10 * 60
	});
	const authorize = new URL('https://app.clickup.com/api');
	authorize.searchParams.set('client_id', clientId);
	authorize.searchParams.set('redirect_uri', `${url.origin}/auth/clickup/callback`);
	authorize.searchParams.set('state', state);
	throw redirect(303, authorize.toString());
};
