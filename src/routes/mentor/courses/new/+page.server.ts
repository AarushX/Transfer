import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: teams }, { data: trainingCategories }] = await Promise.all([
		locals.supabase
			.from('teams')
			.select('id,name,slug,team_group_id,team_groups(name,slug,sort_order)')
			.order('name'),
		locals.supabase
			.from('training_categories')
			.select('id,name,slug,parent_id,kind,sort_order')
			.eq('is_active', true)
			.order('sort_order', { ascending: true })
	]);
	return { teams: teams ?? [], trainingCategories: trainingCategories ?? [] };
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const rawSlug = String(form.get('slug') ?? '').trim();
		const slug = rawSlug ? slugify(rawSlug) : slugify(title);
		const teamIds = form
			.getAll('team_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const description = String(form.get('description') ?? '');
		const categoryIds = form
			.getAll('category_ids')
			.map((v) => String(v))
			.filter(Boolean);

		if (!title || !slug) {
			return fail(400, {
				error: 'Title and slug are required.',
				values: { title, slug, description }
			});
		}

		const { data: node, error } = await locals.supabase
			.from('nodes')
			.insert({
				title,
				slug,
				video_url: '',
				subteam_id: null,
				description
			})
			.select('id')
			.single();

		if (error) {
			return fail(400, {
				error: error.message,
				values: { title, slug, description }
			});
		}
		if (node?.id) {
			if (teamIds.length > 0) {
				await locals.supabase.from('node_team_targets').insert(
					teamIds.map((teamId) => ({
						node_id: node.id,
						team_id: teamId
					}))
				);
			}
			await locals.supabase.from('node_checkoff_requirements').upsert(
				{
					node_id: node.id,
					title: 'Skills Check',
					directions: '',
					mentor_checklist: [],
					resource_links: [],
					evidence_mode: 'none'
				},
				{ onConflict: 'node_id' }
			);
			if (categoryIds.length > 0) {
				await locals.supabase.from('node_categories').insert(
					categoryIds.map((categoryId) => ({
						node_id: node.id,
						category_id: categoryId
					}))
				);
			}
		}

		throw redirect(303, `/mentor/courses/${slug}`);
	}
};
