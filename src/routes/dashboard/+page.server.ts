import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const [nodesResp, statusesResp, subteamsResp] = await Promise.all([
		locals.supabase
			.from('nodes')
			.select('id,title,slug,tier,ordering,subteam_id')
			.order('tier', { ascending: true })
			.order('ordering', { ascending: true }),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('subteams').select('id,name,slug').order('name')
	]);

	return {
		profile,
		nodes: nodesResp.data ?? [],
		statuses: statusesResp.data ?? [],
		subteams: subteamsResp.data ?? []
	};
};
