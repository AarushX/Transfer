let cachedOrgName: string | null = null;
let cachedTheme: Record<string, string> | null = null;
let cachedIconDataUrl: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const load = async ({ locals }) => {
	const { session, user, profile } = await locals.safeGetSession();

	let org: { name?: string | null } | null = null;
	let theme: Record<string, string> = {
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
	let iconDataUrl = '';
	let needsOnboarding = false;
	if (!cachedOrgName || Date.now() > cacheExpiresAt || user) {
		const orgPromise = locals.supabase
			.from('org_settings')
			.select(
				'name,color_background,color_surface,color_surface_alt,color_border,color_text,color_text_muted,color_accent,color_accent_text,icon_data_url,color_success,color_warning,color_danger,color_info,color_link,color_link_hover,color_input_bg,color_input_text,color_table_header_bg,color_table_row_hover,color_overlay_scrim,color_focus_ring,color_button_secondary_bg,color_button_secondary_text,color_button_secondary_border'
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
				background: String(orgResp.data?.color_background ?? '#0b1220'),
				surface: String(orgResp.data?.color_surface ?? '#121a2b'),
				surfaceAlt: String(orgResp.data?.color_surface_alt ?? '#1a2438'),
				border: String(orgResp.data?.color_border ?? '#2a3754'),
				text: String(orgResp.data?.color_text ?? '#e6edf7'),
				textMuted: String(orgResp.data?.color_text_muted ?? '#9fb0cc'),
				accent: String(orgResp.data?.color_accent ?? '#8b5cf6'),
				accentText: String(orgResp.data?.color_accent_text ?? '#ffffff'),
				success: String(orgResp.data?.color_success ?? '#22c55e'),
				warning: String(orgResp.data?.color_warning ?? '#f59e0b'),
				danger: String(orgResp.data?.color_danger ?? '#f43f5e'),
				info: String(orgResp.data?.color_info ?? '#06b6d4'),
				link: String(orgResp.data?.color_link ?? '#60a5fa'),
				linkHover: String(orgResp.data?.color_link_hover ?? '#3b82f6'),
				inputBg: String(orgResp.data?.color_input_bg ?? '#111a2e'),
				inputText: String(orgResp.data?.color_input_text ?? '#e6edf7'),
				tableHeaderBg: String(orgResp.data?.color_table_header_bg ?? '#1a2438'),
				tableRowHover: String(orgResp.data?.color_table_row_hover ?? '#182136'),
				overlayScrim: String(orgResp.data?.color_overlay_scrim ?? '#020617'),
				focusRing: String(orgResp.data?.color_focus_ring ?? '#a78bfa'),
				buttonSecondaryBg: String(orgResp.data?.color_button_secondary_bg ?? '#1a2438'),
				buttonSecondaryText: String(orgResp.data?.color_button_secondary_text ?? '#d6e2f5'),
				buttonSecondaryBorder: String(orgResp.data?.color_button_secondary_border ?? '#334766')
			};
			iconDataUrl = String(orgResp.data?.icon_data_url ?? '');
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
				background: String(orgResp.data?.color_background ?? '#0b1220'),
				surface: String(orgResp.data?.color_surface ?? '#121a2b'),
				surfaceAlt: String(orgResp.data?.color_surface_alt ?? '#1a2438'),
				border: String(orgResp.data?.color_border ?? '#2a3754'),
				text: String(orgResp.data?.color_text ?? '#e6edf7'),
				textMuted: String(orgResp.data?.color_text_muted ?? '#9fb0cc'),
				accent: String(orgResp.data?.color_accent ?? '#8b5cf6'),
				accentText: String(orgResp.data?.color_accent_text ?? '#ffffff'),
				success: String(orgResp.data?.color_success ?? '#22c55e'),
				warning: String(orgResp.data?.color_warning ?? '#f59e0b'),
				danger: String(orgResp.data?.color_danger ?? '#f43f5e'),
				info: String(orgResp.data?.color_info ?? '#06b6d4'),
				link: String(orgResp.data?.color_link ?? '#60a5fa'),
				linkHover: String(orgResp.data?.color_link_hover ?? '#3b82f6'),
				inputBg: String(orgResp.data?.color_input_bg ?? '#111a2e'),
				inputText: String(orgResp.data?.color_input_text ?? '#e6edf7'),
				tableHeaderBg: String(orgResp.data?.color_table_header_bg ?? '#1a2438'),
				tableRowHover: String(orgResp.data?.color_table_row_hover ?? '#182136'),
				overlayScrim: String(orgResp.data?.color_overlay_scrim ?? '#020617'),
				focusRing: String(orgResp.data?.color_focus_ring ?? '#a78bfa'),
				buttonSecondaryBg: String(orgResp.data?.color_button_secondary_bg ?? '#1a2438'),
				buttonSecondaryText: String(orgResp.data?.color_button_secondary_text ?? '#d6e2f5'),
				buttonSecondaryBorder: String(orgResp.data?.color_button_secondary_border ?? '#334766')
			};
			iconDataUrl = String(orgResp.data?.icon_data_url ?? '');
		}
	}

	if (!cachedOrgName || Date.now() > cacheExpiresAt || user) {
		cachedOrgName = org?.name ?? 'Workspace';
		cachedTheme = theme;
		cachedIconDataUrl = iconDataUrl;
		cacheExpiresAt = Date.now() + CACHE_TTL_MS;
	}

	return {
		session,
		user,
		profile,
		orgName: cachedOrgName,
		orgTheme: cachedTheme ?? theme,
		orgIconDataUrl: cachedIconDataUrl ?? iconDataUrl,
		needsOnboarding
	};
};
