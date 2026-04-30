import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const [{ data: teams }, { data: subteams }, { data: current }, { data: categories }, { data: subteamLinks }, { data: currentPrimary }] =
		await Promise.all([
		locals.supabase
			.from('team_groups')
			.select('id,name,slug,color_hex,sort_order')
			.order('sort_order'),
		locals.supabase
			.from('teams')
			.select('id,name,slug,color_hex,category_slug,team_group_id,sort_order')
			.order('sort_order'),
		locals.supabase
			.from('profile_teams')
			.select('team_group_id,team_id,category_slug')
			.eq('user_id', user.id),
		locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding,sort_order')
			.order('sort_order'),
		locals.supabase.from('team_group_subteam_links').select('team_group_id,team_id'),
		locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', user.id).maybeSingle()
	]);
	const requiredCategories = (categories ?? []).filter((category: any) => category.is_required_onboarding);

	return {
		teams: teams ?? [],
		subteams: subteams ?? [],
		current: current ?? [],
		categories: categories ?? [],
		requiredCategories,
		subteamLinks: subteamLinks ?? [],
		currentPrimaryTeamGroupId: currentPrimary?.team_group_id ?? ''
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const primaryTeamGroupId = String(form.get('primary_team_group_id') ?? '').trim();
		if (!primaryTeamGroupId) return fail(400, { error: 'Select your main team first.' });
		const { data: categories } = await locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding')
			.order('sort_order');
		const requiredCategories = (categories ?? []).filter((category: any) => category.is_required_onboarding);
		if (requiredCategories.length === 0) {
			return fail(400, { error: 'Onboarding configuration is invalid. Ask an admin to update it.' });
		}

		const selectedTeamIds = requiredCategories
			.map((category: any) => String(form.get(`team_id_${String(category.slug)}`) ?? '').trim())
			.filter(Boolean);
		if (selectedTeamIds.length === 0) {
			return fail(400, { error: 'Select your required subteams.' });
		}
		if (new Set(selectedTeamIds).size !== selectedTeamIds.length) {
			return fail(400, { error: 'Each required category must use a different subteam.' });
		}

		const { data: selectedTeams } = await locals.supabase
			.from('teams')
			.select('id,team_group_id,category_slug')
			.in('id', selectedTeamIds);
		const { data: links } = await locals.supabase
			.from('team_group_subteam_links')
			.select('team_group_id,team_id')
			.eq('team_group_id', primaryTeamGroupId)
			.in('team_id', selectedTeamIds);
		const linkedTeamIds = new Set((links ?? []).map((row) => String(row.team_id)));

		const inserts: {
			user_id: string;
			team_group_id: string;
			team_id: string;
			category_slug: string;
		}[] = [];
		for (const category of requiredCategories as any[]) {
			const categorySlug = String(category.slug);
			const selectedTeamId = String(form.get(`team_id_${categorySlug}`) ?? '').trim();
			if (!selectedTeamId) {
				return fail(400, { error: `Select a ${String(category.name).toLowerCase()} subteam.` });
			}
			const selected = (selectedTeams ?? []).find(
				(row: any) => row.id === selectedTeamId && String(row.category_slug ?? '') === categorySlug
			);
			if (!selected) {
				return fail(400, { error: `Selection for ${String(category.name).toLowerCase()} does not match the required category.` });
			}
			if (!linkedTeamIds.has(String(selected.id))) {
				return fail(400, { error: `Selected ${String(category.name).toLowerCase()} subteam is not linked to the chosen main team.` });
			}
			inserts.push({
				user_id: user.id,
				team_group_id: selected.team_group_id,
				team_id: selected.id,
				category_slug: categorySlug
			});
		}

		const selectedGroupIds = Array.from(new Set(inserts.map((row) => String(row.team_group_id))));
		const { data: existingRows, error: existingError } = await locals.supabase
			.from('profile_teams')
			.select('team_group_id')
			.eq('user_id', user.id);
		if (existingError) return fail(400, { error: existingError.message });
		const staleGroupIds = (existingRows ?? [])
			.map((row: any) => String(row.team_group_id))
			.filter((groupId) => !selectedGroupIds.includes(groupId));
		if (staleGroupIds.length > 0) {
			const { error: deleteStaleError } = await locals.supabase
				.from('profile_teams')
				.delete()
				.eq('user_id', user.id)
				.in('team_group_id', staleGroupIds);
			if (deleteStaleError) return fail(400, { error: deleteStaleError.message });
		}
		if (selectedGroupIds.length > 0) {
			const { error: clearSelectedError } = await locals.supabase
				.from('profile_teams')
				.delete()
				.eq('user_id', user.id)
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
			.upsert({ user_id: user.id, team_group_id: primaryTeamGroupId }, { onConflict: 'user_id' });
		if (primaryError) return fail(400, { error: primaryError.message });

		const { error: syncError } = await locals.supabase.rpc('sync_profile_courseloads_for_user', { p_user_id: user.id });
		if (syncError) return fail(400, { error: syncError.message });
		throw redirect(303, '/dashboard');
	}
};
