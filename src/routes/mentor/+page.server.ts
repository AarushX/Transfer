import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data } = await locals.supabase
		.from('certifications')
		.select(
			'id,user_id,node_id,status,profiles!inner(id,email,full_name),nodes!inner(id,title,physical_task)'
		)
		.eq('status', 'mentor_checkoff_pending');

	const queue = (data ?? []).map((row: any) => ({
		id: row.id,
		user_id: row.user_id,
		node_id: row.node_id,
		status: row.status,
		profile: row.profiles,
		node: row.nodes
	}));
	return { queue };
};
