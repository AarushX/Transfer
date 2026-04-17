import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: node } = await locals.supabase
		.from('nodes')
		.select('id,title,description,video_url,physical_task,subteam_id')
		.eq('slug', params.nodeSlug)
		.single();

	if (!node) throw error(404, 'Module not found');

	const [{ data: assessment }, { data: cert }, { data: statusRow }] = await Promise.all([
		locals.supabase
			.from('assessments')
			.select('questions,passing_score')
			.eq('node_id', node.id)
			.maybeSingle(),
		locals.supabase
			.from('certifications')
			.select('status,quiz_score,quiz_passed_at,approved_at')
			.eq('node_id', node.id)
			.eq('user_id', user.id)
			.maybeSingle(),
		locals.supabase
			.from('v_user_node_status')
			.select('computed_status')
			.eq('node_id', node.id)
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	return {
		node,
		questions: assessment?.questions ?? [],
		passingScore: assessment?.passing_score ?? 80,
		certStatus: statusRow?.computed_status ?? cert?.status ?? 'locked',
		cert: cert ?? null
	};
};
