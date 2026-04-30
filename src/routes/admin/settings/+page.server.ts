import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');
	const { data: org } = await locals.supabase
		.from('org_settings')
		.select(
			'name,color_background,color_surface,color_surface_alt,color_border,color_text,color_text_muted,color_accent,color_accent_text'
		)
		.eq('id', 1)
		.maybeSingle();
	return {
		orgName: org?.name ?? 'Workspace',
		colorBackground: org?.color_background ?? '#020617',
		colorSurface: org?.color_surface ?? '#0f172a',
		colorSurfaceAlt: org?.color_surface_alt ?? '#1e293b',
		colorBorder: org?.color_border ?? '#334155',
		colorText: org?.color_text ?? '#e2e8f0',
		colorTextMuted: org?.color_text_muted ?? '#94a3b8',
		colorAccent: org?.color_accent ?? '#facc15',
		colorAccentText: org?.color_accent_text ?? '#0f172a'
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });
		const colorBackground = String(form.get('color_background') ?? '#020617').trim();
		const colorSurface = String(form.get('color_surface') ?? '#0f172a').trim();
		const colorSurfaceAlt = String(form.get('color_surface_alt') ?? '#1e293b').trim();
		const colorBorder = String(form.get('color_border') ?? '#334155').trim();
		const colorText = String(form.get('color_text') ?? '#e2e8f0').trim();
		const colorTextMuted = String(form.get('color_text_muted') ?? '#94a3b8').trim();
		const colorAccent = String(form.get('color_accent') ?? '#facc15').trim();
		const colorAccentText = String(form.get('color_accent_text') ?? '#0f172a').trim();
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
					color_accent_text: colorAccentText
				},
				{ onConflict: 'id' }
			);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
