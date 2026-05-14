import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!profile || !isAdmin(profile)) throw redirect(303, '/dashboard');

	const { data: seasons } = await locals.supabase
		.from('lettering_seasons')
		.select('id,label,start_date,end_date,is_active,created_at,updated_at')
		.order('start_date', { ascending: false });

	const activeSeason = (seasons ?? []).find((s: any) => s.is_active);
	const activeSeasonId = activeSeason?.id ?? null;

	const [{ data: requirements }, { data: outreachEvents }, { data: competitions }] =
		await Promise.all([
			activeSeasonId
				? locals.supabase
						.from('lettering_requirements')
						.select('id,season_id,category,label,required_value,sort_order')
						.eq('season_id', activeSeasonId)
						.order('sort_order')
				: Promise.resolve({ data: [] as any[] }),
			activeSeasonId
				? locals.supabase
						.from('outreach_events')
						.select(
							'id,season_id,title,description,location,event_date,start_time,end_time,max_signups,signup_deadline,created_by'
						)
						.eq('season_id', activeSeasonId)
						.order('event_date', { ascending: false })
				: Promise.resolve({ data: [] as any[] }),
			activeSeasonId
				? locals.supabase
						.from('competition_events')
						.select(
							'id,season_id,name,location,start_date,end_date,comp_type,created_by'
						)
						.eq('season_id', activeSeasonId)
						.order('start_date', { ascending: false })
				: Promise.resolve({ data: [] as any[] })
		]);

	return {
		seasons: seasons ?? [],
		activeSeasonId,
		requirements: requirements ?? [],
		outreachEvents: outreachEvents ?? [],
		competitions: competitions ?? []
	};
};

export const actions: Actions = {
	createSeason: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const label = String(form.get('label') ?? '').trim();
		const startDate = String(form.get('start_date') ?? '').trim();
		const endDate = String(form.get('end_date') ?? '').trim();
		const makeActive = form.get('is_active') === 'on';
		if (!label || !startDate || !endDate) return fail(400, { error: 'Label, start date, and end date are required.' });

		if (makeActive) {
			const serviceClient = createSupabaseServiceClient();
			const { error: deactivateErr } = await serviceClient
				.from('lettering_seasons')
				.update({ is_active: false })
				.eq('is_active', true);
			if (deactivateErr) return fail(400, { error: deactivateErr.message });
		}

		const { error } = await locals.supabase
			.from('lettering_seasons')
			.insert({ label, start_date: startDate, end_date: endDate, is_active: makeActive });
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	toggleSeasonActive: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const seasonId = String(form.get('season_id') ?? '').trim();
		const activate = form.get('activate') === 'true';
		if (!seasonId) return fail(400, { error: 'Season ID is required.' });

		const serviceClient = createSupabaseServiceClient();

		if (activate) {
			const { error: deactivateErr } = await serviceClient
				.from('lettering_seasons')
				.update({ is_active: false })
				.eq('is_active', true);
			if (deactivateErr) return fail(400, { error: deactivateErr.message });
		}

		const { error } = await serviceClient
			.from('lettering_seasons')
			.update({ is_active: activate })
			.eq('id', seasonId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	upsertRequirement: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const seasonId = String(form.get('season_id') ?? '').trim();
		const category = String(form.get('category') ?? '').trim();
		const label = String(form.get('label') ?? '').trim();
		const requiredValue = Number(form.get('required_value') ?? 0);
		const sortOrder = Number(form.get('sort_order') ?? 0);
		if (!seasonId || !category || !label) return fail(400, { error: 'Season, category, and label are required.' });

		const { error } = await locals.supabase
			.from('lettering_requirements')
			.upsert(
				{ season_id: seasonId, category, label, required_value: requiredValue, sort_order: sortOrder },
				{ onConflict: 'season_id,category' }
			);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	deleteRequirement: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Requirement ID is required.' });
		const { error } = await locals.supabase.from('lettering_requirements').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	createOutreachEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const seasonId = String(form.get('season_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const eventDate = String(form.get('event_date') ?? '').trim();
		const startTime = String(form.get('start_time') ?? '').trim();
		const endTime = String(form.get('end_time') ?? '').trim();
		const maxSignups = form.get('max_signups') ? Number(form.get('max_signups')) : null;
		const signupDeadline = String(form.get('signup_deadline') ?? '').trim() || null;
		if (!seasonId || !title || !eventDate) return fail(400, { error: 'Season, title, and event date are required.' });

		const { error } = await locals.supabase.from('outreach_events').insert({
			season_id: seasonId,
			title,
			description: description || null,
			location: location || null,
			event_date: eventDate,
			start_time: startTime || null,
			end_time: endTime || null,
			max_signups: maxSignups,
			signup_deadline: signupDeadline,
			created_by: user.id
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	deleteOutreachEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Event ID is required.' });
		const { error } = await locals.supabase.from('outreach_events').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	createCompetition: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const seasonId = String(form.get('season_id') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const startDate = String(form.get('start_date') ?? '').trim();
		const endDate = String(form.get('end_date') ?? '').trim();
		const compType = String(form.get('comp_type') ?? 'regional').trim();
		if (!seasonId || !name || !startDate) return fail(400, { error: 'Season, name, and start date are required.' });

		const { error } = await locals.supabase.from('competition_events').insert({
			season_id: seasonId,
			name,
			location: location || null,
			start_date: startDate,
			end_date: endDate || null,
			comp_type: compType,
			created_by: user.id
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	deleteCompetition: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Competition ID is required.' });
		const { error } = await locals.supabase.from('competition_events').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
