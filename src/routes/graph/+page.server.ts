import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const [nodesResp, statusesResp, prereqResp] = await Promise.all([
		locals.supabase
			.from('nodes')
			.select('id,title,slug,subteam_id')
			.order('title', { ascending: true }),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id')
	]);

	return {
		profile,
		nodes: nodesResp.data ?? [],
		statuses: statusesResp.data ?? [],
		prerequisites: prereqResp.data ?? []
	};
};
