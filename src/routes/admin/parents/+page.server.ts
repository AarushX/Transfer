import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !isAdmin(profile)) throw redirect(303, '/dashboard');
	const { data, error } = await locals.supabase
		.from('parent_applications')
		.select(
			'id,parent_user_id,status,phone,relationship,submitted_at,reviewed_at,application_payload,profiles!parent_applications_parent_user_id_fkey(id,full_name,email)'
		)
		.order('submitted_at', { ascending: false, nullsFirst: false });
	if (error) return { applications: [] };
	const parentIds = Array.from(
		new Set((data ?? []).map((row: any) => String(row.parent_user_id)).filter(Boolean))
	);
	const supabaseAdmin = createSupabaseServiceClient();
	const { data: completedCourses } =
		parentIds.length === 0
			? { data: [] as any[] }
			: await supabaseAdmin
					.from('certifications')
					.select('user_id,status,quiz_score,quiz_passed_at,completed_at,nodes!inner(slug,title)')
					.in('user_id', parentIds)
					.eq('nodes.slug', 'parent-application');
	const completedByParent = new Map<string, any[]>();
	for (const row of completedCourses ?? []) {
		const key = String((row as any).user_id);
		const list = completedByParent.get(key) ?? [];
		list.push(row);
		completedByParent.set(key, list);
	}
	return {
		applications: (data ?? []).map((row: any) => ({
			...row,
			parent: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
			completedCourses: completedByParent.get(String(row.parent_user_id)) ?? []
		}))
	};
};

export const actions: Actions = {
	setStatus: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const status = String(form.get('status') ?? '').trim();
		if (!id || !['submitted', 'approved', 'rejected'].includes(status)) {
			return fail(400, { error: 'Invalid status update.' });
		}
		const { error } = await locals.supabase
			.from('parent_applications')
			.update({
				status,
				reviewed_at: new Date().toISOString(),
				reviewed_by: user.id
			})
			.eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
