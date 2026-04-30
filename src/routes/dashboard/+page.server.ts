import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadTrainingCategories } from '$lib/server/training-categories';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const [
		nodesResp,
		statusesResp,
		subteamsResp,
		profileTeamsResp,
		profileTeamGroupsResp,
		nodeTeamTargetsResp,
		nodeTeamGroupTargetsResp,
		prereqResp,
		reviewResp,
		blockRowsResp,
		blockProgressResp,
		trainingData,
		coursesDashboard,
		requiredCategoriesResp,
		teamGroupsResp,
		teamsResp,
		primaryTeamResp
	] = await Promise.all([
		locals.supabase
			.from('nodes')
			.select('id,title,slug,subteam_id,video_url')
			.order('title', { ascending: true }),
		locals.supabase
			.from('v_user_node_status')
			.select('node_id,computed_status')
			.eq('user_id', user.id),
		locals.supabase.from('subteams').select('id,name,slug').order('name'),
		locals.supabase
			.from('profile_teams')
			.select('team_id,team_group_id,category_slug')
			.eq('user_id', user.id),
		locals.supabase
			.from('profile_teams')
			.select('team_group_id,team_groups(designator)')
			.eq('user_id', user.id),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('node_prerequisites').select('node_id,prerequisite_node_id'),
		locals.supabase
			.from('checkoff_reviews')
			.select('node_id,status,updated_at')
			.eq('user_id', user.id)
			.in('status', ['needs_review', 'blocked']),
		locals.supabase.from('node_blocks').select('node_id,id'),
		locals.supabase
			.from('user_node_block_progress')
			.select('node_id,block_id,completed_at')
			.eq('user_id', user.id),
		loadTrainingCategories(locals.supabase),
		loadStudentCoursesDashboard(locals.supabase, user.id),
		locals.supabase
			.from('subteam_categories')
			.select('slug,name,is_required_onboarding,sort_order')
			.eq('is_required_onboarding', true),
		locals.supabase.from('team_groups').select('id,name,color_hex'),
		locals.supabase.from('teams').select('id,name,color_hex,category_slug,team_group_id'),
		locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', user.id).maybeSingle()
	]);

	let parentApplicationStatus: string | null = null;
	let linkedStudents: Array<{ id: string; full_name: string; email: string }> = [];
	if (profile?.is_parent_guardian) {
		const [{ data: appRow }, { data: links }] = await Promise.all([
			locals.supabase
				.from('parent_applications')
				.select('status')
				.eq('parent_user_id', user.id)
				.maybeSingle(),
			locals.supabase
				.from('parent_student_links')
				.select('student_user_id,status,profiles!parent_student_links_student_user_id_fkey(id,full_name,email)')
				.eq('parent_user_id', user.id)
				.eq('status', 'active')
		]);
		parentApplicationStatus = String(appRow?.status ?? 'not_started');
		linkedStudents = (links ?? []).map((row: any) => {
			const student = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null;
			return {
				id: String(student?.id ?? row.student_user_id),
				full_name: String(student?.full_name ?? ''),
				email: String(student?.email ?? '')
			};
		});
	}

	return {
		profile,
		nodes: nodesResp.data ?? [],
		statuses: statusesResp.data ?? [],
		subteams: subteamsResp.data ?? [],
		profileTeams: profileTeamsResp.data ?? [],
		profileTeamGroups: profileTeamGroupsResp.data ?? [],
		nodeTeamTargets: nodeTeamTargetsResp.data ?? [],
		nodeTeamGroupTargets: nodeTeamGroupTargetsResp.data ?? [],
		prerequisites: prereqResp.data ?? [],
		checkoffReviews: reviewResp.data ?? [],
		blockRows: blockRowsResp.data ?? [],
		blockProgress: blockProgressResp.data ?? [],
		trainingCategories: trainingData.categories,
		nodeCategories: trainingData.nodeCategories,
		coursesDashboard,
		teamGroups: teamGroupsResp.data ?? [],
		teams: teamsResp.data ?? [],
		primaryTeamGroupId: primaryTeamResp.data?.team_group_id ?? '',
		requiredOnboardingCategories: requiredCategoriesResp.data ?? [],
		parentApplicationStatus,
		linkedStudents
	};
};

export const actions: Actions = {
	linkStudentByCode: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		if (!profile.is_parent_guardian) return fail(403, { error: 'Parent access only.' });

		const form = await request.formData();
		const code = String(form.get('code') ?? '')
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '');
		if (!code) return fail(400, { error: 'Enter a student link code.' });

		const { data: application } = await locals.supabase
			.from('parent_applications')
			.select('status')
			.eq('parent_user_id', user.id)
			.maybeSingle();
		if (String(application?.status ?? '') !== 'approved') {
			return fail(400, {
				error:
					'Your parent application is not approved yet. Ask an admin to approve it in Parent Application Approvals.'
			});
		}

		const { data: codeRow, error: codeError } = await locals.supabase
			.from('parent_link_codes')
			.select('id,student_user_id,expires_at,used_at')
			.eq('code', code)
			.maybeSingle();
		if (codeError) return fail(400, { error: codeError.message });
		if (!codeRow) return fail(400, { error: 'Invalid link code.' });
		if (codeRow.used_at) return fail(400, { error: 'This link code has already been used.' });
		if (new Date(String(codeRow.expires_at)).getTime() <= Date.now()) {
			return fail(400, { error: 'This link code has expired.' });
		}

		const studentUserId = String(codeRow.student_user_id);
		const { data: existing } = await locals.supabase
			.from('parent_student_links')
			.select('id,status')
			.eq('parent_user_id', user.id)
			.eq('student_user_id', studentUserId)
			.maybeSingle();
		if (String(existing?.status ?? '') === 'active') {
			return fail(400, { error: 'You are already linked to this student.' });
		}

		if (existing?.id) {
			const { error: updateError } = await locals.supabase
				.from('parent_student_links')
				.update({ status: 'active', updated_at: new Date().toISOString() })
				.eq('id', existing.id);
			if (updateError) return fail(400, { error: updateError.message });
		} else {
			const { error: insertError } = await locals.supabase.from('parent_student_links').insert({
				parent_user_id: user.id,
				student_user_id: studentUserId,
				status: 'active'
			});
			if (insertError) return fail(400, { error: insertError.message });
		}

		const { error: markError } = await locals.supabase
			.from('parent_link_codes')
			.update({ used_at: new Date().toISOString(), used_by_parent_user_id: user.id })
			.eq('id', codeRow.id);
		if (markError) return fail(400, { error: markError.message });

		return { ok: true, section: 'parent-link' };
	}
};
