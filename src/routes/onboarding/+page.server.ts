import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';

export type OnboardingStep = {
	id: string;
	position: number;
	kind: 'welcome' | 'team_pick' | 'external_link' | 'content';
	title: string;
	body: string;
	link_url: string;
	requires_link_click: boolean;
	requires_checkbox: boolean;
};

export type OnboardingProgress = {
	step_id: string;
	link_clicked_at: string | null;
	completed_at: string | null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const previewing = url.searchParams.get('preview') === '1' && isAdmin(profile);

	const [
		stepsResp,
		progressResp,
		teamsResp,
		subteamsResp,
		currentResp,
		categoriesResp,
		subteamLinksResp,
		currentPrimaryResp
	] = await Promise.all([
		locals.supabase
			.from('onboarding_steps')
			.select('id,position,kind,title,body,link_url,requires_link_click,requires_checkbox')
			.eq('is_active', true)
			.order('position', { ascending: true }),
		locals.supabase
			.from('onboarding_progress')
			.select('step_id,link_clicked_at,completed_at')
			.eq('user_id', user.id),
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
		locals.supabase
			.from('profile_primary_teams')
			.select('team_group_id')
			.eq('user_id', user.id)
			.maybeSingle()
	]);

	const steps = (stepsResp.data ?? []) as OnboardingStep[];
	const progress = (progressResp.data ?? []) as OnboardingProgress[];
	const progressById = new Map(progress.map((p) => [String(p.step_id), p]));

	const firstIncomplete = steps.find((s) => !progressById.get(String(s.id))?.completed_at) ?? null;
	const currentStepId = url.searchParams.get('step');
	const currentStep =
		(currentStepId ? steps.find((s) => s.id === currentStepId) : null) ??
		firstIncomplete ??
		steps[steps.length - 1] ??
		null;

	const requiredCategories = (categoriesResp.data ?? []).filter(
		(category: any) => category.is_required_onboarding
	);

	return {
		previewing,
		steps,
		progress,
		currentStep,
		teams: teamsResp.data ?? [],
		subteams: subteamsResp.data ?? [],
		current: currentResp.data ?? [],
		categories: categoriesResp.data ?? [],
		requiredCategories,
		subteamLinks: subteamLinksResp.data ?? [],
		currentPrimaryTeamGroupId: currentPrimaryResp.data?.team_group_id ?? ''
	};
};

async function markStepComplete(locals: App.Locals, userId: string, stepId: string) {
	const { error } = await locals.supabase.from('onboarding_progress').upsert(
		{
			user_id: userId,
			step_id: stepId,
			completed_at: new Date().toISOString()
		},
		{ onConflict: 'user_id,step_id' }
	);
	if (error) throw error;
}

async function maybeFinish(locals: App.Locals, userId: string): Promise<boolean> {
	const [{ data: steps }, { data: progress }] = await Promise.all([
		locals.supabase.from('onboarding_steps').select('id').eq('is_active', true),
		locals.supabase
			.from('onboarding_progress')
			.select('step_id,completed_at')
			.eq('user_id', userId)
			.not('completed_at', 'is', null)
	]);
	const required = new Set((steps ?? []).map((s: any) => String(s.id)));
	const done = new Set((progress ?? []).map((p: any) => String(p.step_id)));
	for (const id of required) if (!done.has(id)) return false;
	return true;
}

export const actions: Actions = {
	markComplete: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const stepId = String(form.get('step_id') ?? '').trim();
		if (!stepId) return fail(400, { error: 'Missing step.' });
		try {
			await markStepComplete(locals, user.id, stepId);
		} catch (e: any) {
			return fail(400, { error: e?.message ?? 'Failed to save.' });
		}
		if (await maybeFinish(locals, user.id)) throw redirect(303, '/dashboard');
		throw redirect(303, '/onboarding');
	},

	trackLinkClick: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const stepId = String(form.get('step_id') ?? '').trim();
		if (!stepId) return fail(400, { error: 'Missing step.' });
		const { error } = await locals.supabase.from('onboarding_progress').upsert(
			{
				user_id: user.id,
				step_id: stepId,
				link_clicked_at: new Date().toISOString()
			},
			{ onConflict: 'user_id,step_id' }
		);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	save: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const stepId = String(form.get('step_id') ?? '').trim();
		const primaryTeamGroupId = String(form.get('primary_team_group_id') ?? '').trim();
		if (!primaryTeamGroupId) return fail(400, { error: 'Select your main team first.' });
		const { data: categories } = await locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding')
			.order('sort_order');
		const requiredCategories = (categories ?? []).filter(
			(category: any) => category.is_required_onboarding
		);
		if (requiredCategories.length === 0) {
			return fail(400, {
				error: 'Onboarding configuration is invalid. Ask an admin to update it.'
			});
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
				return fail(400, {
					error: `Selection for ${String(category.name).toLowerCase()} does not match the required category.`
				});
			}
			if (!linkedTeamIds.has(String(selected.id))) {
				return fail(400, {
					error: `Selected ${String(category.name).toLowerCase()} subteam is not linked to the chosen main team.`
				});
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

		const { error: syncError } = await locals.supabase.rpc('sync_profile_courseloads_for_user', {
			p_user_id: user.id
		});
		if (syncError) return fail(400, { error: syncError.message });

		if (stepId) {
			try {
				await markStepComplete(locals, user.id, stepId);
			} catch (e: any) {
				return fail(400, { error: e?.message ?? 'Failed to mark step complete.' });
			}
		}
		if (await maybeFinish(locals, user.id)) throw redirect(303, '/dashboard');
		throw redirect(303, '/onboarding');
	}
};
