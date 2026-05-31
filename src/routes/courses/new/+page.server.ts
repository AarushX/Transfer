import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resolveCourseScope } from '$lib/server/course-access';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	const scope = await resolveCourseScope(locals.supabase, user, profile);
	if (!scope.canManage) throw redirect(303, '/dashboard');

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

	// Leads may only target the subteams they lead; mentors/admins see all.
	const ledSet = scope.isFull ? null : new Set(scope.ledTeamIds);
	const visibleTeams = ledSet
		? (teams ?? []).filter((t: any) => ledSet.has(String(t.id)))
		: (teams ?? []);

	return {
		teams: visibleTeams,
		trainingCategories: trainingCategories ?? [],
		isFullCourseAccess: scope.isFull
	};
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		const scope = await resolveCourseScope(locals.supabase, user, profile);

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const rawSlug = String(form.get('slug') ?? '').trim();
		const slug = rawSlug ? slugify(rawSlug) : slugify(title);
		let teamIds = form
			.getAll('team_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const description = String(form.get('description') ?? '');
		const categoryIds = form
			.getAll('category_ids')
			.map((v) => String(v))
			.filter(Boolean);

		if (!scope.canManage) {
			return fail(403, { error: 'Forbidden', values: { title, slug, description } });
		}

		if (!title || !slug) {
			return fail(400, {
				error: 'Title and slug are required.',
				values: { title, slug, description }
			});
		}

		// Leads must target one of their own subteams; reject anything outside scope.
		if (!scope.isFull) {
			const ledSet = new Set(scope.ledTeamIds);
			if (teamIds.some((id) => !ledSet.has(id))) {
				return fail(403, {
					error: 'You can only create courses for the subteams you lead.',
					values: { title, slug, description }
				});
			}
			teamIds = teamIds.filter((id) => ledSet.has(id));
			if (teamIds.length === 0) {
				return fail(400, {
					error: 'Pick at least one of your subteams for this course.',
					values: { title, slug, description }
				});
			}
		}

		// Leads aren't covered by the mentor/admin RLS write policies, so authorized
		// lead writes go through the service client after the scope checks above.
		const db = scope.isFull ? locals.supabase : createSupabaseServiceClient();

		const { data: node, error } = await db
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
				await db.from('node_team_targets').insert(
					teamIds.map((teamId) => ({
						node_id: node.id,
						team_id: teamId
					}))
				);
			}
			await db.from('node_checkoff_requirements').upsert(
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
				await db.from('node_categories').insert(
					categoryIds.map((categoryId) => ({
						node_id: node.id,
						category_id: categoryId
					}))
				);
			}
		}

		throw redirect(303, `/courses/${slug}`);
	}
};
