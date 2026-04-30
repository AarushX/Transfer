let cachedOrgName: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const load = async ({ locals }) => {
	const { session, user, profile } = await locals.safeGetSession();

	let org: { name?: string | null } | null = null;
	let needsOnboarding = false;
	if (!cachedOrgName || Date.now() > cacheExpiresAt || user) {
		const orgPromise = locals.supabase
			.from('org_settings')
			.select('name')
			.eq('id', 1)
			.maybeSingle();
		if (user) {
			const [orgResp, currentResp, primaryResp, requiredResp] = await Promise.all([
				orgPromise,
				locals.supabase.from('profile_teams').select('team_id,category_slug').eq('user_id', user.id),
				locals.supabase.from('profile_primary_teams').select('team_group_id').eq('user_id', user.id).maybeSingle(),
				locals.supabase
					.from('subteam_categories')
					.select('slug')
					.eq('is_required_onboarding', true)
			]);
			org = orgResp.data;
			const currentTeams = currentResp.data ?? [];
			const selectedDesignators = new Set(
				currentTeams.map((row: any) => String(row.category_slug ?? '')).filter(Boolean)
			);
			const required = (requiredResp.data ?? []).map((row: any) => String(row.slug));
			needsOnboarding =
				currentTeams.length === 0 ||
				!String(primaryResp.data?.team_group_id ?? '') ||
				required.some((slug) => !selectedDesignators.has(slug));
		} else {
			const orgResp = await orgPromise;
			org = orgResp.data;
		}
	}

	if (!cachedOrgName || Date.now() > cacheExpiresAt) {
		cachedOrgName = org?.name ?? 'Workspace';
		cacheExpiresAt = Date.now() + CACHE_TTL_MS;
	}

	return {
		session,
		user,
		profile,
		orgName: cachedOrgName,
		needsOnboarding
	};
};
