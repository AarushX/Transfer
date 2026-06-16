import { computeMentorQueueCount } from '$lib/server/sidebar-data';

let cachedOrgName: string | null = null;
let cachedIconDataUrl: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const load = async ({ locals }) => {
	const { session, user, profile } = await locals.safeGetSession();

	let orgName = cachedOrgName;
	let iconDataUrl = cachedIconDataUrl ?? '';
	let needsOnboarding = false;
	let unreadNotificationCount = 0;

	// Populated by the per-user Promise.all below and reused later in this load
	// (primary team name + subteams) so we don't re-query the same rows.
	let primaryRowData: any = null;
	let profileTeamsRows: Array<{ team_id: any; category_slug: any; team_group_id: any }> = [];

	const stale = !cachedOrgName || Date.now() > cacheExpiresAt;

	if (stale || user) {
		const orgPromise = locals.supabase
			.from('org_settings')
			.select('name,icon_data_url')
			.eq('id', 1)
			.maybeSingle();

		if (user) {
			const [orgResp, currentResp, primaryResp, requiredResp, stepsResp, progressResp, unreadResp] =
				await Promise.all([
					orgPromise,
					locals.supabase
						.from('profile_teams')
						.select('team_id,category_slug,team_group_id')
						.eq('user_id', user.id),
					locals.supabase
						.from('profile_primary_teams')
						.select('team_group_id,team_groups(name,designator)')
						.eq('user_id', user.id)
						.maybeSingle(),
					locals.supabase
						.from('subteam_categories')
						.select('slug')
						.eq('is_required_onboarding', true),
					locals.supabase.from('onboarding_steps').select('id').eq('is_active', true),
					locals.supabase
						.from('onboarding_progress')
						.select('step_id')
						.eq('user_id', user.id)
						.not('completed_at', 'is', null),
					locals.supabase
						.from('notifications')
						.select('id', { count: 'exact', head: true })
						.is('read_at', null)
				]);

			unreadNotificationCount = unreadResp.count ?? 0;

			const org = orgResp.data as Record<string, unknown> | null;
			orgName = String(org?.name ?? 'Workspace');
			iconDataUrl = String(org?.icon_data_url ?? '');

			const currentTeams = currentResp.data ?? [];
			primaryRowData = primaryResp.data ?? null;
			profileTeamsRows = currentTeams as any[];
			const selectedDesignators = new Set(
				currentTeams.map((row: any) => String(row.category_slug ?? '')).filter(Boolean)
			);
			const required = (requiredResp.data ?? []).map((row: any) => String(row.slug));

			const stepIds = new Set((stepsResp.data ?? []).map((r: any) => String(r.id)));
			const doneStepIds = new Set((progressResp.data ?? []).map((r: any) => String(r.step_id)));
			let stepsIncomplete = false;
			for (const id of stepIds) {
				if (!doneStepIds.has(id)) {
					stepsIncomplete = true;
					break;
				}
			}

			if (profile?.is_parent_guardian) {
				needsOnboarding = false;
			} else {
				needsOnboarding =
					currentTeams.length === 0 ||
					!String(primaryResp.data?.team_group_id ?? '') ||
					required.some((slug) => !selectedDesignators.has(slug)) ||
					(stepIds.size > 0 && stepsIncomplete);
			}
		} else {
			const orgResp = await orgPromise;
			const org = orgResp.data as Record<string, unknown> | null;
			orgName = String(org?.name ?? 'Workspace');
			iconDataUrl = String(org?.icon_data_url ?? '');
		}

		cachedOrgName = orgName;
		cachedIconDataUrl = iconDataUrl;
		cacheExpiresAt = Date.now() + CACHE_TTL_MS;
	}

	let primaryTeamName: string | null = null;
	let leadTeamName: string | null = null;
	let leadSubteamName: string | null = null;
	let userSubteams: Array<{ slug: string; name: string }> = [];
	if (user) {
		// Reuse the rows already fetched in the per-user Promise.all above instead
		// of re-querying profile_primary_teams / profile_teams.
		const pt = (primaryRowData as any)?.team_groups;
		if (pt) {
			const des =
				pt.designator && pt.designator.toLowerCase() !== 'general' ? ` · ${pt.designator}` : '';
			primaryTeamName = `${pt.name}${des}`;
		}
		const primaryTeamGroupId = (primaryRowData as any)?.team_group_id;

		// Load subteams the user is on within their primary team_group.
		// Display the actual team name the user picked at onboarding (teams.name)
		// but keep the route slug as category_slug — the /team/[subteam] route
		// resolves [subteam] against subteam_categories.slug, so using teams.slug
		// would 404. The teams embed is done as an explicit second query because
		// profile_teams has both a single FK and a composite FK to teams, which
		// makes the supabase-js `teams!inner(...)` relationship hint ambiguous
		// and returns no rows.
		if (primaryTeamGroupId) {
			const primaryGroupRows = profileTeamsRows.filter(
				(r: any) => String(r.team_group_id ?? '') === String(primaryTeamGroupId)
			);
			const teamIds = Array.from(
				new Set(
					primaryGroupRows.map((r: any) => (r.team_id ? String(r.team_id) : '')).filter(Boolean)
				)
			);
			let teamNameById = new Map<string, string>();
			if (teamIds.length > 0) {
				const { data: teamRows } = await locals.supabase
					.from('teams')
					.select('id,name')
					.in('id', teamIds);
				teamNameById = new Map((teamRows ?? []).map((r: any) => [String(r.id), String(r.name)]));
			}
			userSubteams = primaryGroupRows
				.filter(
					(r: any) => r.category_slug && String(r.category_slug ?? '') !== 'general' && r.team_id
				)
				.map((r: any) => ({
					slug: String(r.category_slug),
					name: teamNameById.get(String(r.team_id)) ?? String(r.category_slug)
				}))
				.sort((a, b) => a.name.localeCompare(b.name));
		}

		// Fetch lead info via a defensive query — column may not exist if migration hasn't run yet
		try {
			const { data: leadFields } = await locals.supabase
				.from('profiles')
				.select('lead_team_group_id,lead_subteam_id')
				.eq('id', user.id)
				.maybeSingle();
			if ((leadFields as any)?.lead_team_group_id) {
				const { data: tg } = await locals.supabase
					.from('team_groups')
					.select('name,designator')
					.eq('id', (leadFields as any).lead_team_group_id)
					.maybeSingle();
				if (tg) leadTeamName = tg.designator ? `${tg.name} · ${tg.designator}` : tg.name;
			}
			if ((leadFields as any)?.lead_subteam_id) {
				const { data: st } = await locals.supabase
					.from('subteams')
					.select('name')
					.eq('id', (leadFields as any).lead_subteam_id)
					.maybeSingle();
				leadSubteamName = st?.name ?? null;
			}
		} catch {
			// Migration not applied yet — graceful no-op
		}
	}

	let mentorQueueCount = 0;
	if (user && profile) {
		mentorQueueCount = await computeMentorQueueCount(locals.supabase, profile);
	}

	return {
		session,
		user,
		profile,
		orgName: cachedOrgName!,
		orgIconDataUrl: cachedIconDataUrl ?? iconDataUrl,
		needsOnboarding,
		primaryTeamName,
		leadTeamName,
		leadSubteamName,
		userSubteams,
		mentorQueueCount,
		unreadNotificationCount
	};
};
