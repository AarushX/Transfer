import { redirect, type RequestHandler } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { resolveAvatarUrl } from '$lib/avatar-resolution';
import { CLICKUP_STATE_COOKIE } from '$lib/server/clickup';

const fail = (reason: string): never => {
	throw redirect(303, `/profile?clickup=error&reason=${encodeURIComponent(reason)}`);
};

// ClickUp redirects here with ?code=...&state=... after the user authorizes.
// We exchange the code, snapshot the user's id + profile picture, and discard
// the token — re-sync is just re-running the link flow.
export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	const expectedState = cookies.get(CLICKUP_STATE_COOKIE) ?? '';
	cookies.delete(CLICKUP_STATE_COOKIE, { path: '/auth/clickup' });
	if (!code) fail('missing_code');
	if (!expectedState || state !== expectedState) fail('state_mismatch');

	const clientId = privateEnv.CLICKUP_CLIENT_ID ?? '';
	const clientSecret = privateEnv.CLICKUP_CLIENT_SECRET ?? '';
	if (!clientId || !clientSecret) fail('not_configured');

	let accessToken = '';
	try {
		const tokenResp = await fetch('https://api.clickup.com/api/v2/oauth/token', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
		});
		if (!tokenResp.ok) fail('token_exchange_failed');
		const tokenPayload = await tokenResp.json();
		accessToken = String(tokenPayload?.access_token ?? '');
	} catch {
		fail('token_exchange_failed');
	}
	if (!accessToken) fail('token_exchange_failed');

	let clickupUserId = '';
	let clickupAvatarUrl = '';
	try {
		const userResp = await fetch('https://api.clickup.com/api/v2/user', {
			headers: { Authorization: accessToken }
		});
		if (!userResp.ok) fail('user_fetch_failed');
		const payload = await userResp.json();
		const cuUser = payload?.user ?? {};
		clickupUserId = String(cuUser?.id ?? '');
		// ClickUp has used both spellings across API versions; accept either.
		clickupAvatarUrl = String(cuUser?.profilePicture ?? cuUser?.profile_picture ?? '');
	} catch {
		fail('user_fetch_failed');
	}
	if (!clickupUserId) fail('user_fetch_failed');

	const { data: current } = await locals.supabase
		.from('profiles')
		.select('uploaded_avatar_path')
		.eq('id', user.id)
		.maybeSingle();
	const uploadedPath = String(current?.uploaded_avatar_path ?? '');
	const uploadedPublicUrl = uploadedPath
		? locals.supabase.storage.from('avatars').getPublicUrl(uploadedPath).data.publicUrl
		: '';

	const { error } = await locals.supabase
		.from('profiles')
		.update({
			clickup_user_id: clickupUserId,
			clickup_avatar_url: clickupAvatarUrl || null,
			avatar_url: resolveAvatarUrl(clickupAvatarUrl, uploadedPublicUrl)
		})
		.eq('id', user.id);
	if (error) fail('profile_update_failed');

	throw redirect(303, '/profile?clickup=linked');
};
