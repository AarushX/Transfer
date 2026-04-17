import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, url }) => {
	const { data, error } = await locals.supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${url.origin}/auth/callback`
		}
	});
	if (error) throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
	throw redirect(303, data.url);
};
