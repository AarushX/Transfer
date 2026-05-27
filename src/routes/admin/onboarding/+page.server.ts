import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

const VALID_KINDS = new Set(['welcome', 'team_pick', 'external_link', 'content']);

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isAdmin(profile)) throw redirect(303, '/dashboard');

	const { data: steps } = await locals.supabase
		.from('onboarding_steps')
		.select(
			'id,position,kind,title,body,link_url,requires_link_click,requires_checkbox,is_active,updated_at'
		)
		.order('position', { ascending: true });

	return {
		steps: steps ?? []
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const kind = String(form.get('kind') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		if (!VALID_KINDS.has(kind)) return fail(400, { error: 'Invalid step kind.' });
		if (!title) return fail(400, { error: 'Title required.' });

		const { data: maxRow } = await service
			.from('onboarding_steps')
			.select('position')
			.order('position', { ascending: false })
			.limit(1)
			.maybeSingle();
		const nextPosition = (maxRow?.position ?? 0) + 10;

		const { error } = await service.from('onboarding_steps').insert({
			kind,
			title,
			position: nextPosition,
			body: '',
			link_url: '',
			requires_link_click: false,
			requires_checkbox: false,
			is_active: true
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	update: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing step id.' });
		const update: Record<string, any> = {
			title: String(form.get('title') ?? '').trim(),
			body: String(form.get('body') ?? ''),
			link_url: String(form.get('link_url') ?? '').trim(),
			requires_link_click: form.get('requires_link_click') === 'on',
			requires_checkbox: form.get('requires_checkbox') === 'on',
			is_active: form.get('is_active') === 'on',
			updated_at: new Date().toISOString()
		};
		const position = Number(form.get('position') ?? '');
		if (!Number.isNaN(position) && position > 0) update.position = Math.round(position);
		const { error } = await service.from('onboarding_steps').update(update).eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	remove: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing step id.' });
		const { error } = await service.from('onboarding_steps').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
