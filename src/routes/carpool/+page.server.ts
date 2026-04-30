import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return { events: [], days: [], roles: [], signups: [], me: null };
	const { data: events } = await locals.supabase
		.from('carpool_events')
		.select('*')
		.eq('is_active', true)
		.order('created_at', { ascending: false });
	const eventIds = (events ?? []).map((row: any) => String(row.id));
	if (eventIds.length === 0) {
		return { me: user.id, events: [], days: [], roles: [], signups: [] };
	}
	const { data: days } = await locals.supabase
		.from('carpool_event_days')
		.select('*')
		.in('event_id', eventIds)
		.order('day_date')
		.order('sort_order');
	const dayIds = (days ?? []).map((row: any) => String(row.id));
	if (dayIds.length === 0) {
		return { me: user.id, events: events ?? [], days: [], roles: [], signups: [] };
	}
	const { data: roles } = await locals.supabase
		.from('carpool_day_roles')
		.select('*')
		.in('day_id', dayIds)
		.order('sort_order');
	const roleIds = (roles ?? []).map((row: any) => String(row.id));
	const { data: signups } = roleIds.length
		? await locals.supabase
				.from('carpool_signups')
				.select('id,role_id,user_id,notes,capacity_count,created_at')
				.in('role_id', roleIds)
		: { data: [] as any[] };

	const profileIds = Array.from(new Set((signups ?? []).map((row: any) => String(row.user_id))));
	const { data: profiles } = profileIds.length
		? await locals.supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
		: { data: [] as any[] };
	const profileById = new Map((profiles ?? []).map((row: any) => [String(row.id), row]));

	return {
		me: user.id,
		events: events ?? [],
		days: days ?? [],
		roles: roles ?? [],
		signups: (signups ?? []).map((row: any) => ({
			...row,
			user: profileById.get(String(row.user_id)) ?? null
		}))
	};
};

export const actions: Actions = {
	signUp: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const roleId = String(form.get('role_id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const capacityInput = Math.max(1, Number(form.get('capacity_count') ?? '1') || 1);
		if (!roleId) return fail(400, { error: 'Role is required.' });
		const { error } = await locals.supabase.rpc('carpool_signup_atomic', {
			p_role_id: roleId,
			p_notes: notes,
			p_capacity_count: capacityInput
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	cancelSignup: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const signupId = String(form.get('signup_id') ?? '').trim();
		if (!signupId) return fail(400, { error: 'Signup is required.' });
		const { error } = await locals.supabase
			.from('carpool_signups')
			.delete()
			.eq('id', signupId)
			.eq('user_id', user.id);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	}
};
