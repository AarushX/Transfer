import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: teams } = await locals.supabase
		.from('teams')
		.select('id,name,team_groups(name,slug)')
		.order('name');
	const { data: nodes } = await locals.supabase
		.from('nodes')
		.select('id,title,slug')
		.order('title');
	return { teams: teams ?? [], nodes: nodes ?? [] };
};

export const actions: Actions = {
	createNode: async ({ locals, request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '');
		const slug = String(form.get('slug') ?? '');
		const teamIds = form
			.getAll('team_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const { data: node } = await locals.supabase
			.from('nodes')
			.insert({
				title,
				slug,
				video_url: '',
				subteam_id: null,
				description: String(form.get('description') ?? '')
			})
			.select('id')
			.single();
		if (node?.id) {
			if (teamIds.length > 0) {
				await locals.supabase.from('node_team_targets').insert(
					teamIds.map((teamId) => ({
						node_id: node.id,
						team_id: teamId
					}))
				);
			}
			await locals.supabase.from('node_checkoff_requirements').upsert(
				{
					node_id: node.id,
					title: 'Physical checkoff',
					directions: '',
					mentor_checklist: [],
					resource_links: [],
					evidence_mode: 'none'
				},
				{ onConflict: 'node_id' }
			);
		}
		return { ok: true };
	}
};
