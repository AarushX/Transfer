import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'mine';
	const selectedTeamId = url.searchParams.get('team') ?? '';

	const [{ data }, { data: subteams }] = await Promise.all([
		locals.supabase
		.from('certifications')
		.select(
			'id,user_id,node_id,status,profiles!inner(id,email,full_name,subteam_id,subteams(name)),nodes!inner(id,title,slug,subteam_id,subteams(name))'
		)
		.eq('status', 'mentor_checkoff_pending'),
		locals.supabase.from('subteams').select('id,name,slug').order('name')
	]);

	let mentorTeamIds: string[] = [];
	if (user && profile && ['mentor', 'admin'].includes(profile.role)) {
		const { data: prefs } = await locals.supabase
			.from('mentor_subteam_preferences')
			.select('subteam_id')
			.eq('mentor_id', user.id);
		mentorTeamIds = (prefs ?? []).map((row: { subteam_id: string }) => row.subteam_id);
	}

	const baseQueue = (data ?? []).map((row: any) => ({
		id: row.id,
		user_id: row.user_id,
		node_id: row.node_id,
		status: row.status,
		profile: {
			...row.profiles,
			subteam: row.profiles?.subteams ? { name: row.profiles.subteams.name } : null
		},
		node: {
			...row.nodes,
			subteam: row.nodes?.subteams ? { name: row.nodes.subteams.name } : null
		}
	}));

	const nodeIds = Array.from(new Set(baseQueue.map((item: any) => item.node_id)));
	const userIds = Array.from(new Set(baseQueue.map((item: any) => item.user_id)));
	const [reqResp, submissionResp] = await Promise.all([
		nodeIds.length
			? locals.supabase
					.from('node_checkoff_requirements')
					.select('node_id,title,directions,mentor_checklist,resource_links,evidence_mode')
					.in('node_id', nodeIds)
			: Promise.resolve({ data: [] as any[] }),
		nodeIds.length && userIds.length
			? locals.supabase
					.from('checkoff_submissions')
					.select('user_id,node_id,notes,photo_data_url,updated_at')
					.in('node_id', nodeIds)
					.in('user_id', userIds)
			: Promise.resolve({ data: [] as any[] })
	]);

	const requirementByNode = new Map((reqResp.data ?? []).map((r: any) => [r.node_id, r]));
	const submissionByPair = new Map(
		(submissionResp.data ?? []).map((s: any) => [`${s.user_id}:${s.node_id}`, s])
	);

	let queue = baseQueue.map((item: any) => ({
		...item,
		requirement: requirementByNode.get(item.node_id) ?? null,
		submission: submissionByPair.get(`${item.user_id}:${item.node_id}`) ?? null
	}));

	const shouldFilterMine = scope === 'mine' && mentorTeamIds.length > 0;
	if (shouldFilterMine) {
		queue = queue.filter((item: any) => mentorTeamIds.includes(item.node?.subteam_id));
	}
	if (selectedTeamId) {
		queue = queue.filter((item: any) => item.node?.subteam_id === selectedTeamId);
	}

	return { queue, subteams: subteams ?? [], mentorTeamIds, scope, selectedTeamId };
};
