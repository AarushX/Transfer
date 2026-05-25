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
		{ data: notesRow },
		notesEntriesResp
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
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase
			.from('team_notes')
			.select('body')
			.eq('team_group_id', primaryTeamGroupId)
			.eq('subteam_category_slug', subteamSlug)
			.maybeSingle(),
		// Tolerate the migration not being applied yet — the page should still
		// render with an empty timeline rather than 500.
		locals.supabase
			.from('team_notes_entries')
			.select('id,body,author_user_id,created_at,edited_at,deleted_at')
			.eq('team_group_id', primaryTeamGroupId)
			.eq('subteam_category_slug', subteamSlug)
			.is('deleted_at', null)
			.order('created_at', { ascending: false })
			.limit(50)
			.then(
				(r) => r,
				() => ({ data: [] as any[] })
			)
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
	const statusByNode = new Map(
		(nodeStatuses ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)])
	);
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
			proficiency_level: n.proficiency_level ?? null,
			code: n.code ?? null,
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

			// Derive each member's proficiency level within this subteam: the
			// highest level for which they have completed >= 1 course tied to
			// the subteam. Done as a single per-subteam pass; no extra column.
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

	// Enrich entries with author profile so the UI can show name + avatar
	// initials. One extra query, scoped to the (small) set of authors only.
	const rawEntries: any[] = (notesEntriesResp as any)?.data ?? [];
	const authorIds = Array.from(
		new Set(rawEntries.map((e: any) => e.author_user_id).filter(Boolean))
	);
	let authorById = new Map<
		string,
		{ id: string; full_name: string | null; email: string | null }
	>();
	if (authorIds.length > 0) {
		const { data: authors } = await locals.supabase
			.from('profiles')
			.select('id,full_name,email')
			.in('id', authorIds);
		authorById = new Map((authors ?? []).map((a: any) => [a.id, a]));
	}
	const notesEntries = rawEntries.map((e: any) => ({
		id: String(e.id),
		body: String(e.body ?? ''),
		author: e.author_user_id ? (authorById.get(e.author_user_id) ?? null) : null,
		author_user_id: e.author_user_id ?? null,
		created_at: e.created_at,
		edited_at: e.edited_at,
		// 15-minute edit window (matches the RLS policy).
		can_edit:
			user.id === e.author_user_id && new Date(e.created_at).getTime() > Date.now() - 15 * 60 * 1000
	}));

	return {
		teamGroup,
		subteamCategory,
		subteam,
		userIsOnSubteam,
		courses,
		notes: (notesRow as any)?.body ?? '',
		notesEntries,
		canEditNotes,
		canPostNotesEntry: canEditNotes,
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
		userStatuses
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
		const { data: subteam } = await service
			.from('subteams')
			.select('id')
			.eq('slug', subteamSlug)
			.maybeSingle();
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

		try {
			const { error: err } = await service.from('team_notes').upsert(
				{
					team_group_id: teamGroupId,
					subteam_category_slug: subteamSlug,
					body,
					updated_by: user.id,
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'team_group_id,subteam_category_slug' }
			);
			if (err)
				return fail(400, {
					error: err.message.includes('schema cache')
						? 'Notes require a pending database migration — apply 202605140005 in Supabase.'
						: err.message
				});
		} catch {
			return fail(503, { error: 'Notes require a pending database migration.' });
		}
		return { ok: true };
	},
	postNotesEntry: async ({ locals, request, params }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		const subteamSlug = params.subteam;
		if (!body) return fail(400, { error: 'Note cannot be empty.', section: 'entry' });
		if (body.length > 4000)
			return fail(400, { error: 'Note is too long (max 4000 chars).', section: 'entry' });

		const service = createSupabaseServiceClient();
		const { data: subteam } = await service
			.from('subteams')
			.select('id')
			.eq('slug', subteamSlug)
			.maybeSingle();
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
		if (!allowed) return fail(403, { error: 'Only leads can post notes.', section: 'entry' });

		try {
			const { error: err } = await service.from('team_notes_entries').insert({
				team_group_id: teamGroupId,
				subteam_category_slug: subteamSlug,
				author_user_id: user.id,
				body
			});
			if (err) return fail(400, { error: err.message, section: 'entry' });
		} catch {
			return fail(503, {
				error: 'Notes timeline requires a pending database migration.',
				section: 'entry'
			});
		}
		return { ok: true, section: 'entry' };
	},
	editNotesEntry: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized', section: 'entry' });
		const form = await request.formData();
		const entryId = String(form.get('entry_id') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!entryId || !body) return fail(400, { error: 'Missing entry or body.', section: 'entry' });

		// RLS enforces the 15-minute author-only window; we just attempt the
		// update and surface any policy denial as a generic error.
		const { error: err } = await locals.supabase
			.from('team_notes_entries')
			.update({ body, edited_at: new Date().toISOString() })
			.eq('id', entryId)
			.eq('author_user_id', user.id);
		if (err) return fail(400, { error: err.message, section: 'entry' });
		return { ok: true, section: 'entry' };
	},
	deleteNotesEntry: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized', section: 'entry' });
		const form = await request.formData();
		const entryId = String(form.get('entry_id') ?? '').trim();
		if (!entryId) return fail(400, { error: 'Missing entry id.', section: 'entry' });

		// Author can soft-delete within window via locals.supabase (RLS).
		// Admins can soft-delete anything via service client.
		const client = isAdmin(profile) ? createSupabaseServiceClient() : locals.supabase;
		const { error: err } = await client
			.from('team_notes_entries')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', entryId);
		if (err) return fail(400, { error: err.message, section: 'entry' });
		return { ok: true, section: 'entry' };
	}
};
