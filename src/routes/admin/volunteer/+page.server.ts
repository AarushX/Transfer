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
		{ data: commitments },
		{ data: allSignups },
		{ data: announcements }
	] = await Promise.all([
		service.from('volunteer_categories').select('*').eq('is_active', true).order('sort_order'),
		service.from('volunteer_events').select('*').eq('season_id', season.id).order('start_date', { ascending: false }),
		service.from('volunteer_opportunities').select('*,category:volunteer_categories(name,slug),event:volunteer_events(title),creator:profiles!volunteer_opportunities_created_by_fkey(full_name,email)').eq('season_id', season.id).order('event_date', { ascending: false }),
		service.from('families').select('id,name,family_members(user_id,role,profile:profiles(full_name,email))').eq('season_id', season.id),
		service.from('volunteer_commitments').select('*,family:families(id,name),category:volunteer_categories(name,slug)').eq('season_id', season.id),
		service.from('volunteer_signups').select('*,family:families(id,name),opportunity:volunteer_opportunities(*,category:volunteer_categories(name,slug,unit)),signer:profiles!volunteer_signups_user_id_fkey(full_name,email)').neq('status', 'cancelled'),
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

	// Calculate signup progress per family per category
	const familyCategoryProgress: Record<string, Record<string, number>> = {};
	for (const s of allSignups ?? []) {
		if (s.status !== 'verified') continue; // only verified signups count
		const opp = (s as any).opportunity;
		if (!opp) continue;
		const catId = opp.category_id;
		const cat = catMap.get(catId);
		if (!cat) continue;

		if (!familyCategoryProgress[s.family_id]) {
			familyCategoryProgress[s.family_id] = {};
		}
		if (!familyCategoryProgress[s.family_id][catId]) {
			familyCategoryProgress[s.family_id][catId] = 0;
		}

		if (cat.unit === 'hours') {
			let duration = 4; // standard default
			if (opp.start_time && opp.end_time) {
				const [sh, sm] = opp.start_time.split(':').map(Number);
				const [eh, em] = opp.end_time.split(':').map(Number);
				const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
				if (diff > 0) duration = diff;
			}
			familyCategoryProgress[s.family_id][catId] += duration;
		} else {
			familyCategoryProgress[s.family_id][catId] += 1;
		}
	}

	// Tally fulfilled pledged categories for each family
	for (const [familyId, entry] of familyProgress.entries()) {
		const familyPledges = (commitments ?? []).filter((c: any) => c.family_id === familyId && c.response === 'yes');
		for (const pledge of familyPledges) {
			const cat = catMap.get(pledge.category_id);
			if (!cat) continue;
			const currentProgress = familyCategoryProgress[familyId]?.[pledge.category_id] ?? 0;
			if (currentProgress >= Number(cat.target_value)) {
				entry.verified++;
			}
		}
	}

	// Construct pendingVerifications from signups requiring action
	const pendingVerifications: any[] = [];
	for (const s of allSignups ?? []) {
		const opp = (s as any).opportunity;
		if (!opp) continue;

		if (s.status === 'pending') {
			pendingVerifications.push({
				id: s.id,
				family_id: s.family_id,
				family: s.family,
				category_id: opp.category_id,
				category: opp.category,
				reporter: s.signer,
				amount: opp.category?.unit === 'hours' && opp.start_time && opp.end_time ? 
					Math.round(((opp.end_time.split(':').map(Number)[0] * 60 + opp.end_time.split(':').map(Number)[1] - (opp.start_time.split(':').map(Number)[0] * 60 + opp.start_time.split(':').map(Number)[1])) / 60) * 10) / 10 : 1,
				activity_date: opp.event_date,
				description: `Slot signup for "${opp.title}" (Needs Approval)`,
				verification_status: 'pending',
				is_approval_needed: true
			});
		} else if (s.status === 'confirmed') {
			const eventDate = new Date(opp.event_date + 'T23:59:59');
			if (eventDate < new Date()) {
				pendingVerifications.push({
					id: s.id,
					family_id: s.family_id,
					family: s.family,
					category_id: opp.category_id,
					category: opp.category,
					reporter: s.signer,
					amount: opp.category?.unit === 'hours' && opp.start_time && opp.end_time ? 
						Math.round(((opp.end_time.split(':').map(Number)[0] * 60 + opp.end_time.split(':').map(Number)[1] - (opp.start_time.split(':').map(Number)[0] * 60 + opp.start_time.split(':').map(Number)[1])) / 60) * 10) / 10 : 1,
					activity_date: opp.event_date,
					description: `Attendance verification for "${opp.title}"`,
					verification_status: 'pending',
					is_attendance_checkoff: true
				});
			}
		}
	}

	return {
		season,
		categories: categories ?? [],
		events: events ?? [],
		opportunities: (opportunities ?? []).map((o: any) => ({ ...o, currentSignups: signupCountByOpp.get(o.id) ?? 0 })),
		families: families ?? [],
		pendingVerifications,
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
		const categoryIds = form.getAll('category_ids').map(String).filter(Boolean);

		if (!title || !startDate) return fail(400, { error: 'Title and start date are required.' });

		const { data: event, error } = await service.from('volunteer_events').insert({
			season_id: season.id, title, description, location, start_date: startDate, end_date: endDate, created_by: user.id
		}).select('id').single();
		if (error || !event) return fail(400, { error: error?.message ?? 'Failed to create event.' });

		if (categoryIds.length > 0) {
			const { data: cats } = await service.from('volunteer_categories').select('id,name').in('id', categoryIds);
			for (const cat of cats ?? []) {
				const slots = Math.max(1, Number(form.get(`slots_${cat.id}`) ?? 4));
				await service.from('volunteer_opportunities').insert({
					event_id: event.id,
					category_id: cat.id,
					season_id: season.id,
					title: cat.name,
					description: '',
					location: location,
					event_date: startDate,
					slots,
					created_by: user.id
				});
			}
		}
		return { ok: true, section: 'event' };
	},

	updateEvent: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const { data: season } = await service.from('lettering_seasons').select('id').eq('is_active', true).maybeSingle();
		if (!season) return fail(400, { error: 'No active season.' });

		const id = String(form.get('id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const startDate = String(form.get('start_date') ?? '').trim();
		const endDate = String(form.get('end_date') ?? '').trim() || null;
		const categoryIds = new Set(form.getAll('category_ids').map(String).filter(Boolean));

		if (!id || !title || !startDate) return fail(400, { error: 'ID, title, and start date are required.' });

		const { error } = await service.from('volunteer_events').update({
			title, description, location, start_date: startDate, end_date: endDate, updated_at: new Date().toISOString()
		}).eq('id', id);
		if (error) return fail(400, { error: error.message });

		const { data: existingOpps } = await service
			.from('volunteer_opportunities')
			.select('id,category_id,is_active')
			.eq('event_id', id);

		const existingByCategory = new Map<string, { id: string; is_active: boolean }>();
		for (const opp of existingOpps ?? []) {
			existingByCategory.set(opp.category_id, { id: opp.id, is_active: opp.is_active });
		}

		for (const categoryId of categoryIds) {
			const existing = existingByCategory.get(categoryId);
			const slots = Math.max(1, Number(form.get(`slots_${categoryId}`) ?? 4));
			if (existing) {
				if (!existing.is_active) {
					await service.from('volunteer_opportunities').update({ is_active: true }).eq('id', existing.id);
				}
			} else {
				const { data: cat } = await service.from('volunteer_categories').select('name').eq('id', categoryId).maybeSingle();
				await service.from('volunteer_opportunities').insert({
					event_id: id,
					category_id: categoryId,
					season_id: season.id,
					title: cat?.name ?? 'Volunteer Need',
					description: '',
					location: location,
					event_date: startDate,
					slots,
					created_by: user.id
				});
			}
		}

		for (const [catId, existing] of existingByCategory) {
			if (!categoryIds.has(catId) && existing.is_active) {
				await service.from('volunteer_opportunities').update({ is_active: false }).eq('id', existing.id);
			}
		}

		return { ok: true, section: 'event_update' };
	},

	updateOpportunity: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'Opportunity ID required.' });

		const updates: any = { updated_at: new Date().toISOString() };
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const location = String(form.get('location') ?? '').trim();
		const eventDate = String(form.get('event_date') ?? '').trim();
		const startTime = String(form.get('start_time') ?? '').trim() || null;
		const endTime = String(form.get('end_time') ?? '').trim() || null;
		const slots = Number(form.get('slots') ?? 0);
		const signupDeadline = String(form.get('signup_deadline') ?? '').trim() || null;

		if (title) updates.title = title;
		updates.description = description;
		updates.location = location;
		if (eventDate) updates.event_date = eventDate;
		updates.start_time = startTime;
		updates.end_time = endTime;
		if (slots > 0) updates.slots = slots;
		updates.signup_deadline = signupDeadline;

		const { error } = await service.from('volunteer_opportunities').update(updates).eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'opp_update' };
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
		const logId = String(form.get('log_id') ?? form.get('signup_id') ?? '').trim();
		const action = String(form.get('action') ?? '').trim();
		const rejectionReason = String(form.get('rejection_reason') ?? '').trim();

		if (!logId || !['verify', 'reject', 'approve'].includes(action)) return fail(400, { error: 'Invalid action.' });

		let status = 'verified';
		if (action === 'approve') status = 'confirmed';
		if (action === 'reject') status = 'cancelled';

		const payload: any = {
			status,
			updated_at: new Date().toISOString()
		};
		if (status === 'confirmed') {
			payload.confirmed_at = new Date().toISOString();
		}
		if (status === 'verified') {
			payload.completed_at = new Date().toISOString();
		}
		if (action === 'reject' && rejectionReason) {
			payload.notes = rejectionReason;
		}

		const { error } = await service.from('volunteer_signups').update(payload).eq('id', logId);
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

	updateAnnouncement: async ({ locals, request }) => {
		const { user, profile } = await locals.safeGetSession();
		if (!user || !profile || !(isAdmin(profile) || isMentor(profile))) return fail(403, { error: 'Forbidden' });
		const service = createSupabaseServiceClient();
		const form = await request.formData();

		const id = String(form.get('id') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		const audience = String(form.get('audience') ?? 'all').trim();
		const isPinned = form.get('is_pinned') === 'on';

		if (!id || !title) return fail(400, { error: 'ID and title required.' });

		const { error } = await service.from('announcements').update({
			title, body, audience, is_pinned: isPinned, updated_at: new Date().toISOString()
		}).eq('id', id);
		if (error) return fail(400, { error: error.message });
		return { ok: true, section: 'ann_update' };
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
