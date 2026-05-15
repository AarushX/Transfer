import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	// 1. Find the user's primary team_group (canonical source). Fall back to first profile_teams row.
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

	if (!primaryTeamGroupId) {
		return {
			teamGroup: null,
			subteams: [],
			courses: [],
			notes: '',
			canEditNotes: false,
			isLeadOfTeam: false,
			roster: []
		};
	}

	const [
		{ data: teamGroup },
		{ data: subteamCategories },
		{ data: nodes },
		{ data: nodeStatuses },
		{ data: nodeTeamTargets },
		{ data: nodeTeamGroupTargets },
		{ data: notesRow }
	] = await Promise.all([
		locals.supabase.from('team_groups').select('id,name,slug,color_hex,designator').eq('id', primaryTeamGroupId).maybeSingle(),
		locals.supabase
			.from('subteam_categories')
			.select('slug,name,sort_order')
			.order('sort_order'),
		locals.supabase.from('nodes').select('id,title,slug,subteam_id'),
		locals.supabase.from('v_user_node_status').select('node_id,computed_status').eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('team_notes').select('body,updated_at,updated_by').eq('team_group_id', primaryTeamGroupId).eq('subteam_category_slug', '').maybeSingle()
	]);

	// Determine which subteams the user is on within this team_group
	const userCategorySlugs = new Set(
		(profileTeams ?? [])
			.filter((row: any) => row.team_group_id === primaryTeamGroupId)
			.map((row: any) => row.category_slug)
			.filter(Boolean)
	);
	const userSubteams = (subteamCategories ?? []).filter((c: any) => userCategorySlugs.has(c.slug));

	// Build course list for this team_group (any node targeting the team_group OR any team within it)
	const statusByNode = new Map((nodeStatuses ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)]));
	const tgTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamGroupTargets ?? []) {
		const set = tgTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_group_id);
		tgTargetsByNode.set(row.node_id, set);
	}

	const userTeamIds = new Set(
		(profileTeams ?? []).filter((r: any) => r.team_group_id === primaryTeamGroupId).map((r: any) => r.team_id).filter(Boolean)
	);
	const teamTargetsByNode = new Map<string, Set<string>>();
	for (const row of nodeTeamTargets ?? []) {
		const set = teamTargetsByNode.get(row.node_id) ?? new Set<string>();
		set.add(row.team_id);
		teamTargetsByNode.set(row.node_id, set);
	}

	const courses = (nodes ?? [])
		.filter((n: any) => {
			const tgTargets = tgTargetsByNode.get(n.id) ?? new Set();
			const tTargets = teamTargetsByNode.get(n.id) ?? new Set();
			if (tgTargets.has(primaryTeamGroupId)) return true;
			for (const tid of userTeamIds) if (tTargets.has(tid)) return true;
			return false;
		})
		.map((n: any) => ({
			id: n.id,
			title: n.title,
			slug: n.slug,
			status: statusByNode.get(String(n.id)) ?? 'not_started'
		}));

	// Determine if user is a team lead of THIS team_group
	let isLeadOfTeam = false;
	let roster: any[] = [];
	try {
		const { data: leadFields } = await locals.supabase
			.from('profiles')
			.select('lead_team_group_id')
			.eq('id', user.id)
			.maybeSingle();
		isLeadOfTeam = (leadFields as any)?.lead_team_group_id === primaryTeamGroupId;
	} catch {
		// migration not applied yet
	}

	const canEditNotes = isLeadOfTeam || isAdmin(profile);

	// Load roster if user is a lead (or admin) — all profiles that have a profile_teams row for this team_group
	if (isLeadOfTeam || isAdmin(profile)) {
		const service = createSupabaseServiceClient();
		const { data: rosterProfileIds } = await service
			.from('profile_teams')
			.select('user_id,team_id,category_slug,teams(name)')
			.eq('team_group_id', primaryTeamGroupId);
		const ids = Array.from(new Set((rosterProfileIds ?? []).map((r: any) => r.user_id)));
		if (ids.length > 0) {
			const { data: rosterRows } = await service
				.from('profiles')
				.select('id,full_name,email,is_mentor,is_lead,role,base_role,avatar_url')
				.in('id', ids);
			const categoryByUser = new Map<string, string[]>();
			for (const r of rosterProfileIds ?? []) {
				if (!r.category_slug || r.category_slug === 'general') continue;
				const list = categoryByUser.get(r.user_id) ?? [];
				const displayName = (r as any).teams?.name ?? r.category_slug;
				if (!list.includes(displayName)) list.push(displayName);
				categoryByUser.set(r.user_id, list);
			}
			roster = (rosterRows ?? []).map((r: any) => ({
				...r,
				categories: categoryByUser.get(r.id) ?? []
			}));
		}
	}

	// ── Status counts ────────────────────────────────────────────
	const counts = { done: 0, current: 0, awaiting: 0, blocked: 0, locked: 0 };
	for (const c of courses) {
		const s = c.status;
		if (s === 'completed') counts.done++;
		else if (['in_progress', 'video_pending', 'quiz_pending'].includes(s)) counts.current++;
		else if (['mentor_checkoff_pending', 'awaiting_checkoff'].includes(s)) counts.awaiting++;
		else if (['checkoff_needs_review', 'checkoff_blocked'].includes(s)) counts.blocked++;
		else counts.locked++;
	}

	// ── Recent completions (last 7 days) — uses approved_at (no granted_at column) ──
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

	// ── Graph nodes + prereqs (for MiniSkillTree) ────────────────
	const [{ data: graphNodes }, { data: graphPrereqs }] = await Promise.all([
		locals.supabase.from('nodes').select('id,title,slug'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id')
	]);

	const scopeNodeIds = courses.map((c) => String(c.id));
	const userStatuses = courses.map((c) => ({ node_id: String(c.id), computed_status: c.status }));

	return {
		teamGroup,
		subteams: userSubteams,
		courses,
		notes: (notesRow as any)?.body ?? '',
		canEditNotes,
		isLeadOfTeam,
		roster,
		statusCounts: counts,
		recentCompletions,
		graphNodes: (graphNodes ?? []).map((n: any) => ({ id: String(n.id), title: n.title, slug: n.slug })),
		graphPrereqs: (graphPrereqs ?? []).map((r: any) => ({ node_id: String(r.node_id), prerequisite_node_id: String(r.prerequisite_node_id) })),
		scopeNodeIds,
		userStatuses
	};
};

export const actions: Actions = {
	saveNotes: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const body = String(form.get('body') ?? '');
		if (!teamGroupId) return fail(400, { error: 'Team ID required.' });

		const service = createSupabaseServiceClient();
		const { data: leadFields } = await service
			.from('profiles')
			.select('lead_team_group_id')
			.eq('id', user.id)
			.maybeSingle();
		const isLead = (leadFields as any)?.lead_team_group_id === teamGroupId;
		if (!isLead && !isAdmin(profile)) return fail(403, { error: 'Only team leads can edit notes.' });

		try {
			const { error: err } = await service.from('team_notes').upsert({
				team_group_id: teamGroupId,
				subteam_category_slug: '',
				body,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			}, { onConflict: 'team_group_id,subteam_category_slug' });
			if (err) return fail(400, { error: err.message.includes('schema cache') ? 'Notes require a pending database migration — apply 202605140005 in Supabase.' : err.message });
		} catch {
			return fail(503, { error: 'Notes require a pending database migration.' });
		}
		return { ok: true };
	}
};
