import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isAdmin, isMentor } from '$lib/roles';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { sendAnnouncementEmail, isEmailConfigured } from '$lib/server/email';

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
		return { season: null, categories: [], events: [], opportunities: [], families: [], pendingVerifications: [], commitmentStats: [], gapsReport: [], announcements: [], emailConfigured: isEmailConfigured() };
	}

	const [
		{ data: categories },
		{ data: events },
		{ data: opportunities },
		{ data: families },
		{ data: pendingLogs },
		{ data: commitments },
		{ data: allSignups },
		{ data: allLogs },
		{ data: announcements }
	] = await Promise.all([
		service.from('volunteer_categories').select('*').eq('is_active', true).order('sort_order'),
		service.from('volunteer_events').select('*').eq('season_id', season.id).order('start_date', { ascending: false }),
		service.from('volunteer_opportunities').select('*,category:volunteer_categories(name,slug),event:volunteer_events(title),creator:profiles!volunteer_opportunities_created_by_fkey(full_name,email)').eq('season_id', season.id).order('event_date', { ascending: false }),
		service.from('families').select('id,name,family_members(user_id,role,profile:profiles(full_name,email))').eq('season_id', season.id),
		service.from('volunteer_hour_logs').select('*,family:families(id,name),category:volunteer_categories(name,slug,unit),reporter:profiles!volunteer_hour_logs_user_id_fkey(full_name,email)').eq('season_id', season.id).eq('verification_status', 'pending').order('created_at', { ascending: false }),
		service.from('volunteer_commitments').select('*,family:families(id,name),category:volunteer_categories(name,slug)').eq('season_id', season.id),
		service.from('volunteer_signups').select('*,family:families(id,name)').neq('status', 'cancelled'),
		service.from('volunteer_hour_logs').select('family_id,category_id,amount,verification_status').eq('season_id', season.id),
		service.from('announcements').select('*,author:profiles!announcements_created_by_fkey(full_name)').eq('season_id', season.id).order('created_at', { ascending: false })
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
			gapsReport.push({ opportunity: opp, filled, needed: opp.slots - filled, categoryName: opp.category?.name ?? '' });
		}
	}

	const familyProgress = new Map<string, { pledged: number; verified: number; familyName: string }>();
	for (const com of commitments ?? []) {
		if (com.response !== 'yes') continue;
		const entry = familyProgress.get(com.family_id) ?? { pledged: 0, verified: 0, familyName: (com.family as any)?.name ?? '' };
		entry.pledged++;
		familyProgress.set(com.family_id, entry);
	}
	for (const log of allLogs ?? []) {
		if (log.verification_status !== 'verified') continue;
		const cat = catMap.get(log.category_id);
		if (!cat) continue;
		const entry = familyProgress.get(log.family_id);
		if (entry && Number(log.amount) >= Number(cat.target_value)) entry.verified++;
	}

	return {
		season,
		categories: categories ?? [],
		events: events ?? [],
		opportunities: (opportunities ?? []).map((o: any) => ({ ...o, currentSignups: signupCountByOpp.get(o.id) ?? 0 })),
		families: families ?? [],
		pendingVerifications: pendingLogs ?? [],
		commitmentStats: Array.from(familyProgress.entries()).map(([id, v]) => ({ familyId: id, familyName: v.familyName, pledgedCount: v.pledged, verifiedCount: v.verified })),
		gapsReport,
		announcements: announcements ?? [],
		emailConfigured: isEmailConfigured()
	};
};

export const actions: Actions = {
	createEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const { data: season } = await service.from('lettering_seasons').select('id').eq('is_active', true).maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const startDate = String(form.get('start_date') ?? '').trim();
		const endDate = String(form.get('end_date') ?? '').trim() || null;

		if (!title || !startDate) return fail(400, { error: 'Title and start date are required.' });

		const { error } = await service.from('volunteer_events').insert({
			season_id: season.id, title, description, location, start_date: startDate, end_date: endDate, created_by: user.id
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'event' };
	},

	deleteEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Event ID required.' });
		const { error } = await service.from('volunteer_events').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'event_delete' };
	},

	createOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const { data: season } = await service.from('lettering_seasons').select('id').eq('is_active', true).maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const eventId = String(form.get('event_id') ?? '').trim() || null;
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

		const { error } = await service.from('volunteer_opportunities').insert({
			event_id: eventId, category_id: categoryId, season_id: season.id, title, description, location,
			event_date: eventDate, start_time: startTime, end_time: endTime, slots,
			requires_approval: requiresApproval, signup_deadline: signupDeadline, created_by: user.id
		});
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'opportunity' };
	},

	deleteOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Opportunity ID required.' });
		const { error } = await service.from('volunteer_opportunities').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'opp_delete' };
	},

	toggleOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const active = form.get('is_active') === 'true';
		const { error } = await service.from('volunteer_opportunities').update({ is_active: active }).eq('id', id);
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

		if (!logId || !['verify', 'reject'].includes(action)) return fail(400, { error: 'Invalid action.' });

		const payload: any = {
			verification_status: action === 'verify' ? 'verified' : 'rejected',
			verifier_id: user.id,
			verified_at: new Date().toISOString()
		};
		if (action === 'reject' && rejectionReason) payload.rejection_reason = rejectionReason;

		const { error } = await service.from('volunteer_hour_logs').update(payload).eq('id', logId);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'verify' };
	},

	createAnnouncement: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const { data: season } = await service.from('lettering_seasons').select('id').eq('is_active', true).maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		const audience = String(form.get('audience') ?? 'all').trim();
		const isPinned = form.get('is_pinned') === 'on';
		const sendEmail = form.get('send_email') === 'on';

		if (!title) return fail(400, { error: 'Title is required.' });

		const { data: ann, error } = await service.from('announcements').insert({
			season_id: season.id, title, body, audience, is_pinned: isPinned, created_by: user.id
		}).select('id').single();
		if (error) return fail(400, { error: error.message });

		if (sendEmail && ann) {
			let emailFilter = service.from('profiles').select('email').eq('email', '').neq('email', '');
			if (audience === 'parents') {
				emailFilter = service.from('profiles').select('email').eq('is_parent_guardian', true);
			} else if (audience === 'students') {
				emailFilter = service.from('profiles').select('email').eq('is_parent_guardian', false).not('role', 'in', '("admin")');
			} else if (audience === 'mentors') {
				emailFilter = service.from('profiles').select('email').or('is_mentor.eq.true,role.eq.mentor');
			} else {
				emailFilter = service.from('profiles').select('email');
			}
			const { data: recipients } = await emailFilter;
			const emails = (recipients ?? []).map((r: any) => r.email).filter(Boolean);

			if (emails.length > 0) {
				const { data: orgSettings } = await service.from('organization_settings').select('org_name').limit(1).maybeSingle();
				const result = await sendAnnouncementEmail({
					title, body, recipients: emails, orgName: orgSettings?.org_name ?? 'Team'
				});
				await service.from('announcements').update({
					emailed_at: new Date().toISOString(),
					email_count: result.sent
				}).eq('id', ann.id);
			}
		}

		return { ok: true, section: 'announcement' };
	},

	deleteAnnouncement: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const id = String((await request.formData()).get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Announcement ID required.' });
		const { error } = await service.from('announcements').delete().eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'ann_delete' };
	},

	updateCategory: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !isAdmin(profile)) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const targetValue = Number(form.get('target_value') ?? 0);
		const isActive = form.get('is_active') === 'on';
		if (!id) return fail(400, { error: 'Category ID required.' });
		const { error } = await service.from('volunteer_categories').update({ target_value: targetValue, is_active: isActive }).eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'category' };
	}
};
