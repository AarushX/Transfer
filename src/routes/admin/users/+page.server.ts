import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !isAdmin(profile)) throw redirect(303, '/dashboard');

	const service = createSupabaseServiceClient();
	const [{ data: users }, { data: teamGroups }, { data: subteams }] = await Promise.all([
		service.from('profiles').select('id,full_name,email,role,base_role,is_mentor,is_lead,is_parent_guardian,lead_team_group_id,lead_subteam_id').order('full_name'),
		service.from('team_groups').select('id,name,designator').order('sort_order'),
		service.from('subteams').select('id,name').order('name')
	]);

	return {
		users: (users ?? []).filter((u: any) => !u.is_parent_guardian),
		teamGroups: teamGroups ?? [],
		subteams: subteams ?? []
	};
};

export const actions: Actions = {
	updateLeadership: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '').trim();
		const leadTeamGroupId = String(form.get('lead_team_group_id') ?? '').trim() || null;
		const leadSubteamId = String(form.get('lead_subteam_id') ?? '').trim() || null;
		const isLead = Boolean(leadTeamGroupId || leadSubteamId);

		if (!userId) return fail(400, { error: 'User ID required.' });

		const service = createSupabaseServiceClient();
		const { error } = await service.from('profiles').update({
			lead_team_group_id: leadTeamGroupId,
			lead_subteam_id: leadSubteamId,
			is_lead: isLead
		}).eq('id', userId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	toggleRole: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '').trim();
		const field = String(form.get('field') ?? '').trim();
		const value = form.get('value') === 'true';
		if (!userId || !['is_mentor', 'is_lead'].includes(field)) return fail(400, { error: 'Invalid request.' });

		const service = createSupabaseServiceClient();
		const updates: any = { [field]: value };
		const { error } = await service.from('profiles').update(updates).eq('id', userId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
