import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const load: PageServerLoad = async ({ locals, url }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');

	const [{ data: teamGroups }, { data: subteams }, { data: nodes }, { data: groupTargets }, { data: subteamTargets }] =
		await Promise.all([
			locals.supabase.from('team_groups').select('id,name,slug,sort_order').order('sort_order'),
			locals.supabase.from('teams').select('id,name,slug,team_group_id,sort_order').order('sort_order'),
			locals.supabase.from('nodes').select('id,title,slug').order('title'),
			locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
			locals.supabase.from('node_team_targets').select('node_id,team_id')
		]);

	return {
		teamGroups: teamGroups ?? [],
		subteams: subteams ?? [],
		nodes: nodes ?? [],
		groupTargets: groupTargets ?? [],
		subteamTargets: subteamTargets ?? []
	};
};

export const actions: Actions = {
	createTeam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('team_name') ?? '').trim();
		const slugInput = String(form.get('team_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		if (!name || !slug) return fail(400, { error: 'Team name is required.' });
		const { error } = await locals.supabase.from('team_groups').insert({
			name,
			slug,
			sort_order: Number(form.get('team_sort_order') ?? 0) || 0
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'team' };
	},
	createSubteam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const name = String(form.get('subteam_name') ?? '').trim();
		const slugInput = String(form.get('subteam_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		if (!teamGroupId || !name || !slug) return fail(400, { error: 'Team and subteam name are required.' });
		const { error } = await locals.supabase.from('teams').insert({
			team_group_id: teamGroupId,
			name,
			slug,
			sort_order: Number(form.get('subteam_sort_order') ?? 0) || 0
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'subteam' };
	},
	saveTeamCourses: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		if (!teamGroupId) return fail(400, { error: 'Team is required.' });
		const nodeIds = form
			.getAll('node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		await locals.supabase.from('node_team_group_targets').delete().eq('team_group_id', teamGroupId);
		if (nodeIds.length > 0) {
			const { error } = await locals.supabase.from('node_team_group_targets').insert(
				nodeIds.map((nodeId) => ({ team_group_id: teamGroupId, node_id: nodeId }))
			);
			if (error) return fail(400, { error: error.message });
		}
		return { ok: true, section: 'team-courses' };
	},
	saveSubteamCourses: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const subteamId = String(form.get('subteam_id') ?? '').trim();
		if (!subteamId) return fail(400, { error: 'Subteam is required.' });
		const nodeIds = form
			.getAll('node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		await locals.supabase.from('node_team_targets').delete().eq('team_id', subteamId);
		if (nodeIds.length > 0) {
			const { error } = await locals.supabase.from('node_team_targets').insert(
				nodeIds.map((nodeId) => ({ team_id: subteamId, node_id: nodeId }))
			);
			if (error) return fail(400, { error: error.message });
		}
		return { ok: true, section: 'subteam-courses' };
	}
};
