import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isAdmin(profile)) throw redirect(303, '/dashboard');

	const { data } = await locals.supabase
		.from('audit_log')
		.select('id,action,metadata,created_at,actor_id,target_user_id,target_node_id')
		.order('created_at', { ascending: false })
		.limit(200);
	return { rows: data ?? [] };
};
