import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
	const code = url.searchParams.get('code');
	if (code) {
		await locals.supabase.auth.exchangeCodeForSession(code);
	}
	throw redirect(303, '/dashboard');
};
