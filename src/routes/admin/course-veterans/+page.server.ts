import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	if (!isAdmin(profile)) throw redirect(303, '/dashboard');

	const service = createSupabaseServiceClient();
	const [{ data: nodes }, { data: grants }, { data: completions }] = await Promise.all([
		service.from('nodes').select('id,title,slug,code,proficiency_level').order('title'),
		service
			.from('course_veterans')
			.select('node_id,user_id,granted_at,granted_by')
			.order('granted_at', { ascending: false }),
		service.from('certifications').select('user_id,node_id').eq('status', 'completed')
	]);

	const userIds = Array.from(
		new Set([
			...(grants ?? []).map((g: any) => String(g.user_id)),
			...(grants ?? []).map((g: any) => String(g.granted_by ?? '')).filter(Boolean),
			...(completions ?? []).map((c: any) => String(c.user_id))
		])
	);
	const { data: profiles } =
		userIds.length > 0
			? await service.from('profiles').select('id,full_name,email').in('id', userIds)
			: { data: [] as any[] };
	const profileById = new Map((profiles ?? []).map((p: any) => [String(p.id), p]));

	// For each node, which users have completed it (eligible to be veterans).
	const eligibleByNode = new Map<string, Array<{ id: string; name: string }>>();
	for (const row of completions ?? []) {
		const nodeId = String(row.node_id);
		const userId = String(row.user_id);
		const list = eligibleByNode.get(nodeId) ?? [];
		const p = profileById.get(userId);
		if (p) list.push({ id: userId, name: p.full_name || p.email });
		eligibleByNode.set(nodeId, list);
	}

	const enrichedGrants = (grants ?? []).map((g: any) => {
		const node = (nodes ?? []).find((n: any) => String(n.id) === String(g.node_id));
		const grantee = profileById.get(String(g.user_id));
		const grantor = g.granted_by ? profileById.get(String(g.granted_by)) : null;
		return {
			node_id: String(g.node_id),
			user_id: String(g.user_id),
			granted_at: g.granted_at,
			node_title: node?.title ?? 'Unknown course',
			node_code: node?.code ?? null,
			node_level: node?.proficiency_level ?? null,
			grantee_name: grantee?.full_name || grantee?.email || g.user_id,
			grantor_name: grantor?.full_name || grantor?.email || null
		};
	});

	return {
		nodes: (nodes ?? []).map((n: any) => ({
			id: String(n.id),
			title: n.title,
			code: n.code,
			level: n.proficiency_level
		})),
		grants: enrichedGrants,
		eligibleByNode: Object.fromEntries(eligibleByNode.entries())
	};
};

export const actions: Actions = {
	grant: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const nodeId = String(form.get('node_id') ?? '').trim();
		const userId = String(form.get('user_id') ?? '').trim();
		if (!nodeId || !userId) return fail(400, { error: 'Course and member are required.' });

		const service = createSupabaseServiceClient();
		// Sanity: make sure the user has actually completed this course.
		const { data: cert } = await service
			.from('certifications')
			.select('id')
			.eq('user_id', userId)
			.eq('node_id', nodeId)
			.eq('status', 'completed')
			.maybeSingle();
		if (!cert) {
			return fail(400, {
				error: 'Member has not completed this course — cannot grant veteran status.'
			});
		}

		const { error: err } = await service
			.from('course_veterans')
			.upsert({ node_id: nodeId, user_id: userId, granted_by: user.id });
		if (err) return fail(400, { error: err.message });
		return { ok: true };
	},
	revoke: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const nodeId = String(form.get('node_id') ?? '').trim();
		const userId = String(form.get('user_id') ?? '').trim();
		if (!nodeId || !userId) return fail(400, { error: 'Course and member are required.' });

		const service = createSupabaseServiceClient();
		const { error: err } = await service
			.from('course_veterans')
			.delete()
			.eq('node_id', nodeId)
			.eq('user_id', userId);
		if (err) return fail(400, { error: err.message });
		return { ok: true };
	}
};
