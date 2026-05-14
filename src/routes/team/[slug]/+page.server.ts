import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const teamGroupId = String(url.searchParams.get('team') ?? '').trim();
	if (!teamGroupId) throw redirect(303, '/team');

	const { data: pages } = await locals.supabase
		.from('pages')
		.select('id,scope_kind,scope_id,title,slug,kind,redirect_url')
		.eq('slug', params.slug);

	const subteamIds = new Set<string>();
	const { data: subteams } = await locals.supabase.from('subteams').select('id');
	for (const s of subteams ?? []) subteamIds.add(s.id);

	const candidate = (pages ?? []).find(
		(p: any) =>
			(p.scope_kind === 'team_group' && p.scope_id === teamGroupId) ||
			(p.scope_kind === 'subteam' && subteamIds.has(p.scope_id))
	);

	if (!candidate) throw error(404, 'Page not found');

	if (candidate.kind === 'redirect' && candidate.redirect_url) {
		throw redirect(303, candidate.redirect_url);
	}

	const { data: blocks } = await locals.supabase
		.from('page_blocks')
		.select('id,kind,payload,sort_order')
		.eq('page_id', candidate.id)
		.order('sort_order');

	const { data: teamGroup } = await locals.supabase
		.from('team_groups')
		.select('id,name,color_hex,designator')
		.eq('id', teamGroupId)
		.maybeSingle();

	return {
		page: candidate,
		blocks: blocks ?? [],
		teamGroup,
		teamGroupId
	};
};
