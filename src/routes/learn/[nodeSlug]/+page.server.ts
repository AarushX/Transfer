import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: node } = await locals.supabase
		.from('nodes')
		.select('id,title,description,video_url,physical_task')
		.eq('slug', params.nodeSlug)
		.single();

	if (!node) throw error(404, 'Module not found');

	const { data: assessment } = await locals.supabase
		.from('assessments')
		.select('questions')
		.eq('node_id', node.id)
		.single();

	const { data: cert } = await locals.supabase
		.from('certifications')
		.select('status')
		.eq('node_id', node.id)
		.eq('user_id', user.id)
		.single();

	return { node, questions: assessment?.questions ?? [], certStatus: cert?.status ?? 'locked' };
};
