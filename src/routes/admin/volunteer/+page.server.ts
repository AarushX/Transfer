import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin, isMentor } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!profile || !(isAdmin(profile) || isMentor(profile))) throw redirect(303, '/dashboard');

	const service = createSupabaseServiceClient();

	const { data: season } = await service
		.from('lettering_seasons')
		.select('id,label,start_date,end_date')
		.eq('is_active', true)
		.maybeSingle();

	if (!season) {
		return { season: null, categories: [], opportunities: [], families: [], pendingVerifications: [], commitmentStats: [], gapsReport: [] };
	}

	const [
		{ data: categories },
		{ data: opportunities },
		{ data: families },
		{ data: pendingLogs },
		{ data: commitments },
		{ data: allSignups },
		{ data: allLogs }
	] = await Promise.all([
		service
			.from('volunteer_categories')
			.select('*')
			.eq('is_active', true)
			.order('sort_order'),
		service
			.from('volunteer_opportunities')
			.select('*,category:volunteer_categories(name,slug),creator:profiles!volunteer_opportunities_created_by_fkey(full_name,email)')
			.eq('season_id', season.id)
			.order('event_date', { ascending: false }),
		service
			.from('families')
			.select('id,name,family_members(user_id,role,profile:profiles(full_name,email))')
			.eq('season_id', season.id),
		service
			.from('volunteer_hour_logs')
			.select('*,family:families(id,name),category:volunteer_categories(name,slug,unit),reporter:profiles!volunteer_hour_logs_user_id_fkey(full_name,email)')
			.eq('season_id', season.id)
			.eq('verification_status', 'pending')
			.order('created_at', { ascending: false }),
		service
			.from('volunteer_commitments')
			.select('*,family:families(id,name),category:volunteer_categories(name,slug)')
			.eq('season_id', season.id),
		service
			.from('volunteer_signups')
			.select('*,family:families(id,name)')
			.neq('status', 'cancelled'),
		service
			.from('volunteer_hour_logs')
			.select('family_id,category_id,amount,verification_status')
			.eq('season_id', season.id)
	]);

	const signupCountByOpp = new Map<string, number>();
	for (const s of allSignups ?? []) {
		signupCountByOpp.set(s.opportunity_id, (signupCountByOpp.get(s.opportunity_id) ?? 0) + 1);
	}

	const catMap = new Map((categories ?? []).map((c: any) => [c.id, c]));
	const gapsReport: any[] = [];
	for (const opp of opportunities ?? []) {
		const filled = signupCountByOpp.get(opp.id) ?? 0;
		if (filled < opp.slots) {
			gapsReport.push({
				opportunity: opp,
				filled,
				needed: opp.slots - filled,
				categoryName: opp.category?.name ?? ''
			});
		}
	}

	const familyProgress = new Map<string, { pledged: number; verified: number; familyName: string }>();
	for (const com of commitments ?? []) {
		if (com.response !== 'yes') continue;
		const key = com.family_id;
		const entry = familyProgress.get(key) ?? { pledged: 0, verified: 0, familyName: (com.family as any)?.name ?? '' };
		entry.pledged++;
		familyProgress.set(key, entry);
	}
	for (const log of allLogs ?? []) {
		if (log.verification_status !== 'verified') continue;
		const cat = catMap.get(log.category_id);
		if (!cat) continue;
		const entry = familyProgress.get(log.family_id);
		if (entry && Number(log.amount) >= Number(cat.target_value)) {
			entry.verified++;
		}
	}

	return {
		season,
		categories: categories ?? [],
		opportunities: (opportunities ?? []).map((o: any) => ({
			...o,
			currentSignups: signupCountByOpp.get(o.id) ?? 0
		})),
		families: families ?? [],
		pendingVerifications: pendingLogs ?? [],
		commitmentStats: Array.from(familyProgress.entries()).map(([id, v]) => ({
			familyId: id,
			familyName: v.familyName,
			pledgedCount: v.pledged,
			verifiedCount: v.verified
		})),
		gapsReport
	};
};

export const actions: Actions = {
	createOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const { data: season } = await service
			.from('lettering_seasons')
			.select('id')
			.eq('is_active', true)
			.maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const categoryId = String(form.get('category_id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const eventDate = String(form.get('event_date') ?? '').trim();
		const startTime = String(form.get('start_time') ?? '').trim() || null;
		const endTime = String(form.get('end_time') ?? '').trim() || null;
		const slots = Math.max(1, Number(form.get('slots') ?? 1));
		const requiresApproval = form.get('requires_approval') === 'on';
		const signupDeadline = String(form.get('signup_deadline') ?? '').trim() || null;

		if (!categoryId || !title || !eventDate) return fail(400, { error: 'Category, title, and date are required.' });

		const { error } = await service
			.from('volunteer_opportunities')
			.insert({
				category_id: categoryId,
				season_id: season.id,
				title,
				description,
				location,
				event_date: eventDate,
				start_time: startTime,
				end_time: endTime,
				slots,
				requires_approval: requiresApproval,
				signup_deadline: signupDeadline,
				created_by: user.id
			});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'opportunity' };
	},

	deleteOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Opportunity ID is required.' });

		const { error } = await service.from('volunteer_opportunities').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'delete' };
	},

	toggleOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const active = form.get('is_active') === 'true';

		const { error } = await service
			.from('volunteer_opportunities')
			.update({ is_active: active })
			.eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'toggle' };
	},

	verifyHours: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const logId = String(form.get('log_id') ?? '').trim();
		const action = String(form.get('action') ?? '').trim();
		const rejectionReason = String(form.get('rejection_reason') ?? '').trim();

		if (!logId || !['verify', 'reject'].includes(action)) return fail(400, { error: 'Invalid verification action.' });

		const updatePayload: any = {
			verification_status: action === 'verify' ? 'verified' : 'rejected',
			verifier_id: user.id,
			verified_at: new Date().toISOString()
		};
		if (action === 'reject' && rejectionReason) {
			updatePayload.rejection_reason = rejectionReason;
		}

		const { error } = await service
			.from('volunteer_hour_logs')
			.update(updatePayload)
			.eq('id', logId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'verify' };
	},

	updateSignupStatus: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const signupId = String(form.get('signup_id') ?? '').trim();
		const status = String(form.get('status') ?? '').trim();

		if (!signupId || !['confirmed', 'completed', 'verified', 'cancelled'].includes(status)) {
			return fail(400, { error: 'Invalid status.' });
		}

		const updatePayload: any = { status };
		if (status === 'confirmed') updatePayload.confirmed_at = new Date().toISOString();
		if (status === 'completed') updatePayload.completed_at = new Date().toISOString();

		const { error } = await service
			.from('volunteer_signups')
			.update(updatePayload)
			.eq('id', signupId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'signup_status' };
	},

	createFamily: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const parentUserId = String(form.get('parent_user_id') ?? '').trim();

		if (!name) return fail(400, { error: 'Family name is required.' });

		const { data: season } = await service
			.from('lettering_seasons')
			.select('id')
			.eq('is_active', true)
			.maybeSingle();

		const { data: family, error } = await service
			.from('families')
			.insert({ name, season_id: season?.id ?? null })
			.select('id')
			.single();
		if (error) return fail(400, { error: error.message });

		if (parentUserId) {
			await service.from('family_members').insert({
				family_id: family.id,
				user_id: parentUserId,
				role: 'parent'
			});
		}

		return { ok: true, section: 'family' };
	},

	updateCategory: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });

		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const targetValue = Number(form.get('target_value') ?? 0);
		const isActive = form.get('is_active') === 'on';

		if (!id) return fail(400, { error: 'Category ID is required.' });

		const { error } = await service
			.from('volunteer_categories')
			.update({ target_value: targetValue, is_active: isActive })
			.eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'category' };
	}
};
