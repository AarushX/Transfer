let cachedOrgName: string | null = null;
let cachedTheme: Record<string, string> | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const load = async ({ locals }) => {
	const { session, user, profile } = await locals.safeGetSession();

	let org: { name?: string | null } | null = null;
	let theme: Record<string, string> = {
		background: '#020617',
		surface: '#0f172a',
		surfaceAlt: '#1e293b',
		border: '#334155',
		text: '#e2e8f0',
		textMuted: '#94a3b8',
		accent: '#facc15',
		accentText: '#0f172a'
	};
	let needsOnboarding = false;
	if (!cachedOrgName || Date.now() > cacheExpiresAt || user) {
		const orgPromise = locals.supabase
			.from('org_settings')
			.select(
				'name,color_background,color_surface,color_surface_alt,color_border,color_text,color_text_muted,color_accent,color_accent_text'
			)
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
			theme = {
				background: String(orgResp.data?.color_background ?? '#020617'),
				surface: String(orgResp.data?.color_surface ?? '#0f172a'),
				surfaceAlt: String(orgResp.data?.color_surface_alt ?? '#1e293b'),
				border: String(orgResp.data?.color_border ?? '#334155'),
				text: String(orgResp.data?.color_text ?? '#e2e8f0'),
				textMuted: String(orgResp.data?.color_text_muted ?? '#94a3b8'),
				accent: String(orgResp.data?.color_accent ?? '#facc15'),
				accentText: String(orgResp.data?.color_accent_text ?? '#0f172a')
			};
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
			theme = {
				background: String(orgResp.data?.color_background ?? '#020617'),
				surface: String(orgResp.data?.color_surface ?? '#0f172a'),
				surfaceAlt: String(orgResp.data?.color_surface_alt ?? '#1e293b'),
				border: String(orgResp.data?.color_border ?? '#334155'),
				text: String(orgResp.data?.color_text ?? '#e2e8f0'),
				textMuted: String(orgResp.data?.color_text_muted ?? '#94a3b8'),
				accent: String(orgResp.data?.color_accent ?? '#facc15'),
				accentText: String(orgResp.data?.color_accent_text ?? '#0f172a')
			};
		}
	}

	if (!cachedOrgName || Date.now() > cacheExpiresAt) {
		cachedOrgName = org?.name ?? 'Workspace';
		cachedTheme = theme;
		cacheExpiresAt = Date.now() + CACHE_TTL_MS;
	}

	return {
		session,
		user,
		profile,
		orgName: cachedOrgName,
		orgTheme: cachedTheme ?? theme,
		needsOnboarding
	};
};
