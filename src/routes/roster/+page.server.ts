import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { updateMemberAccess } from './actions';


export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	const canManageUsers = isAdmin(profile);
	const service = createSupabaseServiceClient();
	const [
		{ data: profiles },
		{ data: certs },
		{ data: attendanceSessions },
		{ data: teamGroups },
		{ data: subteams },
		{ data: profileTeamRows },
		{ data: teamsList },
		{ data: requiredCategories },
		{ data: profilePrimaryRows }
	] = await Promise.all([
		locals.supabase
			.from('profiles')
			.select('id,full_name,email,role,base_role,is_mentor,is_lead,subteam_id,lead_team_group_id,lead_subteam_id'),
		locals.supabase
			.from('certifications')
			.select('user_id,status,node_id,quiz_score,quiz_passed_at,approved_at,nodes!inner(title,slug)')
			.not('status', 'eq', 'locked'),
		locals.supabase
			.from('attendance_daily_sessions')
			.select('attendee_user_id,attendance_day,check_in_at,check_out_at')
			.order('attendance_day', { ascending: false }),
		service.from('team_groups').select('id,name,designator,sort_order').order('sort_order'),
		service.from('subteams').select('id,name').order('name'),
		service.from('profile_teams').select('user_id,team_id,category_slug,team_group_id'),
		service.from('teams').select('id,name,slug,category_slug,team_group_id,sort_order').order('sort_order'),
		service
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding,sort_order')
			.eq('is_required_onboarding', true)
			.order('sort_order'),
		service.from('profile_primary_teams').select('user_id,team_group_id')
	]);

	const byUser = new Map<string, { completed: number; pending: number }>();
	const bottlenecks = new Map<string, number>();
	for (const cert of certs ?? []) {
		const agg = byUser.get(cert.user_id) ?? { completed: 0, pending: 0 };
		if (cert.status === 'completed') agg.completed += 1;
		if (cert.status === 'mentor_checkoff_pending') {
			agg.pending += 1;
			const title = (cert as any).nodes?.title ?? 'Unknown module';
			bottlenecks.set(title, (bottlenecks.get(title) ?? 0) + 1);
		}
		byUser.set(cert.user_id, agg);
	}

	// Build subteam lookup map for primarySubteamName resolution.
	// Prefer the active profile_teams membership (current onboarded subteam)
	// over the legacy profiles.subteam_id which is no longer populated.
	const subteamById = new Map<string, string>((subteams ?? []).map((s) => [s.id, s.name]));
	const teamNameById = new Map<string, string>(
		((teamsList ?? []) as Array<{ id: string; name: string }>).map((t) => [String(t.id), String(t.name)])
	);
	const teamRowsByUser = new Map<string, Array<{ team_id: string; category_slug: string | null }>>();
	for (const row of (profileTeamRows ?? []) as Array<{
		user_id: string;
		team_id: string | null;
		category_slug: string | null;
	}>) {
		if (!row.user_id || !row.team_id) continue;
		if (row.category_slug === 'general') continue;
		const list = teamRowsByUser.get(String(row.user_id)) ?? [];
		list.push({ team_id: String(row.team_id), category_slug: row.category_slug });
		teamRowsByUser.set(String(row.user_id), list);
	}
	const primaryTeamGroupByUser = new Map<string, string>(
		((profilePrimaryRows ?? []) as Array<{ user_id: string; team_group_id: string }>).map((r) => [
			String(r.user_id),
			String(r.team_group_id)
		])
	);

	const rows = (profiles ?? []).map((profile) => {
		const agg = byUser.get(profile.id) ?? { completed: 0, pending: 0 };
		const total = Math.max(agg.completed + agg.pending, 1);
		const userCourses = (certs ?? [])
			.filter((c: any) => c.user_id === profile.id)
			.map((c: any) => ({
				node_id: c.node_id,
				title: c.nodes?.title,
				slug: c.nodes?.slug,
				status: c.status,
				quiz_score: c.quiz_score,
				quiz_passed_at: c.quiz_passed_at,
				approved_at: c.approved_at
			}))
			.sort((a: any, b: any) => {
				const aTs = a.approved_at || a.quiz_passed_at || '';
				const bTs = b.approved_at || b.quiz_passed_at || '';
				return String(bTs).localeCompare(String(aTs));
			});

		// Derive subteam membership from profile_teams (current source of truth).
		// Fall back to the legacy profiles.subteam_id only if profile_teams is empty.
		const ptRows = teamRowsByUser.get(String(profile.id)) ?? [];
		const subteamIds: string[] = ptRows
			.map((r) => r.team_id)
			.filter((id): id is string => !!id);
		const primarySubteamName: string | null =
			subteamIds.length > 0
				? (teamNameById.get(subteamIds[0]) ?? null)
				: profile.subteam_id
					? (subteamById.get(profile.subteam_id) ?? null)
					: null;
		if (subteamIds.length === 0 && profile.subteam_id) {
			subteamIds.push(profile.subteam_id);
		}

		// Per-user maps for the admin team-assignments form embedded in the
		// expandable row. Keyed by subteam_categories.slug → team_id.
		const userTeamRows = (profileTeamRows ?? []).filter(
			(r: any) => String(r.user_id) === String(profile.id)
		);
		const currentTeamIdByCategory: Record<string, string> = {};
		for (const r of userTeamRows as Array<{ category_slug: string | null; team_id: string }>) {
			if (r.category_slug && r.team_id) currentTeamIdByCategory[String(r.category_slug)] = String(r.team_id);
		}
		const currentPrimaryTeamGroupId = primaryTeamGroupByUser.get(String(profile.id)) ?? '';

		return {
			...profile,
			progressPercent: Math.round((agg.completed / total) * 100),
			pendingCheckoffs: agg.pending,
			courses: userCourses,
			subteamIds,
			primarySubteamName,
			currentTeamIdByCategory,
			currentPrimaryTeamGroupId
		};
	});

	return {
		rows,
		bottlenecks: Array.from(bottlenecks.entries()).map(([node, count]) => ({ node, count })),
		canManageUsers,
		attendanceSessions: attendanceSessions ?? [],
		teamGroups: teamGroups ?? [],
		subteams: subteams ?? [],
		teams: teamsList ?? [],
		requiredCategories: requiredCategories ?? []
	};
};

export const actions: Actions = {
	updateMemberAccess: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		const result = await updateMemberAccess({
			supabase: createSupabaseServiceClient(),
			isAdminViewer: isAdmin(profile),
			formData: await request.formData()
		});
		if ('ok' in result) return { ok: true };
		return fail(result.status, { error: result.error });
	},
	setUserTeams: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const userId = String(form.get('user_id') ?? '').trim();
		const primaryTeamGroupId = String(form.get('primary_team_group_id') ?? '').trim();
		if (!userId || !primaryTeamGroupId) {
			return fail(400, { error: 'User and main team are required.' });
		}
		const { data: categories } = await locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding')
			.eq('is_required_onboarding', true)
			.order('sort_order');
		const requiredCategoriesList = (categories ?? []).filter((row: any) => row.is_required_onboarding);
		const selectedTeamIds = requiredCategoriesList
			.map((category: any) => String(form.get(`team_id_${String(category.slug)}`) ?? '').trim())
			.filter(Boolean);
		if (new Set(selectedTeamIds).size !== selectedTeamIds.length) {
			return fail(400, { error: 'Each required category must use a different subteam.' });
		}
		const [{ data: selectedTeams }, { data: links, error: linksError }] = await Promise.all([
			locals.supabase.from('teams').select('id,category_slug').in('id', selectedTeamIds),
			locals.supabase
				.from('team_group_subteam_links')
				.select('team_group_id,team_id')
				.eq('team_group_id', primaryTeamGroupId)
				.in('team_id', selectedTeamIds)
		]);
		if (linksError) return fail(400, { error: linksError.message });
		const linkedTeamIds = new Set((links ?? []).map((row: any) => String(row.team_id)));
		const inserts: {
			user_id: string;
			team_group_id: string;
			team_id: string;
			category_slug: string;
		}[] = [];
		for (const category of requiredCategoriesList as any[]) {
			const categorySlug = String(category.slug);
			const selectedTeamId = String(form.get(`team_id_${categorySlug}`) ?? '').trim();
			if (!selectedTeamId) {
				return fail(400, { error: `Select a ${String(category.name).toLowerCase()} subteam.` });
			}
			const selected = (selectedTeams ?? []).find(
				(row: any) => row.id === selectedTeamId && String(row.category_slug ?? '') === categorySlug
			);
			if (!selected) return fail(400, { error: `Selection for ${String(category.name).toLowerCase()} is invalid.` });
			if (!linkedTeamIds.has(String(selectedTeamId))) {
				return fail(400, { error: `Selected ${categorySlug} subteam is not linked to the chosen main team.` });
			}
			inserts.push({
				user_id: userId,
				team_group_id: primaryTeamGroupId,
				team_id: selected.id,
				category_slug: categorySlug
			});
		}
		const selectedGroupIds = Array.from(new Set(inserts.map((row) => String(row.team_group_id))));
		const { data: existingRows, error: existingError } = await locals.supabase
			.from('profile_teams')
			.select('team_group_id')
			.eq('user_id', userId);
		if (existingError) return fail(400, { error: existingError.message });
		const staleGroupIds = (existingRows ?? [])
			.map((row: any) => String(row.team_group_id))
			.filter((groupId) => !selectedGroupIds.includes(groupId));
		if (staleGroupIds.length > 0) {
			const { error: deleteStaleError } = await locals.supabase
				.from('profile_teams')
				.delete()
				.eq('user_id', userId)
				.in('team_group_id', staleGroupIds);
			if (deleteStaleError) return fail(400, { error: deleteStaleError.message });
		}
		if (selectedGroupIds.length > 0) {
			const { error: clearSelectedError } = await locals.supabase
				.from('profile_teams')
				.delete()
				.eq('user_id', userId)
				.is('source_survey_id', null)
				.in('team_group_id', selectedGroupIds);
			if (clearSelectedError) return fail(400, { error: clearSelectedError.message });
		}
		const { error: upsertError } = await locals.supabase
			.from('profile_teams')
			.upsert(inserts, { onConflict: 'user_id,team_group_id,category_slug' });
		if (upsertError) return fail(400, { error: upsertError.message });
		const { error: primaryError } = await locals.supabase
			.from('profile_primary_teams')
			.upsert({ user_id: userId, team_group_id: primaryTeamGroupId }, { onConflict: 'user_id' });
		if (primaryError) return fail(400, { error: primaryError.message });
		const { error: syncError } = await locals.supabase.rpc('sync_profile_courseloads_for_user', {
			p_user_id: userId
		});
		if (syncError) return fail(400, { error: syncError.message });
		return { ok: true };
	}
};
