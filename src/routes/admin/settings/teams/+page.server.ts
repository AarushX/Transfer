import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const colorOr = (value: string, fallback: string) =>
	/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

const numberFrom = (value: FormDataEntryValue | null) => Number(value ?? 0) || 0;

const uniqueFormStrings = (form: FormData, key: string) =>
	Array.from(new Set(form.getAll(key).map((value) => String(value)).filter(Boolean)));

export const load: PageServerLoad = async ({ locals, url }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || profile.role !== 'admin') throw redirect(303, '/dashboard');

	const [
		{ data: teamGroups },
		{ data: subteams },
		{ data: categories },
		{ data: nodes },
		{ data: groupTargets },
		{ data: subteamTargets },
		{ data: subteamLinks }
	] =
		await Promise.all([
			locals.supabase
				.from('team_groups')
				.select('id,name,slug,designator,color_hex,sort_order')
				.order('sort_order'),
			locals.supabase
				.from('teams')
				.select('id,name,slug,color_hex,category_slug,team_group_id,sort_order')
				.order('sort_order'),
			locals.supabase.from('subteam_categories').select('slug,name,sort_order,is_required_onboarding').order('sort_order'),
			locals.supabase.from('nodes').select('id,title,slug').order('title'),
			locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
			locals.supabase.from('node_team_targets').select('node_id,team_id'),
			locals.supabase.from('team_group_subteam_links').select('team_group_id,team_id')
		]);

	return {
		teamGroups: teamGroups ?? [],
		subteams: subteams ?? [],
		categories: categories ?? [],
		nodes: nodes ?? [],
		groupTargets: groupTargets ?? [],
		subteamTargets: subteamTargets ?? [],
		subteamLinks: subteamLinks ?? []
	};
};

export const actions: Actions = {
	createTeam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('team_name') ?? '').trim();
		const slugInput = String(form.get('team_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		const colorHex = String(form.get('team_color_hex') ?? '#475569').trim();
		if (!name || !slug) return fail(400, { error: 'Team name is required.' });
		const { error } = await locals.supabase.from('team_groups').insert({
			name,
			slug,
			color_hex: colorOr(colorHex, '#475569'),
			sort_order: numberFrom(form.get('team_sort_order'))
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'team' };
	},
	createSubteam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const linkedTeamGroupIds = uniqueFormStrings(form, 'linked_team_group_ids');
		const name = String(form.get('subteam_name') ?? '').trim();
		const slugInput = String(form.get('subteam_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		const colorHex = String(form.get('subteam_color_hex') ?? '#334155').trim();
		const categorySlug = String(form.get('subteam_category_slug') ?? '').trim();
		if (!teamGroupId || !name || !slug) return fail(400, { error: 'Team and subteam name are required.' });
		const { data: created, error } = await locals.supabase
			.from('teams')
			.insert({
				team_group_id: teamGroupId,
				name,
				slug,
				color_hex: colorOr(colorHex, '#334155'),
				category_slug: categorySlug || null,
				sort_order: numberFrom(form.get('subteam_sort_order'))
			})
			.select('id')
			.single();
		if (error) return fail(400, { error: error.message });
		const linkRows = Array.from(new Set([teamGroupId, ...linkedTeamGroupIds])).map((groupId) => ({
			team_group_id: groupId,
			team_id: created.id
		}));
		if (linkRows.length > 0) {
			const { error: linkError } = await locals.supabase.from('team_group_subteam_links').insert(linkRows);
			if (linkError) return fail(400, { error: linkError.message });
		}
		return { ok: true, section: 'subteam' };
	},
	updateTeam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		const name = String(form.get('team_name') ?? '').trim();
		const slugInput = String(form.get('team_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		const colorHex = String(form.get('team_color_hex') ?? '#475569').trim();
		const sortOrder = numberFrom(form.get('team_sort_order'));
		if (!teamGroupId) return fail(400, { error: 'Team is required.' });
		if (!name || !slug) return fail(400, { error: 'Team name is required.' });
		const { error } = await locals.supabase
			.from('team_groups')
			.update({
				name,
				slug,
				color_hex: colorOr(colorHex, '#475569'),
				sort_order: sortOrder
			})
			.eq('id', teamGroupId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'team-update' };
	},
	updateSubteam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const subteamId = String(form.get('subteam_id') ?? '').trim();
		const name = String(form.get('subteam_name') ?? '').trim();
		const slugInput = String(form.get('subteam_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		const colorHex = String(form.get('subteam_color_hex') ?? '#334155').trim();
		const categorySlug = String(form.get('subteam_category_slug') ?? '').trim();
		const sortOrder = numberFrom(form.get('subteam_sort_order'));
		const linkedTeamGroupIds = uniqueFormStrings(form, 'linked_team_group_ids');
		if (!subteamId) return fail(400, { error: 'Subteam is required.' });
		if (!name || !slug) return fail(400, { error: 'Subteam name is required.' });
		const { data: subteam, error: subteamReadError } = await locals.supabase
			.from('teams')
			.select('id,team_group_id')
			.eq('id', subteamId)
			.maybeSingle();
		if (subteamReadError) return fail(400, { error: subteamReadError.message });
		if (!subteam) return fail(404, { error: 'Subteam not found.' });
		const primaryGroupId = String(subteam.team_group_id);
		const allLinks = Array.from(new Set([primaryGroupId, ...linkedTeamGroupIds]));
		const { error } = await locals.supabase
			.from('teams')
			.update({
				name,
				slug,
				color_hex: colorOr(colorHex, '#334155'),
				category_slug: categorySlug || null,
				sort_order: sortOrder
			})
			.eq('id', subteamId);
		if (error) return fail(400, { error: error.message });
		await locals.supabase.from('team_group_subteam_links').delete().eq('team_id', subteamId);
		if (allLinks.length > 0) {
			const { error: linkError } = await locals.supabase.from('team_group_subteam_links').insert(
				allLinks.map((groupId) => ({ team_group_id: groupId, team_id: subteamId }))
			);
			if (linkError) return fail(400, { error: linkError.message });
		}
		return { ok: true, section: 'subteam-style' };
	},
	deleteTeam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		if (!teamGroupId) return fail(400, { error: 'Team is required.' });
		const { count: subteamCount, error: countError } = await locals.supabase
			.from('teams')
			.select('*', { count: 'exact', head: true })
			.eq('team_group_id', teamGroupId);
		if (countError) return fail(400, { error: countError.message });
		if ((subteamCount ?? 0) > 0) {
			return fail(400, { error: 'Delete or move subteams before deleting this main team.' });
		}
		const { error } = await locals.supabase.from('team_groups').delete().eq('id', teamGroupId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'team-delete' };
	},
	deleteSubteam: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const subteamId = String(form.get('subteam_id') ?? '').trim();
		if (!subteamId) return fail(400, { error: 'Subteam is required.' });
		const { error } = await locals.supabase.from('teams').delete().eq('id', subteamId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'subteam-delete' };
	},
	createCategory: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const name = String(form.get('category_name') ?? '').trim();
		const slugInput = String(form.get('category_slug') ?? '').trim();
		const slug = slugify(slugInput || name);
		const sortOrder = numberFrom(form.get('category_sort_order'));
		if (!name || !slug) return fail(400, { error: 'Category name is required.' });
		const { error } = await locals.supabase
			.from('subteam_categories')
			.insert({ slug, name, sort_order: sortOrder, is_required_onboarding: false });
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'category' };
	},
	updateCategory: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const slug = String(form.get('category_slug') ?? '').trim();
		const name = String(form.get('category_name') ?? '').trim();
		const sortOrder = numberFrom(form.get('category_sort_order'));
		const required = String(form.get('is_required_onboarding') ?? '') === 'on';
		if (!slug || !name) return fail(400, { error: 'Category is required.' });
		const { error } = await locals.supabase
			.from('subteam_categories')
			.update({
				name,
				sort_order: sortOrder,
				is_required_onboarding: required
			})
			.eq('slug', slug);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'category-update' };
	},
	deleteCategory: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const slug = String(form.get('category_slug') ?? '').trim();
		if (!slug) return fail(400, { error: 'Category is required.' });
		const { count, error: countError } = await locals.supabase
			.from('teams')
			.select('*', { count: 'exact', head: true })
			.eq('category_slug', slug);
		if (countError) return fail(400, { error: countError.message });
		if ((count ?? 0) > 0) return fail(400, { error: 'This category is in use by subteams.' });
		const { error } = await locals.supabase.from('subteam_categories').delete().eq('slug', slug);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'category-delete' };
	},
	saveTeamCourses: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		if (!teamGroupId) return fail(400, { error: 'Team is required.' });
		const nodeIds = form
			.getAll('node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		await locals.supabase.from('node_team_group_targets').delete().eq('team_group_id', teamGroupId);
		if (nodeIds.length > 0) {
			const { error } = await locals.supabase.from('node_team_group_targets').insert(
				nodeIds.map((nodeId) => ({ team_group_id: teamGroupId, node_id: nodeId }))
			);
			if (error) return fail(400, { error: error.message });
		}
		return { ok: true, section: 'team-courses' };
	},
	saveSubteamCourses: async ({ locals, request }) => {
		const { profile } = await locals.safeGetSession();
		if (!profile || profile.role !== 'admin') return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const subteamId = String(form.get('subteam_id') ?? '').trim();
		if (!subteamId) return fail(400, { error: 'Subteam is required.' });
		const nodeIds = form
			.getAll('node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		await locals.supabase.from('node_team_targets').delete().eq('team_id', subteamId);
		if (nodeIds.length > 0) {
			const { error } = await locals.supabase.from('node_team_targets').insert(
				nodeIds.map((nodeId) => ({ team_id: subteamId, node_id: nodeId }))
			);
			if (error) return fail(400, { error: error.message });
		}
		return { ok: true, section: 'subteam-courses' };
	}
};
