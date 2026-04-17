import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: node, error: nodeErr } = await locals.supabase
		.from('nodes')
		.select('id,title,slug,description,video_url,ordering,subteam_id')
		.eq('slug', params.slug)
		.single();

	if (nodeErr || !node) throw error(404, 'Course not found');

	const [subteamsResp, assessmentResp, prereqsResp, allNodesResp, checkoffResp] = await Promise.all([
		locals.supabase.from('subteams').select('id,name').order('name'),
		locals.supabase
			.from('assessments')
			.select(
				'passing_score,questions,min_seconds_between_attempts,fail_window_minutes,max_failed_in_window,short_answer_min_chars,short_answer_max_chars'
			)
			.eq('node_id', node.id)
			.maybeSingle(),
		locals.supabase
			.from('node_prerequisites')
			.select('prerequisite_node_id')
			.eq('node_id', node.id),
		locals.supabase
			.from('nodes')
			.select('id,title,slug,ordering,subteam_id')
			.neq('id', node.id)
			.order('ordering'),
		locals.supabase
			.from('node_checkoff_requirements')
			.select('title,directions,mentor_checklist,resource_links,evidence_mode')
			.eq('node_id', node.id)
			.maybeSingle()
	]);

	return {
		node,
		subteams: subteamsResp.data ?? [],
		assessment: assessmentResp.data ?? {
			passing_score: 80,
			questions: [],
			min_seconds_between_attempts: 15,
			fail_window_minutes: 10,
			max_failed_in_window: 5,
			short_answer_min_chars: 3,
			short_answer_max_chars: 300
		},
		prereqIds: (prereqsResp.data ?? []).map((p: { prerequisite_node_id: string }) =>
			p.prerequisite_node_id
		),
		allNodes: allNodesResp.data ?? [],
		checkoff: checkoffResp.data ?? {
			title: 'Physical checkoff',
			directions: '',
			mentor_checklist: [],
			resource_links: [],
			evidence_mode: 'none'
		}
	};
};

export const actions: Actions = {
	updateNode: async ({ locals, params, request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const rawSlug = String(form.get('slug') ?? '').trim();
		const slug = rawSlug ? slugify(rawSlug) : slugify(title);
		const subteamId = String(form.get('subteam_id') ?? '');
		const videoUrl = String(form.get('video_url') ?? '').trim();
		const description = String(form.get('description') ?? '');
		const ordering = Number(form.get('ordering') ?? 0);

		if (!title || !slug || !subteamId) {
			return fail(400, { error: 'Title, slug, and subteam are required.', section: 'details' });
		}

		const { error: err } = await locals.supabase
			.from('nodes')
			.update({
				title,
				slug,
				subteam_id: subteamId,
				video_url: videoUrl,
				description,
				ordering
			})
			.eq('slug', params.slug);

		if (err) return fail(400, { error: err.message, section: 'details' });

		if (slug !== params.slug) throw redirect(303, `/mentor/courses/${slug}`);
		return { ok: true, section: 'details' };
	},

	saveAssessment: async ({ locals, params, request }) => {
		const form = await request.formData();
		const passingScore = Math.min(100, Math.max(1, Number(form.get('passing_score') ?? 80)));
		const minSecondsBetweenAttempts = Math.min(
			3600,
			Math.max(0, Number(form.get('min_seconds_between_attempts') ?? 15))
		);
		const failWindowMinutes = Math.min(
			1440,
			Math.max(1, Number(form.get('fail_window_minutes') ?? 10))
		);
		const maxFailedInWindow = Math.min(
			200,
			Math.max(1, Number(form.get('max_failed_in_window') ?? 5))
		);
		const shortAnswerMinChars = Math.min(
			5000,
			Math.max(0, Number(form.get('short_answer_min_chars') ?? 3))
		);
		const shortAnswerMaxChars = Math.min(
			5000,
			Math.max(1, Number(form.get('short_answer_max_chars') ?? 300))
		);
		if (shortAnswerMaxChars < shortAnswerMinChars) {
			return fail(400, {
				error: 'Short answer max characters must be greater than or equal to min.',
				section: 'assessment'
			});
		}
		let questions: unknown;
		try {
			questions = JSON.parse(String(form.get('questions') ?? '[]'));
		} catch {
			return fail(400, { error: 'Questions payload is malformed.', section: 'assessment' });
		}
		if (!Array.isArray(questions)) {
			return fail(400, { error: 'Questions must be an array.', section: 'assessment' });
		}

		const { data: node } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.slug)
			.single();
		if (!node) return fail(404, { error: 'Course not found', section: 'assessment' });

		const { error: err } = await locals.supabase
			.from('assessments')
			.upsert(
				{
					node_id: node.id,
					passing_score: passingScore,
					questions,
					min_seconds_between_attempts: minSecondsBetweenAttempts,
					fail_window_minutes: failWindowMinutes,
					max_failed_in_window: maxFailedInWindow,
					short_answer_min_chars: shortAnswerMinChars,
					short_answer_max_chars: shortAnswerMaxChars
				},
				{ onConflict: 'node_id' }
			);
		if (err) return fail(400, { error: err.message, section: 'assessment' });
		return { ok: true, section: 'assessment' };
	},

	savePrereqs: async ({ locals, params, request }) => {
		const form = await request.formData();
		const ids = form
			.getAll('prereq_ids')
			.map((v) => String(v))
			.filter(Boolean);

		const { data: node } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.slug)
			.single();
		if (!node) return fail(404, { error: 'Course not found', section: 'prereqs' });

		const { error: delErr } = await locals.supabase
			.from('node_prerequisites')
			.delete()
			.eq('node_id', node.id);
		if (delErr) return fail(400, { error: delErr.message, section: 'prereqs' });

		if (ids.length) {
			const rows = ids
				.filter((id) => id !== node.id)
				.map((id) => ({ node_id: node.id, prerequisite_node_id: id }));
			if (rows.length) {
				const { error: insErr } = await locals.supabase
					.from('node_prerequisites')
					.insert(rows);
				if (insErr) return fail(400, { error: insErr.message, section: 'prereqs' });
			}
		}
		return { ok: true, section: 'prereqs' };
	},

	saveCheckoff: async ({ locals, params, request }) => {
		const form = await request.formData();
		const title = String(form.get('checkoff_title') ?? 'Physical checkoff').trim();
		const directions = String(form.get('checkoff_directions') ?? '').trim();
		const evidenceMode = String(form.get('evidence_mode') ?? 'none');
		const checklistInput = String(form.get('mentor_checklist_text') ?? '');
		const linksInput = String(form.get('resource_links_text') ?? '');

		const validEvidenceModes = new Set(['none', 'photo_optional', 'photo_required']);
		if (!validEvidenceModes.has(evidenceMode)) {
			return fail(400, { error: 'Invalid evidence mode.', section: 'checkoff' });
		}

		const mentorChecklist = checklistInput
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
		const resourceLinks = linksInput
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		const { data: node } = await locals.supabase
			.from('nodes')
			.select('id')
			.eq('slug', params.slug)
			.single();
		if (!node) return fail(404, { error: 'Course not found', section: 'checkoff' });

		const { error: upsertError } = await locals.supabase
			.from('node_checkoff_requirements')
			.upsert(
				{
					node_id: node.id,
					title: title || 'Physical checkoff',
					directions,
					mentor_checklist: mentorChecklist,
					resource_links: resourceLinks,
					evidence_mode: evidenceMode
				},
				{ onConflict: 'node_id' }
			);
		if (upsertError) return fail(400, { error: upsertError.message, section: 'checkoff' });

		return { ok: true, section: 'checkoff' };
	},

	deleteNode: async ({ locals, params }) => {
		const { error: err } = await locals.supabase
			.from('nodes')
			.delete()
			.eq('slug', params.slug);
		if (err) return fail(400, { error: err.message, section: 'delete' });
		throw redirect(303, '/mentor/courses');
	}
};
