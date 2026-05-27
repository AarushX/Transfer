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

	if (!primaryTeamGroupId) throw redirect(303, '/dashboard');

	const [
		{ data: teamGroup },
		{ data: subteamCategory },
		{ data: subteam },
		{ data: nodes },
		{ data: nodeStatuses },
		{ data: nodeTeamTargets },
		{ data: nodeTeamGroupTargets }
	] = await Promise.all([
		locals.supabase
			.from('team_groups')
			.select('id,name,slug,color_hex,designator')
			.eq('id', primaryTeamGroupId)
			.maybeSingle(),
		locals.supabase
			.from('subteam_categories')
			.select('slug,name')
			.eq('slug', subteamSlug)
			.maybeSingle(),
		locals.supabase.from('subteams').select('id,name,slug').eq('slug', subteamSlug).maybeSingle(),
		locals.supabase.from('nodes').select('id,title,slug,subteam_id,proficiency_level,code'),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id')
	]);

	if (!subteamCategory) throw error(404, 'Subteam not found');

	const userIsOnSubteam = (profileTeams ?? []).some(
		(r: any) => r.team_group_id === primaryTeamGroupId && r.category_slug === subteamSlug
	);

	const userTeamId = (profileTeams ?? []).find(
		(r: any) => r.team_group_id === primaryTeamGroupId && r.category_slug === subteamSlug
	)?.team_id;

	const statusByNode = new Map(
		(nodeStatuses ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)])
	);
	const teamTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamTargets ?? []) {
		const set = teamTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_id);
		teamTargetsByNode.set(row.node_id, set);
	}
	const groupTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamGroupTargets ?? []) {
		const set = groupTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_group_id);
		groupTargetsByNode.set(row.node_id, set);
	}

	// Required courses: anything targeted at this subteam (via node_team_targets),
	// at the whole team_group (via node_team_group_targets), OR the legacy
	// nodes.subteam_id pointing at this subteam. De-duped by node id.
	const courses = (nodes ?? [])
		.filter((n: any) => {
			if (userTeamId && (teamTargetsByNode.get(n.id) ?? new Set()).has(userTeamId)) return true;
			if (primaryTeamGroupId && (groupTargetsByNode.get(n.id) ?? new Set()).has(primaryTeamGroupId))
				return true;
			if (subteam?.id && n.subteam_id === subteam.id) return true;
			return false;
		})
		.map((n: any) => ({
			id: n.id,
			title: n.title,
			slug: n.slug,
			proficiency_level: n.proficiency_level ?? null,
			code: n.code ?? null,
			status: statusByNode.get(String(n.id)) ?? 'not_started'
		}));

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
	const canManageResources = isLeadOfSubteam || isLeadOfTeam || isAdmin(profile);
	const canViewRoster = canManageResources;

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

			const subteamNodeIds = courses.map((c) => String(c.id));
			if (subteamNodeIds.length > 0) {
				const { data: completionRows } = await service
					.from('certifications')
					.select('user_id,node_id')
					.in('user_id', ids)
					.in('node_id', subteamNodeIds)
					.eq('status', 'completed');
				const courseLevelById = new Map(
					courses.map((c) => [String(c.id), c.proficiency_level as string | null])
				);
				const rank = (l: string | null | undefined) =>
					l === 'advanced' ? 3 : l === 'intermediate' ? 2 : l === 'beginner' ? 1 : 0;
				const memberLevel = new Map<string, string | null>();
				for (const row of completionRows ?? []) {
					const level = courseLevelById.get(String(row.node_id)) ?? null;
					if (!level) continue;
					const prev = memberLevel.get(String(row.user_id)) ?? null;
					if (rank(level) > rank(prev)) memberLevel.set(String(row.user_id), level);
				}
				roster = roster.map((m: any) => ({
					...m,
					proficiency_level: memberLevel.get(String(m.id)) ?? null
				}));
			}
		}
	}

	const counts = { done: 0, current: 0, awaiting: 0, blocked: 0, locked: 0 };
	for (const c of courses) {
		const s = c.status;
		if (s === 'completed') counts.done++;
		else if (['in_progress', 'video_pending', 'quiz_pending'].includes(s)) counts.current++;
		else if (['mentor_checkoff_pending', 'awaiting_checkoff'].includes(s)) counts.awaiting++;
		else if (['checkoff_needs_review', 'checkoff_blocked'].includes(s)) counts.blocked++;
		else counts.locked++;
	}

	const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
	const courseIds = courses.map((c) => c.id);
	let recentCompletions = 0;
	if (courseIds.length > 0) {
		const { count } = await locals.supabase
			.from('certifications')
			.select('id', { count: 'exact', head: true })
			.in('node_id', courseIds)
			.eq('status', 'completed')
			.gte('approved_at', sevenDaysAgo);
		recentCompletions = count ?? 0;
	}

	const [{ data: graphNodes }, { data: graphPrereqs }] = await Promise.all([
		locals.supabase.from('nodes').select('id,title,slug'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id')
	]);

	const scopeNodeIds = courses.map((c) => String(c.id));
	const userStatuses = courses.map((c) => ({ node_id: String(c.id), computed_status: c.status }));

	// Pinboard resources for this specific subteam (matched by team_id).
	let resources: any[] = [];
	if (userTeamId) {
		const { data: resourceRows } = await locals.supabase
			.from('subteam_resources')
			.select('id,team_id,title,url,description,image_url,position,created_at')
			.eq('team_id', userTeamId)
			.order('position', { ascending: true });
		resources = resourceRows ?? [];
	}

	return {
		teamGroup,
		subteamCategory,
		subteam,
		userTeamId: userTeamId ?? null,
		userIsOnSubteam,
		courses,
		canManageResources,
		canViewRoster,
		roster,
		statusCounts: counts,
		recentCompletions,
		graphNodes: (graphNodes ?? []).map((n: any) => ({
			id: String(n.id),
			title: n.title,
			slug: n.slug
		})),
		graphPrereqs: (graphPrereqs ?? []).map((r: any) => ({
			node_id: String(r.node_id),
			prerequisite_node_id: String(r.prerequisite_node_id)
		})),
		scopeNodeIds,
		userStatuses,
		resources
	};
};

// Accepts shorthand like "test.com" / "team.org/path" and rewrites it as a
// fully-qualified https URL. Leaves anything that already has a scheme alone
// (http://, https://, mailto:, tel:, …). Empty input returns empty string.
function normalizeUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

export const actions: Actions = {
	createResource: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized', section: 'resource' });
		const form = await request.formData();
		const teamId = String(form.get('team_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const url = normalizeUrl(String(form.get('url') ?? ''));
		const description = String(form.get('description') ?? '').trim();
		const imageUrl = normalizeUrl(String(form.get('image_url') ?? ''));
		if (!teamId || !title || !url)
			return fail(400, { error: 'Title and URL are required.', section: 'resource' });

		const { data: maxRow } = await locals.supabase
			.from('subteam_resources')
			.select('position')
			.eq('team_id', teamId)
			.order('position', { ascending: false })
			.limit(1)
			.maybeSingle();
		const nextPosition = (maxRow?.position ?? 0) + 10;

		const { error: err } = await locals.supabase.from('subteam_resources').insert({
			team_id: teamId,
			title,
			url,
			description,
			image_url: imageUrl || null,
			position: nextPosition,
			created_by: user.id
		});
		if (err) return fail(400, { error: err.message, section: 'resource' });
		return { ok: true, section: 'resource' };
	},

	updateResource: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized', section: 'resource' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing resource id.', section: 'resource' });
		const update: Record<string, any> = {
			title: String(form.get('title') ?? '').trim(),
			url: normalizeUrl(String(form.get('url') ?? '')),
			description: String(form.get('description') ?? '').trim(),
			image_url: normalizeUrl(String(form.get('image_url') ?? '')) || null,
			updated_at: new Date().toISOString()
		};
		const { error: err } = await locals.supabase
			.from('subteam_resources')
			.update(update)
			.eq('id', id);
		if (err) return fail(400, { error: err.message, section: 'resource' });
		return { ok: true, section: 'resource' };
	},

	deleteResource: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized', section: 'resource' });
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing resource id.', section: 'resource' });
		const { error: err } = await locals.supabase.from('subteam_resources').delete().eq('id', id);
		if (err) return fail(400, { error: err.message, section: 'resource' });
		return { ok: true, section: 'resource' };
	}
};
