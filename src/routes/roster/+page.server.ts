import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: profiles }, { data: certs }] = await Promise.all([
		locals.supabase.from('profiles').select('id,full_name,email,role,subteam_id'),
		locals.supabase
			.from('certifications')
			.select('user_id,status,node_id,quiz_score,quiz_passed_at,approved_at,nodes!inner(title,slug)')
			.not('status', 'eq', 'locked')
	]);

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
		const userCourses = (certs ?? [])
			.filter((c: any) => c.user_id === profile.id)
			.map((c: any) => ({
				node_id: c.node_id,
				title: c.nodes?.title,
				slug: c.nodes?.slug,
				status: c.status,
				quiz_score: c.quiz_score,
				quiz_passed_at: c.quiz_passed_at,
				approved_at: c.approved_at
			}))
			.sort((a: any, b: any) => {
				const aTs = a.approved_at || a.quiz_passed_at || '';
				const bTs = b.approved_at || b.quiz_passed_at || '';
				return String(bTs).localeCompare(String(aTs));
			});
		return {
			...profile,
			progressPercent: Math.round((agg.completed / total) * 100),
			pendingCheckoffs: agg.pending,
			courses: userCourses
		};
	});

	return {
		rows,
		bottlenecks: Array.from(bottlenecks.entries()).map(([node, count]) => ({ node, count }))
	};
};
