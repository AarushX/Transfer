import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data } = await locals.supabase
		.from('audit_log')
		.select('id,action,metadata,created_at,actor_id,target_user_id,target_node_id')
		.order('created_at', { ascending: false })
		.limit(200);
	return { rows: data ?? [] };
};
