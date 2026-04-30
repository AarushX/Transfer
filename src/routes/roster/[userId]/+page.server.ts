import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin, isMentor } from '$lib/roles';
import { computeUserRanks } from '$lib/server/ranks';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || (!isMentor(profile) && profile.role !== 'admin')) {
		throw redirect(303, '/dashboard');
	}

	const userId = params.userId;
	const [
		profileResp,
		coursesResp,
		categoriesResp,
		nodeCategoriesResp,
		rankMap,
		teamGroupsResp,
		subteamsResp,
		requiredCategoriesResp,
		userTeamRowsResp,
		userPrimaryResp
	] =
		await Promise.all([
			locals.supabase
				.from('profiles')
				.select('id,full_name,email,role,subteam_id,avatar_url,bio')
				.eq('id', userId)
				.single(),
			locals.supabase
				.from('certifications')
				.select('node_id,status,quiz_score,quiz_passed_at,approved_at,nodes!inner(title,slug)')
				.eq('user_id', userId)
				.not('status', 'eq', 'locked')
				.order('approved_at', { ascending: false, nullsFirst: false }),
			locals.supabase
				.from('training_categories')
				.select('id,name,slug,parent_id,color_token')
				.eq('is_active', true),
			locals.supabase.from('node_categories').select('node_id,category_id'),
			computeUserRanks(locals.supabase, [userId]),
			locals.supabase.from('team_groups').select('id,name,sort_order').order('sort_order'),
			locals.supabase.from('teams').select('id,name,category_slug,team_group_id,sort_order').order('sort_order'),
			locals.supabase
				.from('subteam_categories')
				.select('slug,name,is_required_onboarding,sort_order')
				.eq('is_required_onboarding', true)
				.order('sort_order'),
			locals.supabase.from('profile_teams').select('team_id,category_slug').eq('user_id', userId),
			locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', userId).maybeSingle()
		]);

	const member = profileResp.data;
	if (!member) throw redirect(303, '/roster');

	const rankSummary = rankMap.get(userId) ?? null;
	const categoryById = new Map((categoriesResp.data ?? []).map((c: any) => [String(c.id), c]));
	const categoryIdsByNode = new Map<string, string[]>();
	for (const row of nodeCategoriesResp.data ?? []) {
		const key = String((row as any).node_id);
		const list = categoryIdsByNode.get(key) ?? [];
		list.push(String((row as any).category_id));
		categoryIdsByNode.set(key, list);
	}

	const completedCourses = (coursesResp.data ?? []).map((row: any) => {
		const ids = categoryIdsByNode.get(String(row.node_id)) ?? [];
		return {
			...row,
			categories: ids.map((id) => categoryById.get(id)).filter(Boolean)
		};
	});

	return {
		member,
		canManageUsers: isAdmin(profile),
		rankSummary,
		courseResults: completedCourses,
		teamGroups: teamGroupsResp.data ?? [],
		subteams: subteamsResp.data ?? [],
		requiredCategories: requiredCategoriesResp.data ?? [],
		userTeamRows: userTeamRowsResp.data ?? [],
		currentPrimaryTeamGroupId: userPrimaryResp.data?.team_group_id ?? ''
	};
};

export const actions: Actions = {
	setUserTeams: async ({ locals, request, params }) => {
		const { profile } = await locals.safeGetSession();
		if (!isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const userId = params.userId;
		const form = await request.formData();
		const primaryTeamGroupId = String(form.get('primary_team_group_id') ?? '').trim();
		if (!userId || !primaryTeamGroupId) return fail(400, { error: 'User and main team are required.' });
		const { data: categories } = await locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding')
			.eq('is_required_onboarding', true)
			.order('sort_order');
		const requiredCategories = (categories ?? []).filter((row: any) => row.is_required_onboarding);
		const selectedTeamIds = requiredCategories
			.map((category: any) => String(form.get(`team_id_${String(category.slug)}`) ?? '').trim())
			.filter(Boolean);
		if (new Set(selectedTeamIds).size !== selectedTeamIds.length) {
			return fail(400, { error: 'Each required category must use a different subteam.' });
		}
		const { data: selectedTeams } = await locals.supabase
			.from('teams')
			.select('id,team_group_id,category_slug')
			.in('id', selectedTeamIds);
		const inserts: {
			user_id: string;
			team_group_id: string;
			team_id: string;
			category_slug: string;
		}[] = [];
		for (const category of requiredCategories as any[]) {
			const categorySlug = String(category.slug);
			const selectedTeamId = String(form.get(`team_id_${categorySlug}`) ?? '').trim();
			if (!selectedTeamId) return fail(400, { error: `Select a ${String(category.name).toLowerCase()} subteam.` });
			const selected = (selectedTeams ?? []).find(
				(row: any) => row.id === selectedTeamId && String(row.category_slug ?? '') === categorySlug
			);
			if (!selected) return fail(400, { error: `Selection for ${String(category.name).toLowerCase()} is invalid.` });
			inserts.push({
				user_id: userId,
				team_group_id: selected.team_group_id,
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
		const { error: syncError } = await locals.supabase.rpc('sync_profile_courseloads_for_user', { p_user_id: userId });
		if (syncError) return fail(400, { error: syncError.message });
		return { ok: true, section: 'teams' };
	}
};
