import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');
	const { data: org } = await locals.supabase
		.from('org_settings')
		.select(
			'name,color_background,color_surface,color_surface_alt,color_border,color_text,color_text_muted,color_accent,color_accent_text,icon_data_url,color_success,color_warning,color_danger,color_info,color_link,color_link_hover,color_input_bg,color_input_text,color_table_header_bg,color_table_row_hover,color_overlay_scrim,color_focus_ring,color_button_secondary_bg,color_button_secondary_text,color_button_secondary_border'
		)
		.eq('id', 1)
		.maybeSingle();
	return {
		orgName: org?.name ?? 'Workspace',
		colorBackground: org?.color_background ?? '#0b1220',
		colorSurface: org?.color_surface ?? '#121a2b',
		colorSurfaceAlt: org?.color_surface_alt ?? '#1a2438',
		colorBorder: org?.color_border ?? '#2a3754',
		colorText: org?.color_text ?? '#e6edf7',
		colorTextMuted: org?.color_text_muted ?? '#9fb0cc',
		colorAccent: org?.color_accent ?? '#8b5cf6',
		colorAccentText: org?.color_accent_text ?? '#ffffff',
		iconDataUrl: org?.icon_data_url ?? '',
		colorSuccess: org?.color_success ?? '#22c55e',
		colorWarning: org?.color_warning ?? '#f59e0b',
		colorDanger: org?.color_danger ?? '#f43f5e',
		colorInfo: org?.color_info ?? '#06b6d4',
		colorLink: org?.color_link ?? '#60a5fa',
		colorLinkHover: org?.color_link_hover ?? '#3b82f6',
		colorInputBg: org?.color_input_bg ?? '#111a2e',
		colorInputText: org?.color_input_text ?? '#e6edf7',
		colorTableHeaderBg: org?.color_table_header_bg ?? '#1a2438',
		colorTableRowHover: org?.color_table_row_hover ?? '#182136',
		colorOverlayScrim: org?.color_overlay_scrim ?? '#020617',
		colorFocusRing: org?.color_focus_ring ?? '#a78bfa',
		colorButtonSecondaryBg: org?.color_button_secondary_bg ?? '#1a2438',
		colorButtonSecondaryText: org?.color_button_secondary_text ?? '#d6e2f5',
		colorButtonSecondaryBorder: org?.color_button_secondary_border ?? '#334766'
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });
		const colorBackground = String(form.get('color_background') ?? '#0b1220').trim();
		const colorSurface = String(form.get('color_surface') ?? '#121a2b').trim();
		const colorSurfaceAlt = String(form.get('color_surface_alt') ?? '#1a2438').trim();
		const colorBorder = String(form.get('color_border') ?? '#2a3754').trim();
		const colorText = String(form.get('color_text') ?? '#e6edf7').trim();
		const colorTextMuted = String(form.get('color_text_muted') ?? '#9fb0cc').trim();
		const colorAccent = String(form.get('color_accent') ?? '#8b5cf6').trim();
		const colorAccentText = String(form.get('color_accent_text') ?? '#ffffff').trim();
		const iconDataUrl = String(form.get('icon_data_url') ?? '').trim();
		const clearIcon = String(form.get('clear_icon') ?? '') === 'on';
		const colorSuccess = String(form.get('color_success') ?? '#22c55e').trim();
		const colorWarning = String(form.get('color_warning') ?? '#f59e0b').trim();
		const colorDanger = String(form.get('color_danger') ?? '#f43f5e').trim();
		const colorInfo = String(form.get('color_info') ?? '#06b6d4').trim();
		const colorLink = String(form.get('color_link') ?? '#60a5fa').trim();
		const colorLinkHover = String(form.get('color_link_hover') ?? '#3b82f6').trim();
		const colorInputBg = String(form.get('color_input_bg') ?? '#111a2e').trim();
		const colorInputText = String(form.get('color_input_text') ?? '#e6edf7').trim();
		const colorTableHeaderBg = String(form.get('color_table_header_bg') ?? '#1a2438').trim();
		const colorTableRowHover = String(form.get('color_table_row_hover') ?? '#182136').trim();
		const colorOverlayScrim = String(form.get('color_overlay_scrim') ?? '#020617').trim();
		const colorFocusRing = String(form.get('color_focus_ring') ?? '#a78bfa').trim();
		const colorButtonSecondaryBg = String(form.get('color_button_secondary_bg') ?? '#1a2438').trim();
		const colorButtonSecondaryText = String(form.get('color_button_secondary_text') ?? '#d6e2f5').trim();
		const colorButtonSecondaryBorder = String(form.get('color_button_secondary_border') ?? '#334766').trim();
		const { error } = await locals.supabase
			.from('org_settings')
			.upsert(
				{
					id: 1,
					name,
					color_background: colorBackground,
					color_surface: colorSurface,
					color_surface_alt: colorSurfaceAlt,
					color_border: colorBorder,
					color_text: colorText,
					color_text_muted: colorTextMuted,
					color_accent: colorAccent,
					color_accent_text: colorAccentText,
					icon_data_url: clearIcon ? '' : iconDataUrl,
					color_success: colorSuccess,
					color_warning: colorWarning,
					color_danger: colorDanger,
					color_info: colorInfo,
					color_link: colorLink,
					color_link_hover: colorLinkHover,
					color_input_bg: colorInputBg,
					color_input_text: colorInputText,
					color_table_header_bg: colorTableHeaderBg,
					color_table_row_hover: colorTableRowHover,
					color_overlay_scrim: colorOverlayScrim,
					color_focus_ring: colorFocusRing,
					color_button_secondary_bg: colorButtonSecondaryBg,
					color_button_secondary_text: colorButtonSecondaryText,
					color_button_secondary_border: colorButtonSecondaryBorder
				},
				{ onConflict: 'id' }
			);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
