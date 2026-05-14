import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');

	// Fetch active lettering season
	const { data: season } = await locals.supabase
		.from('lettering_seasons')
		.select('id,label,start_date,end_date,is_active')
		.eq('is_active', true)
		.maybeSingle();

	if (!season) {
		return { season: null, events: [], mySignups: [], myHours: [] };
	}

	// Fetch outreach events for the active season
	const { data: events } = await locals.supabase
		.from('outreach_events')
		.select('*')
		.eq('season_id', season.id)
		.order('event_date', { ascending: true });

	// Fetch the current user's signups
	const eventIds = (events ?? []).map((e: any) => String(e.id));
	const { data: signups } = eventIds.length
		? await locals.supabase
				.from('outreach_event_signups')
				.select('id,event_id')
				.eq('user_id', user.id)
				.in('event_id', eventIds)
		: { data: [] as any[] };

	// Fetch signup counts per event
	const { data: allSignups } = eventIds.length
		? await locals.supabase
				.from('outreach_event_signups')
				.select('event_id')
				.in('event_id', eventIds)
		: { data: [] as any[] };

	const signupCounts = new Map<string, number>();
	for (const row of allSignups ?? []) {
		const key = String((row as any).event_id);
		signupCounts.set(key, (signupCounts.get(key) ?? 0) + 1);
	}

	// Fetch the current user's logged hours for this season
	const { data: hours } = await locals.supabase
		.from('outreach_hours')
		.select('id,event_id,hours,description,verification_status,rejection_reason,created_at')
		.eq('user_id', user.id)
		.eq('season_id', season.id)
		.order('created_at', { ascending: false });

	// Build a map of event_id -> event title for display in hours table
	const eventMap = new Map<string, string>();
	for (const e of events ?? []) {
		eventMap.set(String(e.id), String(e.title));
	}

	return {
		season,
		events: (events ?? []).map((e: any) => ({
			...e,
			signup_count: signupCounts.get(String(e.id)) ?? 0
		})),
		mySignups: (signups ?? []).map((s: any) => String(s.event_id)),
		myHours: (hours ?? []).map((h: any) => ({
			...h,
			event_title: h.event_id ? (eventMap.get(String(h.event_id)) ?? null) : null
		}))
	};
};

export const actions: Actions = {
	signUp: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const eventId = String(form.get('event_id') ?? '').trim();
		if (!eventId) return fail(400, { error: 'Event is required.' });

		// Fetch the event to validate deadline and capacity
		const { data: event } = await locals.supabase
			.from('outreach_events')
			.select('id,signup_deadline,max_signups')
			.eq('id', eventId)
			.maybeSingle();

		if (!event) return fail(404, { error: 'Event not found.' });

		if (event.signup_deadline && new Date(event.signup_deadline) < new Date()) {
			return fail(400, { error: 'The signup deadline for this event has passed.' });
		}

		// Check max signups
		if (event.max_signups) {
			const { count } = await locals.supabase
				.from('outreach_event_signups')
				.select('id', { count: 'exact', head: true })
				.eq('event_id', eventId);

			if ((count ?? 0) >= event.max_signups) {
				return fail(400, { error: 'This event is full.' });
			}
		}

		const { error } = await locals.supabase
			.from('outreach_event_signups')
			.insert({ event_id: eventId, user_id: user.id });

		if (error) {
			if (error.code === '23505') {
				return fail(400, { error: 'You are already signed up for this event.' });
			}
			return fail(400, { error: error.message });
		}

		return { ok: true };
	},

	cancelSignup: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const eventId = String(form.get('event_id') ?? '').trim();
		if (!eventId) return fail(400, { error: 'Event is required.' });

		const { error } = await locals.supabase
			.from('outreach_event_signups')
			.delete()
			.eq('event_id', eventId)
			.eq('user_id', user.id);

		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},

	logHours: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });

		const form = await request.formData();
		const eventId = String(form.get('event_id') ?? '').trim() || null;
		const hoursRaw = Number(form.get('hours') ?? '0');
		const description = String(form.get('description') ?? '').trim();
		const seasonId = String(form.get('season_id') ?? '').trim();

		if (!seasonId) return fail(400, { error: 'No active season.' });
		if (!hoursRaw || hoursRaw <= 0) return fail(400, { error: 'Hours must be greater than zero.' });
		if (hoursRaw > 100) return fail(400, { error: 'Hours cannot exceed 100.' });
		if (!description) return fail(400, { error: 'A description is required.' });

		const { error } = await locals.supabase.from('outreach_hours').insert({
			user_id: user.id,
			event_id: eventId,
			season_id: seasonId,
			hours: hoursRaw,
			description,
			verification_status: 'pending'
		});

		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
