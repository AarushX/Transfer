import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isMentor } from '$lib/roles';

type DayInput = {
	date: string;
	label: string;
	notes: string;
	roles: { label: string; slots: number; mode: 'slots' | 'capacity'; description: string }[];
};

const createEventWithDays = async (
	supabase: any,
	input: {
		title: string;
		description: string;
		isActive: boolean;
		createdBy: string | null;
		days: DayInput[];
	}
) => {
	const { data: event, error: eventErr } = await supabase
		.from('carpool_events')
		.insert({
			title: input.title,
			description: input.description,
			is_active: input.isActive,
			created_by: input.createdBy
		})
		.select('id')
		.single();
	if (eventErr || !event) return { error: eventErr?.message ?? 'Could not create event.', eventId: null };

	for (let i = 0; i < input.days.length; i += 1) {
		const day = input.days[i];
		const { data: dayRow, error: dayErr } = await supabase
			.from('carpool_event_days')
			.insert({
				event_id: event.id,
				day_date: day.date,
				label: day.label,
				notes: day.notes,
				sort_order: i
			})
			.select('id')
			.single();
		if (dayErr || !dayRow) {
			await supabase.from('carpool_events').delete().eq('id', event.id);
			return { error: dayErr?.message ?? 'Could not create event days.', eventId: null };
		}
		const roleRows = day.roles.map((role, idx) => ({
			day_id: dayRow.id,
			role_key: `role_${i + 1}_${idx + 1}`,
			role_label: role.label,
			slot_count: Math.max(1, role.slots),
			signup_mode: role.mode,
			role_description: role.description,
			sort_order: idx
		}));
		const { error: roleErr } = await supabase.from('carpool_day_roles').insert(roleRows);
		if (roleErr) {
			await supabase.from('carpool_events').delete().eq('id', event.id);
			return { error: roleErr.message, eventId: null };
		}
	}

	return { error: null, eventId: String(event.id) };
};

const loadEventDaysPayload = async (supabase: any, eventId: string): Promise<DayInput[]> => {
	const { data: days } = await supabase
		.from('carpool_event_days')
		.select('id,day_date,label,notes,sort_order')
		.eq('event_id', eventId)
		.order('sort_order');
	const dayRows = days ?? [];
	if (dayRows.length === 0) return [];
	const dayIds = dayRows.map((row: any) => String(row.id));
	const { data: roles } = await supabase
		.from('carpool_day_roles')
		.select('day_id,role_label,slot_count,signup_mode,role_description,sort_order')
		.in('day_id', dayIds)
		.order('sort_order');
	const rolesByDay = new Map<string, any[]>();
	for (const role of roles ?? []) {
		const key = String(role.day_id);
		const list = rolesByDay.get(key) ?? [];
		list.push(role);
		rolesByDay.set(key, list);
	}
	return dayRows
		.map((day: any) => ({
			date: String(day.day_date ?? ''),
			label: String(day.label ?? ''),
			notes: String(day.notes ?? ''),
			roles: (rolesByDay.get(String(day.id)) ?? []).map((role: any) => ({
				label: String(role.role_label ?? '').trim(),
				slots: Math.max(1, Number(role.slot_count ?? 1) || 1),
				mode: String(role.signup_mode ?? 'slots') === 'capacity' ? 'capacity' : 'slots',
				description: String(role.role_description ?? '').trim()
			}))
		}))
		.filter((day: DayInput) => day.date && day.roles.length > 0);
};

const parseDays = (raw: string): DayInput[] => {
	try {
		const parsed = JSON.parse(raw || '[]');
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((day: any) => ({
				date: String(day?.date ?? '').trim(),
				label: String(day?.label ?? '').trim(),
				notes: String(day?.notes ?? '').trim(),
				roles: Array.isArray(day?.roles)
					? day.roles
							.map((role: any) => ({
								label: String(role?.label ?? '').trim(),
								slots: Math.max(1, Number(role?.slots ?? 1) || 1),
								mode: String(role?.mode ?? 'slots') === 'capacity' ? 'capacity' : 'slots',
								description: String(role?.description ?? '').trim()
							}))
							.filter((role: any) => role.label)
					: []
			}))
			.filter((day: DayInput) => day.date && day.roles.length > 0);
	} catch {
		return [];
	}
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile || !isMentor(profile)) return { events: [], days: [], roles: [], signups: [], templates: [] };

	const [{ data: events }, { data: days }, { data: roles }, { data: signups }, { data: templates }] = await Promise.all([
		locals.supabase.from('carpool_events').select('*').order('created_at', { ascending: false }),
		locals.supabase.from('carpool_event_days').select('*').order('day_date').order('sort_order'),
		locals.supabase.from('carpool_day_roles').select('*').order('sort_order'),
		locals.supabase.from('carpool_signups').select('id,role_id,user_id,capacity_count,created_at'),
		locals.supabase
			.from('carpool_event_templates')
			.select('id,name,title,description,is_active,days_json')
			.order('created_at', { ascending: false })
	]);

	const profileIds = Array.from(new Set((signups ?? []).map((row: any) => String(row.user_id))));
	const { data: profiles } = profileIds.length
		? await locals.supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
		: { data: [] as any[] };
	const profileById = new Map((profiles ?? []).map((row: any) => [String(row.id), row]));

	return {
		events: events ?? [],
		days: days ?? [],
		roles: roles ?? [],
		templates: templates ?? [],
		signups: (signups ?? []).map((row: any) => ({
			...row,
			user: profileById.get(String(row.user_id)) ?? null
		}))
	};
};

export const actions: Actions = {
	createFromTemplate: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const templateId = String(form.get('template_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		if (!templateId) return fail(400, { error: 'Template is required.' });
		if (!title) return fail(400, { error: 'Event title is required.' });

		const { data: template } = await locals.supabase
			.from('carpool_event_templates')
			.select('description,is_active,days_json')
			.eq('id', templateId)
			.maybeSingle();
		if (!template) return fail(404, { error: 'Template not found.' });
		const days = parseDays(JSON.stringify((template as any).days_json ?? []));
		if (days.length === 0) return fail(400, { error: 'Template has no valid day/role configuration.' });

		const createResult = await createEventWithDays(locals.supabase, {
			title,
			description: String((template as any).description ?? ''),
			isActive: Boolean((template as any).is_active),
			createdBy: user?.id ?? null,
			days
		});
		if (createResult.error) return fail(400, { error: createResult.error });

		return { ok: true };
	},
	createEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const isActive = String(form.get('is_active') ?? '') === 'on';
		const daysJson = String(form.get('days_json') ?? '[]').trim();
		const days = parseDays(daysJson);
		const saveAsTemplate = String(form.get('save_as_template') ?? '') === 'on';
		const templateName = String(form.get('template_name') ?? '').trim();
		if (!title) return fail(400, { error: 'Event title is required.' });
		if (days.length === 0) return fail(400, { error: 'Add at least one day with at least one role slot.' });

		const createResult = await createEventWithDays(locals.supabase, {
			title,
			description,
			isActive: isActive,
			createdBy: user?.id ?? null,
			days
		});
		if (createResult.error) return fail(400, { error: createResult.error });

		if (saveAsTemplate) {
			if (!templateName) return fail(400, { error: 'Template name is required when saving a template.' });
			const { error: templateErr } = await locals.supabase.from('carpool_event_templates').insert({
				name: templateName,
				title,
				description,
				is_active: isActive,
				days_json: days,
				created_by: user?.id ?? null
			});
			if (templateErr) return fail(400, { error: templateErr.message });
		}

		return { ok: true };
	},
	updateEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const eventId = String(form.get('event_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const isActive = String(form.get('is_active') ?? '') === 'on';
		if (!eventId) return fail(400, { error: 'Event is required.' });
		if (!title) return fail(400, { error: 'Event title is required.' });
		const { error } = await locals.supabase
			.from('carpool_events')
			.update({ title, description, is_active: isActive })
			.eq('id', eventId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	deleteEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const eventId = String(form.get('event_id') ?? '').trim();
		if (!eventId) return fail(400, { error: 'Event is required.' });
		const { error } = await locals.supabase.from('carpool_events').delete().eq('id', eventId);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	saveTemplateFromEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isMentor(profile)) return fail(403, { error: 'Forbidden' });
		const form = await request.formData();
		const eventId = String(form.get('event_id') ?? '').trim();
		const templateName = String(form.get('template_name') ?? '').trim();
		if (!eventId) return fail(400, { error: 'Event is required.' });
		if (!templateName) return fail(400, { error: 'Template name is required.' });
		const { data: event } = await locals.supabase
			.from('carpool_events')
			.select('title,description,is_active')
			.eq('id', eventId)
			.maybeSingle();
		if (!event) return fail(404, { error: 'Event not found.' });
		const days = await loadEventDaysPayload(locals.supabase, eventId);
		if (days.length === 0) return fail(400, { error: 'Event has no valid day/role configuration to template.' });
		const { error: templateErr } = await locals.supabase.from('carpool_event_templates').insert({
			name: templateName,
			title: String((event as any).title ?? ''),
			description: String((event as any).description ?? ''),
			is_active: Boolean((event as any).is_active),
			days_json: days,
			created_by: user?.id ?? null
		});
		if (templateErr) return fail(400, { error: templateErr.message });
		return { ok: true };
	}
};
