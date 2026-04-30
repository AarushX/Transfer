import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const [{ data: teams }, { data: subteams }, { data: current }] = await Promise.all([
		locals.supabase.from('team_groups').select('id,name,slug,sort_order').order('sort_order'),
		locals.supabase.from('teams').select('id,name,slug,team_group_id,sort_order').order('sort_order'),
		locals.supabase
			.from('profile_teams')
			.select('team_group_id,team_id')
			.eq('user_id', user.id)
			.order('updated_at', { ascending: false })
			.limit(1)
	]);

	return {
		teams: teams ?? [],
		subteams: subteams ?? [],
		current: current?.[0] ?? null
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const teamId = String(form.get('team_id') ?? '').trim();
		if (!teamGroupId || !teamId) return fail(400, { error: 'Select a team and subteam.' });

		await locals.supabase.from('profile_teams').delete().eq('user_id', user.id);
		const { error } = await locals.supabase.from('profile_teams').insert({
			user_id: user.id,
			team_group_id: teamGroupId,
			team_id: teamId
		});
		if (error) return fail(400, { error: error.message });

		await locals.supabase.rpc('sync_profile_courseloads_for_user', { p_user_id: user.id });
		throw redirect(303, '/dashboard');
	}
};
