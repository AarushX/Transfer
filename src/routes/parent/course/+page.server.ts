import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireParentPortal } from '$lib/server/parent-access';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireParentPortal(locals);
	const service = createSupabaseServiceClient();

	const { data: application } = await service
		.from('parent_applications')
		.select('id,status,phone,relationship,notes,application_payload,submitted_at,reviewed_at')
		.eq('parent_user_id', user.id)
		.maybeSingle();

	return { application: application ?? null };
};

export const actions: Actions = {
	saveDraft: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const payload: Record<string, string> = {};
		for (const [key, value] of form.entries()) {
			payload[key] = String(value);
		}

		const phone = String(form.get('phone') ?? '').trim();
		const relationship = String(form.get('relationship') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();

		const { data: existing } = await service
			.from('parent_applications')
			.select('id,status')
			.eq('parent_user_id', user.id)
			.maybeSingle();

		if (existing) {
			if (existing.status === 'approved') {
				return fail(400, { error: 'Your application is already approved.' });
			}
			const { error } = await service
				.from('parent_applications')
				.update({
					phone,
					relationship,
					notes,
					application_payload: payload,
					updated_at: new Date().toISOString()
				})
				.eq('id', existing.id);
			if (error) return fail(400, { error: error.message });
		} else {
			const { error } = await service.from('parent_applications').insert({
				parent_user_id: user.id,
				phone,
				relationship,
				notes,
				application_payload: payload,
				status: 'submitted'
			});
			if (error) return fail(400, { error: error.message });
		}

		return { ok: true };
	},

	submitForApproval: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const payload: Record<string, string> = {};
		for (const [key, value] of form.entries()) {
			payload[key] = String(value);
		}

		const phone = String(form.get('phone') ?? '').trim();
		const relationship = String(form.get('relationship') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		if (!phone || !relationship) {
			return fail(400, { error: 'Phone and relationship are required.' });
		}

		const { data: existing } = await service
			.from('parent_applications')
			.select('id,status')
			.eq('parent_user_id', user.id)
			.maybeSingle();

		if (existing) {
			if (existing.status === 'approved') {
				return fail(400, { error: 'Your application is already approved.' });
			}
			const { error } = await service
				.from('parent_applications')
				.update({
					phone,
					relationship,
					notes,
					application_payload: payload,
					status: 'submitted',
					submitted_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				})
				.eq('id', existing.id);
			if (error) return fail(400, { error: error.message });
		} else {
			const { error } = await service.from('parent_applications').insert({
				parent_user_id: user.id,
				phone,
				relationship,
				notes,
				application_payload: payload,
				status: 'submitted',
				submitted_at: new Date().toISOString()
			});
			if (error) return fail(400, { error: error.message });
		}

		return { ok: true };
	}
};
