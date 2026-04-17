import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const ALLOWED = new Set(['student', 'student_lead', 'mentor', 'admin']);

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');
	const { data: users } = await locals.supabase
		.from('profiles')
		.select('id,full_name,email,role,subteam_id')
		.order('full_name');
	return { users: users ?? [] };
};

export const actions: Actions = {
	setRole: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '');
		const role = String(form.get('role') ?? '');
		if (!userId || !ALLOWED.has(role)) return fail(400, { error: 'Invalid role update.' });
		const { error } = await locals.supabase.from('profiles').update({ role }).eq('id', userId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
