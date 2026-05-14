import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

const slugify = (s: string) =>
	s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const service = createSupabaseServiceClient();

	let leadTeamGroupId: string | null = null;
	let leadSubteamId: string | null = null;
	try {
		const { data: leadFields } = await service
			.from('profiles')
			.select('lead_team_group_id,lead_subteam_id')
			.eq('id', user.id)
			.maybeSingle();
		leadTeamGroupId = (leadFields as any)?.lead_team_group_id ?? null;
		leadSubteamId = (leadFields as any)?.lead_subteam_id ?? null;
	} catch {
		// Migration not applied
	}

	const isLeadOfTeam = Boolean(leadTeamGroupId);
	const isLeadOfSubteam = Boolean(leadSubteamId);
	if (!isLeadOfTeam && !isLeadOfSubteam && !isAdmin(profile)) throw redirect(303, '/team');

	const scopeIds: string[] = [];
	if (leadTeamGroupId) scopeIds.push(leadTeamGroupId);
	if (leadSubteamId) scopeIds.push(leadSubteamId);

	const { data: pages } = await service
		.from('pages')
		.select('*')
		.in('scope_id', scopeIds.length > 0 ? scopeIds : ['00000000-0000-0000-0000-000000000000'])
		.order('scope_kind')
		.order('sort_order');

	const pageIds = (pages ?? []).map((p: any) => p.id);
	const { data: blocks } = pageIds.length > 0
		? await service.from('page_blocks').select('*').in('page_id', pageIds).order('sort_order')
		: { data: [] };

	const { data: teamGroup } = leadTeamGroupId
		? await service.from('team_groups').select('id,name,designator').eq('id', leadTeamGroupId).maybeSingle()
		: { data: null };
	const { data: subteam } = leadSubteamId
		? await service.from('subteams').select('id,name').eq('id', leadSubteamId).maybeSingle()
		: { data: null };

	const blocksByPage = new Map<string, any[]>();
	for (const b of blocks ?? []) {
		const list = blocksByPage.get(b.page_id) ?? [];
		list.push(b);
		blocksByPage.set(b.page_id, list);
	}

	return {
		teamGroup,
		subteam,
		pages: (pages ?? []).map((p: any) => ({ ...p, blocks: blocksByPage.get(p.id) ?? [] }))
	};
};

export const actions: Actions = {
	createPage: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const scopeKind = String(form.get('scope_kind') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const kind = String(form.get('kind') ?? 'content').trim();
		const redirectUrl = String(form.get('redirect_url') ?? '').trim() || null;

		if (!title) return fail(400, { error: 'Title required.' });
		if (!['team_group', 'subteam'].includes(scopeKind)) return fail(400, { error: 'Invalid scope.' });
		if (!['content', 'redirect'].includes(kind)) return fail(400, { error: 'Invalid kind.' });

		const service = createSupabaseServiceClient();
		const { data: leadFields } = await service
			.from('profiles')
			.select('lead_team_group_id,lead_subteam_id')
			.eq('id', user.id)
			.maybeSingle();
		const scopeId = scopeKind === 'team_group' ? (leadFields as any)?.lead_team_group_id : (leadFields as any)?.lead_subteam_id;
		if (!scopeId) return fail(403, { error: 'You are not a lead for this scope.' });
		if (kind === 'redirect' && !redirectUrl) return fail(400, { error: 'Redirect URL required.' });

		const slug = slugify(title) || 'page';
		const { error } = await service.from('pages').insert({
			scope_kind: scopeKind,
			scope_id: scopeId,
			title,
			slug,
			kind,
			redirect_url: redirectUrl,
			created_by: user.id
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'page' };
	},

	deletePage: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Page ID required.' });
		const service = createSupabaseServiceClient();
		const { error } = await service.from('pages').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'page_delete' };
	},

	updatePage: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const redirectUrl = String(form.get('redirect_url') ?? '').trim() || null;
		if (!id || !title) return fail(400, { error: 'ID and title required.' });
		const service = createSupabaseServiceClient();
		const { error } = await service.from('pages').update({ title, redirect_url: redirectUrl, updated_at: new Date().toISOString() }).eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'page_update' };
	},

	addBlock: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const pageId = String(form.get('page_id') ?? '').trim();
		const kind = String(form.get('kind') ?? '').trim();
		if (!pageId || !kind) return fail(400, { error: 'Page and kind required.' });
		if (!['heading', 'text', 'link', 'image', 'embed', 'divider'].includes(kind)) return fail(400, { error: 'Invalid block kind.' });

		const service = createSupabaseServiceClient();
		const { data: existing } = await service.from('page_blocks').select('sort_order').eq('page_id', pageId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
		const sortOrder = existing ? Number(existing.sort_order) + 1 : 0;
		const { error } = await service.from('page_blocks').insert({ page_id: pageId, kind, sort_order: sortOrder, payload: {} });
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'block_add' };
	},

	updateBlock: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const payloadRaw = String(form.get('payload') ?? '{}');
		if (!id) return fail(400, { error: 'Block ID required.' });
		let payload = {};
		try { payload = JSON.parse(payloadRaw); } catch { payload = {}; }
		const service = createSupabaseServiceClient();
		const { error } = await service.from('page_blocks').update({ payload, updated_at: new Date().toISOString() }).eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'block_update' };
	},

	deleteBlock: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Block ID required.' });
		const service = createSupabaseServiceClient();
		const { error } = await service.from('page_blocks').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'block_delete' };
	},

	moveBlock: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const direction = String(form.get('direction') ?? '').trim();
		if (!id || !['up', 'down'].includes(direction)) return fail(400, { error: 'Invalid move.' });
		const service = createSupabaseServiceClient();
		const { data: block } = await service.from('page_blocks').select('*').eq('id', id).maybeSingle();
		if (!block) return fail(404, { error: 'Block not found.' });
		const { data: siblings } = await service.from('page_blocks').select('id,sort_order').eq('page_id', block.page_id).order('sort_order');
		if (!siblings) return fail(400, { error: 'No siblings.' });
		const idx = siblings.findIndex((s: any) => s.id === id);
		const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
		if (!swapWith) return { ok: true, section: 'block_move' };
		await service.from('page_blocks').update({ sort_order: swapWith.sort_order }).eq('id', block.id);
		await service.from('page_blocks').update({ sort_order: block.sort_order }).eq('id', swapWith.id);
		return { ok: true, section: 'block_move' };
	}
};
