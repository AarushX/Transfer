import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/roles';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isAdmin(profile)) throw redirect(303, '/dashboard');

	const [
		{ data: teamGroups },
		{ data: subteams },
		{ data: nodes },
		{ data: groupTargets },
		{ data: subteamTargets },
		{ data: courseTemplates },
		{ data: surveyTemplates },
		{ data: carpoolTemplates }
	] = await Promise.all([
		locals.supabase.from('team_groups').select('id,name,slug').order('name'),
		locals.supabase.from('teams').select('id,name,slug,team_group_id').order('name'),
		locals.supabase.from('nodes').select('id,title,slug').order('title'),
		locals.supabase.from('node_team_group_targets').select('node_id,team_group_id'),
		locals.supabase.from('node_team_targets').select('node_id,team_id'),
		locals.supabase.from('course_templates').select('id,name,title,created_at').order('created_at', { ascending: false }),
		locals.supabase
			.from('survey_templates')
			.select('id,name,title,workflow_kind,created_at')
			.order('created_at', { ascending: false }),
		locals.supabase
			.from('carpool_event_templates')
			.select('id,name,title,created_at')
			.order('created_at', { ascending: false })
	]);
	return {
		teamGroups: teamGroups ?? [],
		subteams: subteams ?? [],
		nodes: nodes ?? [],
		groupTargets: groupTargets ?? [],
		subteamTargets: subteamTargets ?? [],
		courseTemplates: courseTemplates ?? [],
		surveyTemplates: surveyTemplates ?? [],
		carpoolTemplates: carpoolTemplates ?? []
	};
};

export const actions: Actions = {
	saveTeamCourses: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const teamGroupId = String(form.get('team_group_id') ?? '').trim();
		if (!teamGroupId) return fail(400, { error: 'Main team is required.' });
		const nodeIds = form
			.getAll('node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const { data: existingRows, error: existingErr } = await locals.supabase
			.from('node_team_group_targets')
			.select('node_id')
			.eq('team_group_id', teamGroupId);
		if (existingErr) return fail(400, { error: existingErr.message });
		const existingIds = (existingRows ?? []).map((row: any) => String(row.node_id));
		if (nodeIds.length > 0) {
			const { error } = await locals.supabase.from('node_team_group_targets').upsert(
				nodeIds.map((nodeId) => ({ team_group_id: teamGroupId, node_id: nodeId })),
				{ onConflict: 'node_id,team_group_id' }
			);
			if (error) return fail(400, { error: error.message });
		}
		const removeIds = existingIds.filter((id) => !nodeIds.includes(id));
		if (removeIds.length > 0) {
			const { error: deleteErr } = await locals.supabase
				.from('node_team_group_targets')
				.delete()
				.eq('team_group_id', teamGroupId)
				.in('node_id', removeIds);
			if (deleteErr) return fail(400, { error: deleteErr.message });
		}
		return { ok: true, section: 'team-courses' };
	},
	saveSubteamCourses: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const subteamId = String(form.get('subteam_id') ?? '').trim();
		if (!subteamId) return fail(400, { error: 'Subteam is required.' });
		const nodeIds = form
			.getAll('node_ids')
			.map((v) => String(v))
			.filter(Boolean);
		const { data: existingRows, error: existingErr } = await locals.supabase
			.from('node_team_targets')
			.select('node_id')
			.eq('team_id', subteamId);
		if (existingErr) return fail(400, { error: existingErr.message });
		const existingIds = (existingRows ?? []).map((row: any) => String(row.node_id));
		if (nodeIds.length > 0) {
			const { error } = await locals.supabase.from('node_team_targets').upsert(
				nodeIds.map((nodeId) => ({ team_id: subteamId, node_id: nodeId })),
				{ onConflict: 'node_id,team_id' }
			);
			if (error) return fail(400, { error: error.message });
		}
		const removeIds = existingIds.filter((id) => !nodeIds.includes(id));
		if (removeIds.length > 0) {
			const { error: deleteErr } = await locals.supabase
				.from('node_team_targets')
				.delete()
				.eq('team_id', subteamId)
				.in('node_id', removeIds);
			if (deleteErr) return fail(400, { error: deleteErr.message });
		}
		return { ok: true, section: 'subteam-courses' };
	},
	deleteNode: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const nodeId = String(form.get('node_id') ?? '').trim();
		if (!nodeId) return fail(400, { error: 'Node is required.' });
		const { error } = await locals.supabase.from('nodes').delete().eq('id', nodeId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'delete-node' };
	},
	deleteCourseTemplate: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const templateId = String(form.get('template_id') ?? '').trim();
		if (!templateId) return fail(400, { error: 'Template is required.' });
		const { error } = await locals.supabase.from('course_templates').delete().eq('id', templateId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'delete-course-template' };
	},
	deleteSurveyTemplate: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const templateId = String(form.get('template_id') ?? '').trim();
		if (!templateId) return fail(400, { error: 'Template is required.' });
		const { error } = await locals.supabase.from('survey_templates').delete().eq('id', templateId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'delete-survey-template' };
	},
	deleteCarpoolTemplate: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const templateId = String(form.get('template_id') ?? '').trim();
		if (!templateId) return fail(400, { error: 'Template is required.' });
		const { error } = await locals.supabase.from('carpool_event_templates').delete().eq('id', templateId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'delete-carpool-template' };
	}
};
