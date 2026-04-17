import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id,full_name,email,role,subteam_id');
	const { data: certs } = await locals.supabase
		.from('certifications')
		.select('user_id,status,node_id,nodes!inner(title)')
		.in('status', ['mentor_checkoff_pending', 'completed']);

	const byUser = new Map<string, { completed: number; pending: number }>();
	const bottlenecks = new Map<string, number>();
	for (const cert of certs ?? []) {
		const agg = byUser.get(cert.user_id) ?? { completed: 0, pending: 0 };
		if (cert.status === 'completed') agg.completed += 1;
		if (cert.status === 'mentor_checkoff_pending') {
			agg.pending += 1;
			const title = (cert as any).nodes?.title ?? 'Unknown module';
			bottlenecks.set(title, (bottlenecks.get(title) ?? 0) + 1);
		}
		byUser.set(cert.user_id, agg);
	}

	const rows = (profiles ?? []).map((profile) => {
		const agg = byUser.get(profile.id) ?? { completed: 0, pending: 0 };
		const total = Math.max(agg.completed + agg.pending, 1);
		return {
			...profile,
			progressPercent: Math.round((agg.completed / total) * 100),
			pendingCheckoffs: agg.pending
		};
	});

	return {
		rows,
		bottlenecks: Array.from(bottlenecks.entries()).map(([node, count]) => ({ node, count }))
	};
};
