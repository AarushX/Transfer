import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadTrainingCategories } from '$lib/server/training-categories';
import { loadStudentCoursesDashboard } from '$lib/server/courseload-dashboard';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { computeLetteringProgress } from '$lib/server/lettering-progress';
import { buildPassportQrDataUrl } from '$lib/server/passport-qr';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	const isParent = profile?.is_parent_guardian === true;

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
	let linkedStudents: Array<{ id: string; full_name: string; email: string; checkedIn: boolean; checkedInSince: string | null; lettering: any; completedNodes: number }> = [];
	let parentFamily: any = null;
	let parentCommitments: any[] = [];
	let parentCategories: any[] = [];
	let parentSignups: any[] = [];
	let parentOpportunities: any[] = [];
	let parentAnnouncements: any[] = [];

	if (profile?.is_parent_guardian) {
		const [{ data: appRow }, { data: links }, { data: activeSeason }] = await Promise.all([
			locals.supabase
				.from('parent_applications')
				.select('status')
				.eq('parent_user_id', user.id)
				.maybeSingle(),
			locals.supabase
				.from('parent_student_links')
				.select('student_user_id,status,profiles!parent_student_links_student_user_id_fkey(id,full_name,email)')
				.eq('parent_user_id', user.id)
				.eq('status', 'active'),
			locals.supabase
				.from('lettering_seasons')
				.select('id,label,start_date,end_date')
				.eq('is_active', true)
				.maybeSingle()
		]);

		parentApplicationStatus = String(appRow?.status ?? 'not_started');

		if (activeSeason) {
			// Find parent's family
			const { data: familyMembership } = await locals.supabase
				.from('family_members')
				.select('family_id,families(id,name)')
				.eq('user_id', user.id)
				.eq('role', 'parent')
				.maybeSingle();

			if (familyMembership?.families) {
				parentFamily = {
					id: (familyMembership.families as any).id,
					name: (familyMembership.families as any).name
				};

				// Fetch pledges, categories, and signups
				const [
					{ data: categories },
					{ data: commitments },
					{ data: signups },
					{ data: opportunities },
					{ data: anns }
				] = await Promise.all([
					locals.supabase.from('volunteer_categories').select('*').eq('is_active', true).order('sort_order'),
					locals.supabase.from('volunteer_commitments').select('*').eq('family_id', parentFamily.id).eq('season_id', activeSeason.id),
					locals.supabase.from('volunteer_signups').select('*,opportunity:volunteer_opportunities(*)').eq('family_id', parentFamily.id).neq('status', 'cancelled'),
					locals.supabase.from('volunteer_opportunities').select('*,category:volunteer_categories(*)').eq('season_id', activeSeason.id).eq('is_active', true),
					locals.supabase.from('announcements').select('*,author:profiles!announcements_created_by_fkey(full_name)').eq('season_id', activeSeason.id).or('audience.eq.all,audience.eq.parents').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5)
				]);

				parentCategories = categories ?? [];
				parentCommitments = commitments ?? [];
				parentSignups = signups ?? [];
				parentOpportunities = opportunities ?? [];
				parentAnnouncements = anns ?? [];
			}
		}

		// Compile rich child info
		const studentLinks = links ?? [];
		if (studentLinks.length > 0) {
			linkedStudents = await Promise.all(studentLinks.map(async (row: any) => {
				const student = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null;
				if (!student) {
					return {
						id: String(row.student_user_id),
						full_name: 'Student',
						email: '',
						checkedIn: false,
						checkedInSince: null,
						lettering: { pct: 0, completedCount: 0, totalRequired: 0, overflow: false },
						completedNodes: 0
					};
				}

				// Fetch child's active check-in
				const { data: openSession } = await locals.supabase
					.from('attendance_daily_sessions')
					.select('check_in_at')
					.eq('attendee_user_id', student.id)
					.is('check_out_at', null)
					.maybeSingle();

				// Fetch child's lettering progress
				const lettering = await computeLetteringProgress(locals.supabase, student.id);

				// Fetch child's training progress (completed nodes count)
				const { count: completedNodes } = await locals.supabase
					.from('v_user_node_status')
					.select('node_id', { count: 'exact', head: true })
					.eq('user_id', student.id)
					.eq('computed_status', 'completed');

				return {
					id: String(student.id),
					full_name: String(student.full_name ?? ''),
					email: String(student.email ?? ''),
					checkedIn: !!openSession,
					checkedInSince: openSession?.check_in_at ?? null,
					lettering,
					completedNodes: completedNodes ?? 0
				};
			}));
		}
	}

	// --- New dashboard data (non-parents get real data; parents get safe defaults) ---

	let hoursSeason = 0;
	let checkedInSince: string | null = null;
	let letteringProgress = { pct: 0, completedCount: 0, totalRequired: 0, overflow: false };
	let announcements: Array<{
		team_group_id: string;
		subteam_category_slug: string;
		body: string;
		scope: 'team' | 'subteam';
		scope_name: string;
		updated_at: string;
	}> = [];
	let passportQrDataUrl: string | null = null;

	if (!isParent) {
		const [
			{ data: openSession },
			completedSessionsResp,
			computedLettering,
			{ data: notesRows },
			{ data: qrProfile }
		] = await Promise.all([
			locals.supabase
				.from('attendance_daily_sessions')
				.select('check_in_at,attendance_day')
				.eq('attendee_user_id', user.id)
				.is('check_out_at', null)
				.maybeSingle(),
			locals.supabase
				.from('attendance_daily_sessions')
				.select('check_in_at,check_out_at')
				.eq('attendee_user_id', user.id)
				.not('check_out_at', 'is', null),
			computeLetteringProgress(locals.supabase, user.id),
			locals.supabase
				.from('team_notes')
				.select('team_group_id,subteam_category_slug,body,updated_at')
				.order('updated_at', { ascending: false })
				.limit(8),
			locals.supabase
				.from('profiles')
				.select('passport_qr_version')
				.eq('id', user.id)
				.single()
		]);

		// Hours tally from completed sessions
		const completedSessions = completedSessionsResp.data ?? [];
		hoursSeason = completedSessions.reduce(
			(acc: number, s: { check_in_at: string; check_out_at: string }) => {
				const start = new Date(s.check_in_at).getTime();
				const end = new Date(s.check_out_at).getTime();
				return acc + Math.max(0, (end - start) / 3_600_000);
			},
			0
		);

		checkedInSince = openSession?.check_in_at ?? null;
		letteringProgress = computedLettering;

		// Build team group name map from the already-loaded teamGroupsResp
		const teamGroupNameMap = new Map<string, string>(
			(teamGroupsResp.data ?? []).map((tg: { id: string; name: string }) => [tg.id, tg.name])
		);

		announcements = (notesRows ?? [])
			.filter((n: { body: string }) => (n.body ?? '').trim().length > 0)
			.map((n: { team_group_id: string; subteam_category_slug: string; body: string; updated_at: string }) => ({
				team_group_id: n.team_group_id,
				subteam_category_slug: n.subteam_category_slug,
				body: n.body ?? '',
				scope: (n.subteam_category_slug ? 'subteam' : 'team') as 'team' | 'subteam',
				scope_name: n.subteam_category_slug
					? n.subteam_category_slug
					: (teamGroupNameMap.get(n.team_group_id) ?? 'Team'),
				updated_at: n.updated_at ?? new Date().toISOString()
			}));

		const qrVersion = Number(qrProfile?.passport_qr_version ?? 0);
		passportQrDataUrl = await buildPassportQrDataUrl(user.id, qrVersion);
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
		linkedStudents,
		isParent,
		parentFamily,
		parentCommitments,
		parentCategories,
		parentSignups,
		parentOpportunities,
		parentAnnouncements,
		hoursSeason,
		hoursTarget: 90,
		checkedInSince,
		letteringProgress,
		announcements,
		passportQrDataUrl
	};
};

export const actions: Actions = {
	linkStudentByCode: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		if (!profile.is_parent_guardian) return fail(403, { error: 'Parent access only.' });
		const service = createSupabaseServiceClient();

		const form = await request.formData();
		const code = String(form.get('code') ?? '')
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '');
		if (!code) return fail(400, { error: 'Enter a student link code.' });

		const { data: codeRow, error: codeError } = await service
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
		const { data: existing } = await service
			.from('parent_student_links')
			.select('id,status')
			.eq('parent_user_id', user.id)
			.eq('student_user_id', studentUserId)
			.maybeSingle();
		if (String(existing?.status ?? '') === 'active') {
			return fail(400, { error: 'You are already linked to this student.' });
		}

		if (existing?.id) {
			const { error: updateError } = await service
				.from('parent_student_links')
				.update({ status: 'active', updated_at: new Date().toISOString() })
				.eq('id', existing.id);
			if (updateError) return fail(400, { error: updateError.message });
		} else {
			const { error: insertError } = await service.from('parent_student_links').insert({
				parent_user_id: user.id,
				student_user_id: studentUserId,
				status: 'active'
			});
			if (insertError) return fail(400, { error: insertError.message });
		}

		const { error: markError } = await service
			.from('parent_link_codes')
			.update({ used_at: new Date().toISOString(), used_by_parent_user_id: user.id })
			.eq('id', codeRow.id);
		if (markError) return fail(400, { error: markError.message });

		return { ok: true, section: 'parent-link' };
	}
};
