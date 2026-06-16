import { createSupabaseServiceClient } from '$lib/server/supabase';
import { isEmailConfigured, sendEmail } from '$lib/server/email';
import { resolveMentorRecipients } from '$lib/notifications-recipients';

export type NotificationType =
	| 'checkoff_approved'
	| 'checkoff_needs_review'
	| 'checkoff_blocked'
	| 'quiz_reset'
	| 'mentor_queue_request';

type CreateNotificationOpts = {
	userId: string;
	type: NotificationType;
	title: string;
	body?: string;
	href?: string;
	email?: { to: string; subject: string; text: string };
};

/**
 * Insert an in-app notification (service client — there is deliberately no
 * RLS insert policy) and optionally fire an email. Email is fire-and-forget:
 * notification delivery must never block or fail the triggering request.
 */
export const createNotification = async (opts: CreateNotificationOpts): Promise<void> => {
	const service = createSupabaseServiceClient();
	const { error } = await service.from('notifications').insert({
		user_id: opts.userId,
		type: opts.type,
		title: opts.title,
		body: opts.body ?? null,
		href: opts.href ?? null
	});
	if (error) {
		console.error('[notifications] insert failed', error.message, { type: opts.type });
	}
	if (opts.email && isEmailConfigured()) {
		void sendEmail({
			to: opts.email.to,
			subject: opts.email.subject,
			text: opts.email.text
		}).then((res) => {
			if (!res.ok) console.error('[notifications] email failed', res.error);
		});
	}
};

/**
 * Notify every mentor whose subteam preferences cover the given node that a
 * student requested a checkoff. In-app only — fanning out an email per
 * request would burn through the Gmail SMTP daily cap; the bell badge and
 * mentor queue are the canonical surface.
 */
export const notifyMentorsForNode = async (
	nodeId: string,
	payload: { title: string; body?: string; href?: string }
): Promise<void> => {
	const service = createSupabaseServiceClient();
	const [nodeResp, mentorsResp, prefsResp] = await Promise.all([
		service.from('nodes').select('subteam_id').eq('id', nodeId).maybeSingle(),
		// Match isMentor() in roles.ts: modern is_mentor flag or legacy role enum.
		service.from('profiles').select('id').or('is_mentor.eq.true,role.eq.mentor'),
		service.from('mentor_subteam_preferences').select('mentor_id,subteam_id')
	]);
	if (mentorsResp.error) {
		console.error('[notifications] mentor lookup failed', mentorsResp.error.message);
		return;
	}
	const recipients = resolveMentorRecipients(
		(mentorsResp.data ?? []).map((row) => ({ id: String(row.id) })),
		(prefsResp.data ?? []).map((row) => ({
			mentor_id: String(row.mentor_id),
			subteam_id: String(row.subteam_id)
		})),
		nodeResp.data?.subteam_id ? String(nodeResp.data.subteam_id) : null
	);
	if (recipients.length === 0) return;
	const rows = recipients.map((userId) => ({
		user_id: userId,
		type: 'mentor_queue_request',
		title: payload.title,
		body: payload.body ?? null,
		href: payload.href ?? null
	}));
	const { error } = await service.from('notifications').insert(rows);
	if (error) {
		console.error('[notifications] mentor fan-out insert failed', error.message);
	}
};
