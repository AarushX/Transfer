import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return { events: [], days: [], roles: [], signups: [], me: null };
	const [{ data: events }, { data: days }, { data: roles }, { data: signups }] = await Promise.all([
		locals.supabase.from('carpool_events').select('*').eq('is_active', true).order('created_at', { ascending: false }),
		locals.supabase.from('carpool_event_days').select('*').order('day_date').order('sort_order'),
		locals.supabase.from('carpool_day_roles').select('*').order('sort_order'),
		locals.supabase.from('carpool_signups').select('id,role_id,user_id,notes,capacity_count,created_at')
	]);

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

		const { data: role } = await locals.supabase
			.from('carpool_day_roles')
			.select('id,slot_count,signup_mode')
			.eq('id', roleId)
			.maybeSingle();
		if (!role) return fail(404, { error: 'Slot not found.' });
		const { data: roleSignups } = await locals.supabase
			.from('carpool_signups')
			.select('id,capacity_count')
			.eq('role_id', roleId);
		const isCapacityMode = String((role as any).signup_mode ?? 'slots') === 'capacity';
		if (isCapacityMode) {
			const used = (roleSignups ?? []).reduce((sum: number, row: any) => sum + Math.max(1, Number(row.capacity_count ?? 1) || 1), 0);
			if (used + capacityInput > Number(role.slot_count ?? 1)) {
				return fail(400, { error: 'Not enough remaining capacity for that amount.' });
			}
		} else if ((roleSignups ?? []).length >= Number(role.slot_count ?? 1)) {
			return fail(400, { error: 'That slot is already full.' });
		}

		const { error } = await locals.supabase.from('carpool_signups').insert({
			role_id: roleId,
			user_id: user.id,
			notes,
			capacity_count: isCapacityMode ? capacityInput : 1
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
