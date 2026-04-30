import { redirect, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ locals, request }) => {
	const form = await request.formData();
	const intent = String(form.get('intent') ?? 'login').trim();
	const email = String(form.get('email') ?? '').trim().toLowerCase();
	const password = String(form.get('password') ?? '');

	if (!email || !password) {
		throw redirect(303, '/login?error=missing_credentials');
	}

	if (intent === 'signup') {
		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password
		});
		if (error) throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
		if (data.user?.id) {
			const service = createSupabaseServiceClient();
			await service.from('profiles').update({ is_parent_guardian: true }).eq('id', data.user.id);
		}
		throw redirect(303, '/login?success=parent_signup');
	}

	const { error } = await locals.supabase.auth.signInWithPassword({
		email,
		password
	});
	if (error) throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);

	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) throw redirect(303, '/login?error=parent_only');

	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('is_parent_guardian')
		.eq('id', user.id)
		.maybeSingle();
	if (profileError || !profile?.is_parent_guardian) {
		await locals.supabase.auth.signOut();
		throw redirect(303, '/login?error=parent_only');
	}

	throw redirect(303, '/dashboard');
};
