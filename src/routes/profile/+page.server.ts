import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isMentor, isParentGuardian } from '$lib/roles';
import { buildPassportQrDataUrl } from '$lib/server/passport-qr';
import { computeUserRanks } from '$lib/server/ranks';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');
	if (isParentGuardian(profile)) throw redirect(303, '/dashboard');

	const [
		{ data: memberships },
		{ data: primaryTeamRow },
		mentorPrefsResult,
		rankMap,
		{ data: parentLinks },
		{ data: parentCodes }
	] = await Promise.all([
		locals.supabase
			.from('profile_teams')
			.select('team_id,category_slug,teams!inner(id,name,slug,team_group_id,team_groups(id,name,slug,designator))')
			.eq('user_id', user.id),
		locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', user.id).maybeSingle(),
		isMentor(profile)
			? locals.supabase
					.from('mentor_subteam_preferences')
					.select('subteam_id')
					.eq('mentor_id', user.id)
			: Promise.resolve({ data: [] as { subteam_id: string }[] }),
		computeUserRanks(locals.supabase, [user.id]),
		locals.supabase
			.from('parent_student_links')
			.select('id,parent_user_id,status,profiles!parent_student_links_parent_user_id_fkey(id,full_name,email)')
			.eq('student_user_id', user.id)
			.eq('status', 'active'),
		locals.supabase
			.from('parent_link_codes')
			.select('id,code,expires_at,used_at')
			.eq('student_user_id', user.id)
			.is('used_at', null)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false })
			.limit(1)
	]);

	const mentorTeamIds = (mentorPrefsResult.data ?? []).map((row: { subteam_id: string }) => row.subteam_id);
	const normalizedMemberships = (memberships ?? []).map((row: any) => ({
		teamId: String(row.team_id),
		categorySlug: String(row.category_slug ?? ''),
		teamName: String(row.teams?.name ?? ''),
		teamSlug: String(row.teams?.slug ?? ''),
		teamGroupId: String(row.teams?.team_group_id ?? ''),
		teamGroupName: String(row.teams?.team_groups?.name ?? ''),
		teamGroupSlug: String(row.teams?.team_groups?.slug ?? ''),
		designator: String(row.teams?.team_groups?.designator ?? '')
	}));
	const teamGroups = Array.from(
		new Map(
			normalizedMemberships
				.filter((row) => row.teamGroupId)
				.map((row) => [
					row.teamGroupId,
					{
						id: row.teamGroupId,
						name: row.teamGroupName || row.teamGroupSlug || 'Team group',
						slug: row.teamGroupSlug
					}
				])
		).values()
	).sort((a, b) => a.name.localeCompare(b.name));
	const primaryTeamGroupId = String(primaryTeamRow?.team_group_id ?? '');
	const rankSummary = rankMap.get(user.id);
	const courseCompletions = rankSummary?.courseCompletions ?? 0;
	const progressSummary = `${courseCompletions} module${courseCompletions === 1 ? '' : 's'} completed`;
	const subteamNameById = new Map((subteams ?? []).map((s: any) => [String(s.id), String(s.name)]));
	const perTrack = new Map<string, number>();
	const { data: completedRows } = await locals.supabase
		.from('certifications')
		.select('node_id,nodes!inner(title,subteam_id)')
		.eq('user_id', user.id)
		.eq('status', 'completed');
	for (const row of completedRows ?? []) {
		const trackId = String((row as any)?.nodes?.subteam_id ?? '');
		if (trackId) perTrack.set(trackId, (perTrack.get(trackId) ?? 0) + 1);
	}
	const trackRanks = Array.from(perTrack.entries())
		.map(([trackId, count]) => ({
			trackId,
			trackName: subteamNameById.get(trackId) ?? 'Unknown track',
			count,
			tier: count >= 5 ? 'Expert' : count >= 3 ? 'Skilled' : 'Novice'
		}))
		.sort((a, b) => b.count - a.count || a.trackName.localeCompare(b.trackName));

	const overallRank = rankSummary?.rank?.name ?? 'Rookie';
	const masteredTracks = trackRanks.filter((t) => t.tier === 'Expert').length;
	const specialTitles = [
		...(masteredTracks >= 2 ? ['Cross-Track Ace'] : []),
		...(masteredTracks >= 3 ? ['Multi-Track Legend'] : [])
	];

	const { data: qrProfile } = await locals.supabase
		.from('profiles')
		.select('passport_qr_version')
		.eq('id', user.id)
		.single();
	const qrVersion = Number(qrProfile?.passport_qr_version ?? 0);
	const qrDataUrl = await buildPassportQrDataUrl(user.id, qrVersion);

	return {
		profile,
		teamGroups,
		teamMemberships: normalizedMemberships,
		primaryTeamGroupId,
		mentorTeamIds,
		qrDataUrl,
		badges: rankSummary?.badges ?? [],
		progressSummary,
		overallRank,
		trackRanks,
		specialTitles,
		rankSummary,
		parentLinks: (parentLinks ?? []).map((row: any) => ({
			id: String(row.id),
			status: String(row.status ?? ''),
			parent: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null
		})),
		activeParentLinkCode: parentCodes?.[0] ?? null
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const fullName = String(form.get('full_name') ?? '').trim();
		const bio = String(form.get('bio') ?? '').trim().slice(0, 500);
		let avatarUrl = String(form.get('avatar_url') ?? '').trim().slice(0, 2048);

		if (!fullName) return fail(400, { error: 'Display name is required.' });
		if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
			return fail(400, { error: 'Avatar URL must start with http(s)://' });
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ full_name: fullName, bio, avatar_url: avatarUrl })
			.eq('id', user.id);
		if (error) return fail(400, { error: error.message });

		return { ok: true };
	},
	setPrimaryTeam: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		if (!teamGroupId) {
			const { error } = await locals.supabase
				.from('profile_primary_teams')
				.delete()
				.eq('user_id', user.id);
			if (error) return fail(400, { error: error.message, section: 'primary' });
			return { ok: true, section: 'primary' };
		}
		const { data: membership, error: membershipError } = await locals.supabase
			.from('profile_teams')
			.select('team_id,teams!inner(team_group_id)')
			.eq('user_id', user.id)
			.eq('teams.team_group_id', teamGroupId)
			.limit(1)
			.maybeSingle();
		if (membershipError) return fail(400, { error: membershipError.message, section: 'primary' });
		if (!membership) {
			return fail(400, {
				error: 'Select a main team group you are currently assigned to.',
				section: 'primary'
			});
		}
		const { error } = await locals.supabase
			.from('profile_primary_teams')
			upsert({ user_id: user.id, team_group_id: teamGroupId }, { onConflict: 'user_id' });
		if (error) return fail(400, { error: error.message, section: 'primary' });
		return { ok: true, section: 'primary' };
	},
	saveMentorTeams: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });

		const form = await request.formData();
		const ids = form
			.getAll('mentor_team_ids')
			.map((v) => String(v))
			.filter(Boolean);

		const { error: delError } = await locals.supabase
			.from('mentor_subteam_preferences')
			.delete()
			.eq('mentor_id', user.id);
		if (delError) return fail(400, { error: delError.message, section: 'mentor' });

		if (ids.length > 0) {
			const rows = ids.map((subteamId) => ({ mentor_id: user.id, subteam_id: subteamId }));
			const { error: insertError } = await locals.supabase
				.from('mentor_subteam_preferences')
				.insert(rows);
			if (insertError) return fail(400, { error: insertError.message, section: 'mentor' });
		}
		return { ok: true, section: 'mentor' };
	},
	generateParentLinkCode: async ({ locals }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		if (profile.is_parent_guardian) return fail(403, { error: 'Parent accounts cannot generate student link codes.' });
		const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let code = '';
		for (let i = 0; i < 8; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
		const { error } = await locals.supabase.from('parent_link_codes').insert({
			student_user_id: user.id,
			code,
			expires_at: expiresAt
		});
		if (error) return fail(400, { error: error.message, section: 'parent-link' });
		return { ok: true, section: 'parent-link' };
	},
	revokeParentLink: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const linkId = String(form.get('link_id') ?? '').trim();
		if (!linkId) return fail(400, { error: 'Link is required.', section: 'parent-link' });
		const { error } = await locals.supabase
			.from('parent_student_links')
			.update({ status: 'revoked', updated_at: new Date().toISOString() })
			.eq('id', linkId)
			.eq('student_user_id', user.id);
		if (error) return fail(400, { error: error.message, section: 'parent-link' });
		return { ok: true, section: 'parent-link' };
	}
};
