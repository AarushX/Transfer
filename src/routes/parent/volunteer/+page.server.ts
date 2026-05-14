import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireParentPortal } from '$lib/server/parent-access';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireParentPortal(locals);
	const service = createSupabaseServiceClient();

	const { data: season } = await service
		.from('lettering_seasons')
		.select('id,label,start_date,end_date')
		.eq('is_active', true)
		.maybeSingle();

	if (!season) {
		return { season: null, family: null, categories: [], commitments: [], opportunities: [], signups: [], hourLogs: [], progress: [] };
	}

	const { data: familyMembership } = await service
		.from('family_members')
		.select('family_id,role,families(id,name)')
		.eq('user_id', user.id)
		.eq('role', 'parent')
		.limit(1)
		.maybeSingle();

	const family = familyMembership?.families
		? { id: (familyMembership.families as any).id, name: (familyMembership.families as any).name }
		: null;

	if (!family) {
		return { season, family: null, categories: [], commitments: [], opportunities: [], signups: [], hourLogs: [], progress: [] };
	}

	const [
		{ data: categories },
		{ data: commitments },
		{ data: opportunities },
		{ data: signups },
		{ data: hourLogs },
		{ data: progress }
	] = await Promise.all([
		service
			.from('volunteer_categories')
			.select('*')
			.eq('is_active', true)
			.order('sort_order'),
		service
			.from('volunteer_commitments')
			.select('*')
			.eq('family_id', family.id)
			.eq('season_id', season.id),
		service
			.from('volunteer_opportunities')
			.select('*,category:volunteer_categories(name,slug,unit)')
			.eq('season_id', season.id)
			.eq('is_active', true)
			.order('event_date'),
		service
			.from('volunteer_signups')
			.select('*,opportunity:volunteer_opportunities(id,title,event_date,category_id,category:volunteer_categories(name,slug))')
			.eq('family_id', family.id),
		service
			.from('volunteer_hour_logs')
			.select('*,category:volunteer_categories(name,slug,unit)')
			.eq('family_id', family.id)
			.eq('season_id', season.id)
			.order('activity_date', { ascending: false }),
		service
			.from('family_progress')
			.select('*')
			.eq('family_id', family.id)
			.eq('season_id', season.id)
	]);

	const signupCountByOpp = new Map<string, number>();
	if (opportunities && opportunities.length > 0) {
		const oppIds = opportunities.map((o: any) => o.id);
		const { data: allSignups } = await service
			.from('volunteer_signups')
			.select('opportunity_id')
			.in('opportunity_id', oppIds)
			.neq('status', 'cancelled');
		for (const s of allSignups ?? []) {
			signupCountByOpp.set(s.opportunity_id, (signupCountByOpp.get(s.opportunity_id) ?? 0) + 1);
		}
	}

	return {
		season,
		family,
		categories: categories ?? [],
		commitments: commitments ?? [],
		opportunities: (opportunities ?? []).map((o: any) => ({
			...o,
			currentSignups: signupCountByOpp.get(o.id) ?? 0
		})),
		signups: signups ?? [],
		hourLogs: hourLogs ?? [],
		progress: progress ?? []
	};
};

export const actions: Actions = {
	submitPledge: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const { data: season } = await service
			.from('lettering_seasons')
			.select('id')
			.eq('is_active', true)
			.maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const { data: fm } = await service
			.from('family_members')
			.select('family_id')
			.eq('user_id', user.id)
			.eq('role', 'parent')
			.limit(1)
			.maybeSingle();
		if (!fm) return fail(400, { error: 'No family found. Link a student first.' });

		const { data: categories } = await service
			.from('volunteer_categories')
			.select('id,slug')
			.eq('is_active', true);

		const pledges: { family_id: string; category_id: string; season_id: string; response: string; notes: string }[] = [];
		let yesCount = 0;

		for (const cat of categories ?? []) {
			const response = String(form.get(`pledge_${cat.slug}`) ?? 'no');
			const notes = String(form.get(`notes_${cat.slug}`) ?? '').trim();
			if (!['yes', 'no', 'maybe'].includes(response)) continue;
			if (response === 'yes') yesCount++;
			pledges.push({
				family_id: fm.family_id,
				category_id: cat.id,
				season_id: season.id,
				response,
				notes
			});
		}

		if (yesCount < 3) {
			return fail(400, { error: 'You must commit to at least 3 categories. Please select 3 or more "Yes" responses.' });
		}

		for (const pledge of pledges) {
			const { error } = await service
				.from('volunteer_commitments')
				.upsert(pledge, { onConflict: 'family_id,category_id,season_id' });
			if (error) return fail(400, { error: error.message });
		}

		return { ok: true, section: 'pledge' };
	},

	signUp: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const opportunityId = String(form.get('opportunity_id') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();

		if (!opportunityId) return fail(400, { error: 'Opportunity is required.' });

		const { data: fm } = await service
			.from('family_members')
			.select('family_id')
			.eq('user_id', user.id)
			.eq('role', 'parent')
			.limit(1)
			.maybeSingle();
		if (!fm) return fail(400, { error: 'No family found.' });

		const { data: opp } = await service
			.from('volunteer_opportunities')
			.select('id,slots,requires_approval,signup_deadline')
			.eq('id', opportunityId)
			.eq('is_active', true)
			.maybeSingle();
		if (!opp) return fail(400, { error: 'Opportunity not found or no longer available.' });

		if (opp.signup_deadline && new Date(opp.signup_deadline) < new Date()) {
			return fail(400, { error: 'Signup deadline has passed.' });
		}

		const { count } = await service
			.from('volunteer_signups')
			.select('id', { count: 'exact', head: true })
			.eq('opportunity_id', opportunityId)
			.neq('status', 'cancelled');
		if ((count ?? 0) >= opp.slots) {
			return fail(400, { error: 'All slots are filled.' });
		}

		const { error } = await service
			.from('volunteer_signups')
			.insert({
				family_id: fm.family_id,
				opportunity_id: opportunityId,
				user_id: user.id,
				status: opp.requires_approval ? 'pending' : 'confirmed',
				notes
			});
		if (error) {
			if (error.code === '23505') return fail(400, { error: 'You already signed up for this opportunity.' });
			return fail(400, { error: error.message });
		}

		return { ok: true, section: 'signup' };
	},

	cancelSignup: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const signupId = String(form.get('signup_id') ?? '').trim();
		if (!signupId) return fail(400, { error: 'Signup ID is required.' });

		const { data: fm } = await service
			.from('family_members')
			.select('family_id')
			.eq('user_id', user.id)
			.eq('role', 'parent')
			.limit(1)
			.maybeSingle();
		if (!fm) return fail(400, { error: 'No family found.' });

		const { error } = await service
			.from('volunteer_signups')
			.update({ status: 'cancelled' })
			.eq('id', signupId)
			.eq('family_id', fm.family_id);
		if (error) return fail(400, { error: error.message });

		return { ok: true, section: 'cancel' };
	},

	logHours: async ({ locals, request }) => {
		const { user } = await requireParentPortal(locals);
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const categoryId = String(form.get('category_id') ?? '').trim();
		const amount = Number(form.get('amount') ?? 0);
		const activityDate = String(form.get('activity_date') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const opportunityId = String(form.get('opportunity_id') ?? '').trim() || null;

		if (!categoryId) return fail(400, { error: 'Category is required.' });
		if (!amount || amount <= 0) return fail(400, { error: 'Amount must be greater than 0.' });
		if (!activityDate) return fail(400, { error: 'Date is required.' });
		if (!description) return fail(400, { error: 'Description is required.' });

		const { data: season } = await service
			.from('lettering_seasons')
			.select('id')
			.eq('is_active', true)
			.maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const { data: fm } = await service
			.from('family_members')
			.select('family_id')
			.eq('user_id', user.id)
			.eq('role', 'parent')
			.limit(1)
			.maybeSingle();
		if (!fm) return fail(400, { error: 'No family found.' });

		const { error } = await service
			.from('volunteer_hour_logs')
			.insert({
				family_id: fm.family_id,
				category_id: categoryId,
				opportunity_id: opportunityId,
				season_id: season.id,
				user_id: user.id,
				amount,
				activity_date: activityDate,
				description
			});
		if (error) return fail(400, { error: error.message });

		return { ok: true, section: 'hours' };
	}
};
