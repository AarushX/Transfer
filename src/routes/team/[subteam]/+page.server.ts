import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const subteamSlug = params.subteam;

	const { data: primaryRow } = await locals.supabase
		.from('profile_primary_teams')
		.select('team_group_id')
		.eq('user_id', user.id)
		.maybeSingle();

	const { data: profileTeams } = await locals.supabase
		.from('profile_teams')
		.select('team_id,team_group_id,category_slug')
		.eq('user_id', user.id);

	const primaryTeamGroupId =
		primaryRow?.team_group_id ?? (profileTeams ?? [])[0]?.team_group_id ?? null;

	if (!primaryTeamGroupId) throw redirect(303, '/team');

	const [
		{ data: teamGroup },
		{ data: subteamCategory },
		{ data: subteam },
		{ data: nodes },
		{ data: nodeStatuses },
		{ data: nodeTeamTargets },
		{ data: nodeTeamGroupTargets },
		{ data: notesRow }
	] = await Promise.all([
		locals.supabase.from('team_groups').select('id,name,slug,color_hex,designator').eq('id', primaryTeamGroupId).maybeSingle(),
		locals.supabase.from('subteam_categories').select('slug,name').eq('slug', subteamSlug).maybeSingle(),
		locals.supabase.from('subteams').select('id,name,slug').eq('slug', subteamSlug).maybeSingle(),
		locals.supabase.from('nodes').select('id,title,slug,subteam_id'),
		locals.supabase.from('v_user_node_status').select('node_id,computed_status').eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('team_notes').select('body').eq('team_group_id', primaryTeamGroupId).eq('subteam_category_slug', subteamSlug).maybeSingle()
	]);

	if (!subteamCategory) throw error(404, 'Subteam not found');

	const userIsOnSubteam = (profileTeams ?? []).some(
		(r: any) => r.team_group_id === primaryTeamGroupId && r.category_slug === subteamSlug
	);

	// Find the team_id for this (team_group, category) combo
	const userTeamId = (profileTeams ?? []).find(
		(r: any) => r.team_group_id === primaryTeamGroupId && r.category_slug === subteamSlug
	)?.team_id;

	// Courses: those targeting this specific team_id, OR the team_group AND matching the subteam_id
	const statusByNode = new Map((nodeStatuses ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)]));
	const teamTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamTargets ?? []) {
		const set = teamTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_id);
		teamTargetsByNode.set(row.node_id, set);
	}

	const courses = (nodes ?? [])
		.filter((n: any) => {
			if (userTeamId && (teamTargetsByNode.get(n.id) ?? new Set()).has(userTeamId)) return true;
			if (subteam?.id && n.subteam_id === subteam.id) return true;
			return false;
		})
		.map((n: any) => ({
			id: n.id,
			title: n.title,
			slug: n.slug,
			status: statusByNode.get(String(n.id)) ?? 'not_started'
		}));

	// Permission: subteam lead matching this subteam, or team lead of the team_group, or admin
	let isLeadOfSubteam = false;
	let isLeadOfTeam = false;
	try {
		const { data: leadFields } = await locals.supabase
			.from('profiles')
			.select('lead_subteam_id,lead_team_group_id')
			.eq('id', user.id)
			.maybeSingle();
		isLeadOfSubteam = (leadFields as any)?.lead_subteam_id === subteam?.id;
		isLeadOfTeam = (leadFields as any)?.lead_team_group_id === primaryTeamGroupId;
	} catch {
		// migration not applied
	}
	const canEditNotes = isLeadOfSubteam || isLeadOfTeam || isAdmin(profile);
	const canViewRoster = canEditNotes;

	let roster: any[] = [];
	if (canViewRoster) {
		const service = createSupabaseServiceClient();
		const { data: ptRows } = await service
			.from('profile_teams')
			.select('user_id')
			.eq('team_group_id', primaryTeamGroupId)
			.eq('category_slug', subteamSlug);
		const ids = Array.from(new Set((ptRows ?? []).map((r: any) => r.user_id)));
		if (ids.length > 0) {
			const { data: profiles } = await service
				.from('profiles')
				.select('id,full_name,email,is_mentor,is_lead,role,base_role')
				.in('id', ids);
			roster = profiles ?? [];
		}
	}

	return {
		teamGroup,
		subteamCategory,
		subteam,
		userIsOnSubteam,
		courses,
		notes: (notesRow as any)?.body ?? '',
		canEditNotes,
		canViewRoster,
		roster
	};
};

export const actions: Actions = {
	saveNotes: async ({ locals, request, params }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const body = String(form.get('body') ?? '');
		const subteamSlug = params.subteam;

		const service = createSupabaseServiceClient();
		const { data: subteam } = await service.from('subteams').select('id').eq('slug', subteamSlug).maybeSingle();
		const { data: leadFields } = await service
			.from('profiles')
			.select('lead_team_group_id,lead_subteam_id')
			.eq('id', user.id)
			.maybeSingle();
		const lf = leadFields as any;
		const allowed =
			lf?.lead_team_group_id === teamGroupId ||
			(subteam?.id && lf?.lead_subteam_id === subteam.id) ||
			isAdmin(profile);
		if (!allowed) return fail(403, { error: 'Only leads can edit notes.' });

		const { error: err } = await service.from('team_notes').upsert({
			team_group_id: teamGroupId,
			subteam_category_slug: subteamSlug,
			body,
			updated_by: user.id,
			updated_at: new Date().toISOString()
		}, { onConflict: 'team_group_id,subteam_category_slug' });
		if (err) return fail(400, { error: err.message });
		return { ok: true };
	}
};
