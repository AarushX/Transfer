import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data: subteams } = await locals.supabase.from('subteams').select('id,name').order('name');
	const { data: nodes } = await locals.supabase
		.from('nodes')
		.select('id,title,slug,subteam_id')
		.order('tier')
		.order('ordering');
	return { subteams: subteams ?? [], nodes: nodes ?? [] };
};

export const actions: Actions = {
	createNode: async ({ locals, request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '');
		const slug = String(form.get('slug') ?? '');
		const videoUrl = String(form.get('video_url') ?? '');
		const subteamId = String(form.get('subteam_id') ?? '');
		await locals.supabase.from('nodes').insert({
			title,
			slug,
			video_url: videoUrl,
			subteam_id: subteamId,
			description: String(form.get('description') ?? ''),
			tier: Number(form.get('tier') ?? 1),
			ordering: Number(form.get('ordering') ?? 0),
			physical_task: String(form.get('physical_task') ?? '')
		});
		return { ok: true };
	}
};
