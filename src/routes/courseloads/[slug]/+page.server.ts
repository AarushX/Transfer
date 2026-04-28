import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const { data: courseload } = await locals.supabase
		.from('courseloads')
		.select('id,slug,title,description,eligibility')
		.eq('slug', params.slug)
		.maybeSingle();

	if (!courseload) throw error(404, 'Courseload not found');

	const { data: rows } = await locals.supabase
		.from('courseload_courses')
		.select('sort_order,required,nodes(id,title,slug)')
		.eq('courseload_id', courseload.id)
		.order('sort_order', { ascending: true });

	const nodeIds = (rows ?? []).map((r: any) => String(r.nodes?.id)).filter(Boolean);

	let statuses: { node_id: string; computed_status: string }[] = [];
	if (nodeIds.length > 0) {
		const { data } = await locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id)
			.in('node_id', nodeIds);
		statuses = (data ?? []) as { node_id: string; computed_status: string }[];
	}

	const statusByNode = new Map(statuses.map((r) => [String(r.node_id), String(r.computed_status)]));

	const courses = (rows ?? []).map((r: any) => {
		const n = r.nodes;
		const id = String(n?.id ?? '');
		return {
			title: String(n?.title ?? ''),
			slug: String(n?.slug ?? ''),
			status: statusByNode.get(id) ?? 'locked',
			required: Boolean(r.required),
			sortOrder: Number(r.sort_order ?? 0)
		};
	});

	return {
		courseload,
		courses
	};
};
