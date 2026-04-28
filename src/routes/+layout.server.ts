let cachedOrgName: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const load = async ({ locals }) => {
	const { session, user, profile } = await locals.safeGetSession();

	if (!cachedOrgName || Date.now() > cacheExpiresAt) {
		const { data: org } = await locals.supabase
			.from('org_settings')
			.select('name')
			.eq('id', 1)
			.maybeSingle();
		cachedOrgName = org?.name ?? 'Workspace';
		cacheExpiresAt = Date.now() + CACHE_TTL_MS;
	}

	return {
		session,
		user,
		profile,
		orgName: cachedOrgName
	};
};
