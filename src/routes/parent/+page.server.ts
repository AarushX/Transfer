import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireParentPortal, listActiveLinkedStudents } from '$lib/server/parent-access';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireParentPortal(locals);

	const [{ data: application }, linkedStudents] = await Promise.all([
		locals.supabase
			.from('parent_applications')
			.select('id,status,phone,relationship,notes,application_payload,submitted_at,reviewed_at')
			.eq('parent_user_id', user.id)
			.maybeSingle(),
		listActiveLinkedStudents(locals.supabase, user.id)
	]);

	return { application: application ?? null, linkedStudents };
};

export const actions: Actions = {
	submitApplication: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
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

		const { data: existing } = await locals.supabase
			.from('parent_applications')
			.select('id,status')
			.eq('parent_user_id', user.id)
			.maybeSingle();

		if (existing) {
			if (existing.status === 'approved') {
				return fail(400, { error: 'Your application is already approved.' });
			}
			const { error } = await locals.supabase
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
			const { error } = await locals.supabase.from('parent_applications').insert({
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
	},

	linkStudentByCode: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);

		const form = await request.formData();
		const code = String(form.get('code') ?? '')
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '');
		if (!code) return fail(400, { error: 'Enter a student link code.' });

		const { data: codeRow, error: codeError } = await locals.supabase
			.from('parent_link_codes')
			.select('id,student_user_id,expires_at,used_at')
			.eq('code', code)
			.maybeSingle();
		if (codeError) return fail(400, { error: codeError.message });
		if (!codeRow) return fail(400, { error: 'Invalid link code.' });
		if (codeRow.used_at) return fail(400, { error: 'This link code has already been used.' });
		if (new Date(String(codeRow.expires_at)).getTime() <= Date.now()) {
			return fail(400, { error: 'This link code has expired.' });
		}

		const studentUserId = String(codeRow.student_user_id);
		const { data: existing } = await locals.supabase
			.from('parent_student_links')
			.select('id,status')
			.eq('parent_user_id', user.id)
			.eq('student_user_id', studentUserId)
			.maybeSingle();
		if (String(existing?.status ?? '') === 'active') {
			return fail(400, { error: 'You are already linked to this student.' });
		}

		if (existing?.id) {
			const { error: updateError } = await locals.supabase
				.from('parent_student_links')
				.update({ status: 'active', updated_at: new Date().toISOString() })
				.eq('id', existing.id);
			if (updateError) return fail(400, { error: updateError.message });
		} else {
			const { error: insertError } = await locals.supabase.from('parent_student_links').insert({
				parent_user_id: user.id,
				student_user_id: studentUserId,
				status: 'active'
			});
			if (insertError) return fail(400, { error: insertError.message });
		}

		const { error: markError } = await locals.supabase
			.from('parent_link_codes')
			.update({ used_at: new Date().toISOString(), used_by_parent_user_id: user.id })
			.eq('id', codeRow.id);
		if (markError) return fail(400, { error: markError.message });

		return { ok: true };
	}
};
