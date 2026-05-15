let cachedOrgName: string | null = null;
let cachedTheme: Record<string, string> | null = null;
let cachedIconDataUrl: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const themeDefaults: Record<string, string> = {
	background: '#0b1220',
	surface: '#121a2b',
	surfaceAlt: '#1a2438',
	border: '#2a3754',
	text: '#e6edf7',
	textMuted: '#9fb0cc',
	accent: '#8b5cf6',
	accentText: '#ffffff',
	success: '#22c55e',
	warning: '#f59e0b',
	danger: '#f43f5e',
	info: '#06b6d4',
	link: '#60a5fa',
	linkHover: '#3b82f6',
	inputBg: '#111a2e',
	inputText: '#e6edf7',
	tableHeaderBg: '#1a2438',
	tableRowHover: '#182136',
	overlayScrim: '#020617',
	focusRing: '#a78bfa',
	buttonSecondaryBg: '#1a2438',
	buttonSecondaryText: '#d6e2f5',
	buttonSecondaryBorder: '#334766'
};

const themeColumnMap: [string, string][] = [
	['background', 'color_background'],
	['surface', 'color_surface'],
	['surfaceAlt', 'color_surface_alt'],
	['border', 'color_border'],
	['text', 'color_text'],
	['textMuted', 'color_text_muted'],
	['accent', 'color_accent'],
	['accentText', 'color_accent_text'],
	['success', 'color_success'],
	['warning', 'color_warning'],
	['danger', 'color_danger'],
	['info', 'color_info'],
	['link', 'color_link'],
	['linkHover', 'color_link_hover'],
	['inputBg', 'color_input_bg'],
	['inputText', 'color_input_text'],
	['tableHeaderBg', 'color_table_header_bg'],
	['tableRowHover', 'color_table_row_hover'],
	['overlayScrim', 'color_overlay_scrim'],
	['focusRing', 'color_focus_ring'],
	['buttonSecondaryBg', 'color_button_secondary_bg'],
	['buttonSecondaryText', 'color_button_secondary_text'],
	['buttonSecondaryBorder', 'color_button_secondary_border']
];

function extractTheme(row: Record<string, unknown> | null): Record<string, string> {
	const theme: Record<string, string> = {};
	for (const [key, col] of themeColumnMap) {
		theme[key] = String((row as any)?.[col] ?? themeDefaults[key]);
	}
	return theme;
}

export const load = async ({ locals }) => {
	const { session, user, profile } = await locals.safeGetSession();

	let orgName = cachedOrgName;
	let theme = cachedTheme ?? { ...themeDefaults };
	let iconDataUrl = cachedIconDataUrl ?? '';
	let needsOnboarding = false;

	const stale = !cachedOrgName || Date.now() > cacheExpiresAt;

	if (stale || user) {
		const orgColumns =
			'name,icon_data_url,' + themeColumnMap.map(([, col]) => col).join(',');

		const orgPromise = locals.supabase
			.from('org_settings')
			.select(orgColumns)
			.eq('id', 1)
			.maybeSingle();

		if (user) {
			const [orgResp, currentResp, primaryResp, requiredResp] = await Promise.all([
				orgPromise,
				locals.supabase.from('profile_teams').select('team_id,category_slug').eq('user_id', user.id),
				locals.supabase.from('profile_primary_teams').select('team_group_id,team_groups(name,designator)').eq('user_id', user.id).maybeSingle(),
				locals.supabase
					.from('subteam_categories')
					.select('slug')
					.eq('is_required_onboarding', true)
			]);

			const org = orgResp.data as Record<string, unknown> | null;
			orgName = String(org?.name ?? 'Workspace');
			theme = extractTheme(org);
			iconDataUrl = String(org?.icon_data_url ?? '');

			const currentTeams = currentResp.data ?? [];
			const selectedDesignators = new Set(
				currentTeams.map((row: any) => String(row.category_slug ?? '')).filter(Boolean)
			);
			const required = (requiredResp.data ?? []).map((row: any) => String(row.slug));

			if (profile?.is_parent_guardian) {
				needsOnboarding = false;
			} else {
				needsOnboarding =
					currentTeams.length === 0 ||
					!String(primaryResp.data?.team_group_id ?? '') ||
					required.some((slug) => !selectedDesignators.has(slug));
			}
		} else {
			const orgResp = await orgPromise;
			const org = orgResp.data as Record<string, unknown> | null;
			orgName = String(org?.name ?? 'Workspace');
			theme = extractTheme(org);
			iconDataUrl = String(org?.icon_data_url ?? '');
		}

		cachedOrgName = orgName;
		cachedTheme = theme;
		cachedIconDataUrl = iconDataUrl;
		cacheExpiresAt = Date.now() + CACHE_TTL_MS;
	}

	let primaryTeamName: string | null = null;
	let leadTeamName: string | null = null;
	let leadSubteamName: string | null = null;
	let userSubteams: Array<{ slug: string; name: string }> = [];
	if (user) {
		const { data: primaryRow } = await locals.supabase
			.from('profile_primary_teams')
			.select('team_group_id,team_groups(name,designator)')
			.eq('user_id', user.id)
			.maybeSingle();
		const pt = (primaryRow as any)?.team_groups;
		if (pt) {
			const des = pt.designator && pt.designator.toLowerCase() !== 'general' ? ` · ${pt.designator}` : '';
			primaryTeamName = `${pt.name}${des}`;
		}
		const primaryTeamGroupId = (primaryRow as any)?.team_group_id;

		// Load subteams the user is on within their primary team_group
		if (primaryTeamGroupId) {
			const [{ data: profileTeamsRows }, { data: subteamCategoryRows }] = await Promise.all([
				locals.supabase
					.from('profile_teams')
					.select('category_slug')
					.eq('user_id', user.id)
					.eq('team_group_id', primaryTeamGroupId),
				locals.supabase.from('subteam_categories').select('slug,name,sort_order').order('sort_order')
			]);
			const slugs = new Set((profileTeamsRows ?? []).map((r: any) => r.category_slug).filter(Boolean));
			userSubteams = (subteamCategoryRows ?? [])
				.filter((c: any) => slugs.has(c.slug) && c.slug !== 'general')
				.map((c: any) => ({ slug: c.slug, name: c.name }));
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

	return {
		session,
		user,
		profile,
		orgName: cachedOrgName!,
		orgTheme: cachedTheme ?? theme,
		orgIconDataUrl: cachedIconDataUrl ?? iconDataUrl,
		needsOnboarding,
		primaryTeamName,
		leadTeamName,
		leadSubteamName,
		userSubteams
	};
};
