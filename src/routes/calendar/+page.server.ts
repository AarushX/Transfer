import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin, isLead, isMentor } from '$lib/roles';

const DAYS = 14;

function dateOnly(d: Date) {
	return d.toISOString().slice(0, 10);
}

function buildWindow() {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const dates: string[] = [];
	for (let i = 0; i < DAYS; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		dates.push(dateOnly(d));
	}
	return { start: dates[0], end: dates[dates.length - 1], dates };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw redirect(303, '/login');

	const scope = (url.searchParams.get('scope') ?? 'me') as 'me' | 'team' | 'all';
	const canTeam = isMentor(profile) || isLead(profile);
	const canAll = isAdmin(profile);
	const { data: primaryTeamRow } = await locals.supabase
		.from('profile_primary_teams')
		.select('team_group_id')
		.eq('user_id', user.id)
		.maybeSingle();
	const primaryTeamGroupId = String(primaryTeamRow?.team_group_id ?? '');

	const { start, end, dates } = buildWindow();

	// Fetch subteams for labelling
	const { data: subteams } = await locals.supabase.from('subteams').select('id,name,slug').order('name');

	// Self date-level overrides
	const { data: mineOverrides } = await locals.supabase
		.from('shop_shift_availability')
		.select('shift_date,shift_number,is_active')
		.eq('user_id', user.id)
		.gte('shift_date', start)
		.lte('shift_date', end);

	const { data: mineRecurring } = await locals.supabase
		.from('shop_shift_recurring_availability')
		.select('day_of_week,shift_number,is_active')
		.eq('user_id', user.id);
	const recurringMine = new Map<string, boolean>();
	for (const row of mineRecurring ?? []) {
		recurringMine.set(`${row.day_of_week}|${row.shift_number}`, Boolean(row.is_active));
	}
	const mineOverridesMap = new Map<string, boolean>();
	for (const row of mineOverrides ?? []) {
		mineOverridesMap.set(`${row.shift_date}|${row.shift_number}`, Boolean((row as any).is_active));
	}
	const mineSet = new Set<string>();
	for (const iso of dates) {
		const weekday = new Date(`${iso}T00:00:00`).getDay();
		for (const shift of [1, 2]) {
			const base = recurringMine.get(`${weekday}|${shift}`) ?? false;
			const key = `${iso}|${shift}`;
			const effective = mineOverridesMap.has(key) ? Boolean(mineOverridesMap.get(key)) : base;
			if (effective) mineSet.add(key);
		}
	}

	// Determine roster scope
	type RosterUser = {
		id: string;
		full_name: string;
		email: string;
		avatar_url: string;
		role: string;
		base_role: string | null;
		is_mentor: boolean | null;
		is_lead: boolean | null;
		subteam_id: string | null;
	};
	const rosterRank = (r: RosterUser) => {
		if (isMentor(r)) return 0;
		if (isAdmin(r)) return 1;
		if (isLead(r)) return 2;
		return 3;
	};
	const rosterSort = (a: RosterUser, b: RosterUser) => {
		const rankDelta = rosterRank(a) - rosterRank(b);
		if (rankDelta !== 0) return rankDelta;
		return (a.full_name || a.email).localeCompare(b.full_name || b.email);
	};
	let roster: RosterUser[] = [];
	if (scope === 'team' && canTeam && primaryTeamGroupId) {
		const { data: primaryRows } = await locals.supabase
			.from('profile_primary_teams')
			.select('user_id')
			.eq('team_group_id', primaryTeamGroupId);
		const userIds = (primaryRows ?? []).map((row: any) => String(row.user_id)).filter(Boolean);
		if (userIds.length > 0) {
			const { data } = await locals.supabase
				.from('profiles')
				.select('id,full_name,email,avatar_url,role,base_role,is_mentor,is_lead,subteam_id')
				.in('id', userIds)
				.order('full_name');
			roster = (data ?? []).sort(rosterSort);
		}
	} else if (scope === 'all' && canAll) {
		const { data } = await locals.supabase
			.from('profiles')
			.select('id,full_name,email,avatar_url,role,base_role,is_mentor,is_lead,subteam_id')
			.order('full_name');
		roster = (data ?? []).sort(rosterSort);
	}

	let rosterOverrides: Array<{
		user_id: string;
		shift_date: string;
		shift_number: number;
		is_active: boolean;
	}> = [];
	let rosterRecurring: Array<{ user_id: string; day_of_week: number; shift_number: number; is_active: boolean }> =
		[];
	if (roster.length > 0) {
		const [{ data: overrideRows }, { data: recurringRows }] = await Promise.all([
			locals.supabase
			.from('shop_shift_availability')
				.select('user_id,shift_date,shift_number,is_active')
			.in('user_id', roster.map((r) => r.id))
			.gte('shift_date', start)
				.lte('shift_date', end),
			locals.supabase
				.from('shop_shift_recurring_availability')
				.select('user_id,day_of_week,shift_number,is_active')
				.in('user_id', roster.map((r) => r.id))
		]);
		rosterOverrides = overrideRows ?? [];
		rosterRecurring = recurringRows ?? [];
	}

	// Group by date+shift for display
	const bucket = new Map<string, string[]>(); // key `date|shift` -> [user_id]
	const recurringByUser = new Map<string, Map<string, boolean>>();
	for (const row of rosterRecurring) {
		const byRule = recurringByUser.get(String(row.user_id)) ?? new Map<string, boolean>();
		byRule.set(`${row.day_of_week}|${row.shift_number}`, Boolean(row.is_active));
		recurringByUser.set(String(row.user_id), byRule);
	}
	const overridesByUserDate = new Map<string, boolean>();
	for (const row of rosterOverrides) {
		overridesByUserDate.set(`${row.user_id}|${row.shift_date}|${row.shift_number}`, Boolean(row.is_active));
	}
	for (const person of roster) {
		const recurring = recurringByUser.get(String(person.id)) ?? new Map<string, boolean>();
		for (const iso of dates) {
			const weekday = new Date(`${iso}T00:00:00`).getDay();
			for (const shift of [1, 2]) {
				const base = recurring.get(`${weekday}|${shift}`) ?? false;
				const overrideKey = `${person.id}|${iso}|${shift}`;
				const effective = overridesByUserDate.has(overrideKey)
					? Boolean(overridesByUserDate.get(overrideKey))
					: base;
				if (!effective) continue;
				const key = `${iso}|${shift}`;
				const list = bucket.get(key) ?? [];
				list.push(person.id);
				bucket.set(key, list);
			}
		}
	}
	const rosterByKey: Record<string, string[]> = {};
	const rosterOrder = new Map(roster.map((r, idx) => [r.id, idx]));
	bucket.forEach((v, k) =>
		(rosterByKey[k] = v.slice().sort((a, b) => (rosterOrder.get(a) ?? 9999) - (rosterOrder.get(b) ?? 9999)))
	);

	return {
		scope,
		canTeam,
		canAll,
		dates,
		mine: Array.from(mineSet),
		mineRecurring:
			(mineRecurring ?? []).map((row: any) => ({
				day_of_week: Number(row.day_of_week),
				shift_number: Number(row.shift_number),
				is_active: Boolean(row.is_active)
			})) ?? [],
		roster,
		rosterByKey,
		subteams: subteams ?? []
	};
};

export const actions: Actions = {
	recurring: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const day = Number(form.get('day') ?? '-1');
		const shift = Number(form.get('shift') ?? '0');
		const active = String(form.get('active') ?? '') === 'true';
		if (!Number.isInteger(day) || day < 0 || day > 6 || ![1, 2].includes(shift)) {
			return fail(400, { error: 'Bad day or shift.' });
		}
		const { error } = await locals.supabase.from('shop_shift_recurring_availability').upsert(
			{
				user_id: user.id,
				day_of_week: day,
				shift_number: shift,
				is_active: active
			},
			{ onConflict: 'user_id,day_of_week,shift_number' }
		);
		if (error) return fail(400, { error: error.message });
		return { ok: true };
	},
	toggle: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const date = String(form.get('date') ?? '');
		const shift = Number(form.get('shift') ?? '0');
		const available = String(form.get('available') ?? '') === 'true';
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ![1, 2].includes(shift)) {
			return fail(400, { error: 'Bad date or shift.' });
		}
		const weekday = new Date(`${date}T00:00:00`).getDay();
		const { data: recurring } = await locals.supabase
			.from('shop_shift_recurring_availability')
			.select('is_active')
			.eq('user_id', user.id)
			.eq('day_of_week', weekday)
			.eq('shift_number', shift)
			.maybeSingle();
		const recurringActive = Boolean(recurring?.is_active);
		// Client posts the target state (after click), not the current state.
		const desiredActive = available;

		// If desired state matches recurring default, remove manual override.
		// Otherwise store an explicit per-date override.
		if (desiredActive === recurringActive) {
			const { error } = await locals.supabase
				.from('shop_shift_availability')
				.delete()
				.eq('user_id', user.id)
				.eq('shift_date', date)
				.eq('shift_number', shift);
			if (error) return fail(400, { error: error.message });
		} else {
			const { error } = await locals.supabase
				.from('shop_shift_availability')
				.upsert(
					{ user_id: user.id, shift_date: date, shift_number: shift, is_active: desiredActive },
					{ onConflict: 'user_id,shift_date,shift_number' }
				);
			if (error) return fail(400, { error: error.message });
		}
		return { ok: true };
	}
};
