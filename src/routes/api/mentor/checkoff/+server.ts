import { json, type RequestHandler } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { isMentor, isAdmin } from '$lib/roles';
import { createNotification, type NotificationType } from '$lib/server/notifications';
import { createSupabaseServiceClient } from '$lib/server/supabase';

// Best-effort student notification for a checkoff outcome. Never throws —
// notification failure must not fail the review itself.
const notifyStudentOfOutcome = async (opts: {
	studentId: string;
	nodeId: string;
	type: NotificationType;
	withEmail: boolean;
}) => {
	try {
		const service = createSupabaseServiceClient();
		const [{ data: node }, { data: student }] = await Promise.all([
			service.from('nodes').select('title,slug').eq('id', opts.nodeId).maybeSingle(),
			service.from('profiles').select('email').eq('id', opts.studentId).maybeSingle()
		]);
		const nodeTitle = String(node?.title ?? 'a course');
		const href = node?.slug ? `/learn/${node.slug}` : '/coursework';
		const copy: Record<string, { title: string; body: string }> = {
			checkoff_approved: {
				title: `Checkoff approved — ${nodeTitle}`,
				body: 'A mentor approved your checkoff. Nice work!'
			},
			checkoff_needs_review: {
				title: `Checkoff needs another try — ${nodeTitle}`,
				body: 'A mentor reviewed your checkoff and asked for changes.'
			},
			checkoff_blocked: {
				title: `Checkoff blocked — ${nodeTitle}`,
				body: 'A mentor blocked this checkoff. Check the mentor notes.'
			},
			quiz_reset: {
				title: `Quiz reset — ${nodeTitle}`,
				body: 'A mentor reset your quiz so you can retake it.'
			}
		};
		const text = copy[opts.type] ?? { title: `Update — ${nodeTitle}`, body: '' };
		await createNotification({
			userId: opts.studentId,
			type: opts.type,
			title: text.title,
			body: text.body,
			href,
			email:
				opts.withEmail && student?.email
					? {
							to: String(student.email),
							subject: text.title,
							text: `${text.body}\n\nOpen it here: ${href}`
						}
					: undefined
		});
	} catch (err) {
		console.error('[checkoff] notify failed', err instanceof Error ? err.message : String(err));
	}
};

const encoder = new TextEncoder();
const extractJwtCandidate = (value: string) => {
	const trimmed = String(value ?? '').trim();
	const jwtMatch = trimmed.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
	return jwtMatch?.[0] ?? trimmed;
};

// Structured server-side log for checkoff failures. The shape stays the
// same for every failure so /mentor errors can be grep'd from logs.
const logCheckoffError = (
	stage: string,
	err: unknown,
	ctx: {
		action: string;
		userId: string;
		nodeId: string;
		blockId: string | null;
		reviewerId: string | null;
	}
) => {
	const message = err instanceof Error ? err.message : String(err);
	console.error('[checkoff]', stage, message, ctx);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	// Mentors and admins are always allowed; course veterans are checked
	// per-node below once we know which node this request targets.
	const isStaffApprover = isMentor(profile) || isAdmin(profile);

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Malformed request body' }, { status: 400 });
	}
	const { nodeId, userId, blockId, action, notes, checklist_results, qrToken, checkoffToken } =
		body;
	const normalizedAction = action === 'review' ? 'reset_quiz' : action;
	let resolvedNodeId = String(nodeId ?? '');
	let resolvedUserId = String(userId ?? '');
	let resolvedBlockId = blockId ? String(blockId) : null;

	if (checkoffToken) {
		try {
			const { payload } = await jwtVerify(
				extractJwtCandidate(checkoffToken),
				encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me')
			);
			if (String(payload.kind ?? '') !== 'checkoff_approve') {
				return json({ error: 'Invalid checkoff QR token.' }, { status: 400 });
			}
			resolvedNodeId = String(payload.node_id ?? '');
			resolvedUserId = String(payload.user_id ?? '');
			resolvedBlockId = payload.block_id ? String(payload.block_id) : null;
		} catch {
			return json({ error: 'Invalid or expired checkoff QR token.' }, { status: 400 });
		}
	}

	const ctx = {
		action: String(normalizedAction ?? ''),
		userId: resolvedUserId,
		nodeId: resolvedNodeId,
		blockId: resolvedBlockId,
		reviewerId: user.id
	};

	const upsertReview = async (status: 'approved' | 'needs_review' | 'blocked') => {
		const payload = {
			user_id: resolvedUserId,
			node_id: resolvedNodeId,
			block_id: resolvedBlockId,
			reviewer_id: user.id,
			status,
			mentor_notes: String(notes ?? ''),
			checklist_results: Array.isArray(checklist_results) ? checklist_results : []
		};
		const updateQuery = locals.supabase
			.from('checkoff_reviews')
			.update(payload)
			.eq('user_id', resolvedUserId)
			.eq('node_id', resolvedNodeId);
		const { data: updatedRows, error: updateErr } = resolvedBlockId
			? await updateQuery.eq('block_id', resolvedBlockId).select('id').limit(1)
			: await updateQuery.is('block_id', null).select('id').limit(1);
		if (updateErr) return updateErr;
		if (!updatedRows || updatedRows.length === 0) {
			const { error: insertErr } = await locals.supabase.from('checkoff_reviews').insert(payload);
			if (insertErr) return insertErr;
		}
		return null;
	};
	if (
		!resolvedNodeId ||
		!resolvedUserId ||
		!['approve', 'reset_quiz', 'retry_checkoff', 'block_checkoff'].includes(normalizedAction)
	) {
		return json({ error: 'Invalid request payload' }, { status: 400 });
	}

	if (!isStaffApprover) {
		// Per-course veteran fallback. RLS allows reading own row; if missing
		// we reject. Selecting limit(1) keeps this cheap.
		const { data: vetRow, error: vetErr } = await locals.supabase
			.from('course_veterans')
			.select('node_id')
			.eq('node_id', resolvedNodeId)
			.eq('user_id', user.id)
			.maybeSingle();
		if (vetErr) {
			logCheckoffError('check_veteran', vetErr, ctx);
			return json({ error: 'Could not verify approver permission.' }, { status: 500 });
		}
		if (!vetRow) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}
	}

	try {
		if (normalizedAction === 'approve') {
			const submissionQuery = locals.supabase
				.from('checkoff_submissions')
				.select('photo_data_url,photo_data_urls')
				.eq('node_id', resolvedNodeId)
				.eq('user_id', resolvedUserId);
			const [
				{ data: requirement, error: requirementErr },
				{ data: submission, error: submissionErr }
			] = await Promise.all([
				locals.supabase
					.from('node_checkoff_requirements')
					.select('evidence_mode,mentor_checklist')
					.eq('node_id', resolvedNodeId)
					.maybeSingle(),
				(resolvedBlockId
					? submissionQuery.eq('block_id', resolvedBlockId)
					: submissionQuery.is('block_id', null)
				).maybeSingle()
			]);
			if (requirementErr) {
				logCheckoffError('load_requirement', requirementErr, ctx);
				return json(
					{ error: 'Could not load checkoff requirements for this course.' },
					{ status: 500 }
				);
			}
			if (submissionErr) {
				logCheckoffError('load_submission', submissionErr, ctx);
				return json({ error: 'Could not load the student submission.' }, { status: 500 });
			}
			const hasPhoto = Boolean(
				submission?.photo_data_url ||
				(Array.isArray(submission?.photo_data_urls) && submission.photo_data_urls.length > 0)
			);
			if (!submission) {
				return json(
					{ error: 'Student must submit a checkoff record before approval.' },
					{ status: 400 }
				);
			}
			if (requirement?.evidence_mode === 'photo_required' && !hasPhoto) {
				return json(
					{ error: 'Photo evidence is required before this checkoff can be approved.' },
					{ status: 400 }
				);
			}
			const requiredChecklist = Array.isArray(requirement?.mentor_checklist)
				? requirement.mentor_checklist.map((v: unknown) => String(v))
				: [];
			if (requiredChecklist.length > 0) {
				const checklistRows = Array.isArray(checklist_results) ? checklist_results : [];
				const passedSet = new Set(
					checklistRows.filter((row: any) => row?.passed).map((row: any) => String(row?.item ?? ''))
				);
				const missing = requiredChecklist.filter((item) => !passedSet.has(item));
				if (missing.length > 0) {
					return json(
						{
							error: `Cannot approve until all mentor checklist items pass. Remaining: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`
						},
						{ status: 400 }
					);
				}
			}
		}

		// Subteam preference gate: only "pure" mentors (not admins) are scoped
		// to their selected subteams. Use the role helpers so modern mentors
		// created with is_mentor=true but no legacy role enum still get scoped.
		if (isMentor(profile) && !isAdmin(profile)) {
			if (!checkoffToken && qrToken) {
				try {
					const { payload } = await jwtVerify(
						String(qrToken),
						encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me')
					);
					if (String(payload.user_id ?? '') !== String(resolvedUserId)) {
						return json(
							{ error: 'Scanned passport does not match selected student.' },
							{ status: 400 }
						);
					}
				} catch {
					return json(
						{ error: 'Invalid or expired QR token. Rescan student passport.' },
						{ status: 400 }
					);
				}
			}

			const [{ data: node, error: nodeErr }, { data: prefs, error: prefsErr }] = await Promise.all([
				locals.supabase.from('nodes').select('subteam_id').eq('id', resolvedNodeId).maybeSingle(),
				locals.supabase
					.from('mentor_subteam_preferences')
					.select('subteam_id')
					.eq('mentor_id', user.id)
			]);
			if (nodeErr) {
				logCheckoffError('load_node', nodeErr, ctx);
				return json({ error: 'Could not look up the course.' }, { status: 500 });
			}
			if (prefsErr) {
				logCheckoffError('load_mentor_prefs', prefsErr, ctx);
				return json({ error: 'Could not look up your mentor team preferences.' }, { status: 500 });
			}
			const prefIds = (prefs ?? []).map((row: { subteam_id: string }) => row.subteam_id);
			if (prefIds.length > 0 && node?.subteam_id && !prefIds.includes(node.subteam_id)) {
				return json(
					{ error: 'This checkoff is outside your selected mentor teams.' },
					{ status: 403 }
				);
			}
		}

		if (normalizedAction === 'reset_quiz') {
			const { error } = await locals.supabase.rpc('transition_certification', {
				p_node_id: resolvedNodeId,
				p_new_status: 'quiz_pending',
				p_target_user_id: resolvedUserId,
				p_mentor_notes: notes ?? null
			});
			if (error) {
				logCheckoffError('rpc_transition_reset_quiz', error, ctx);
				return json({ error: error.message }, { status: 400 });
			}
		}

		if (normalizedAction === 'approve') {
			const { data: checkoffBlock, error: blockErr } = await locals.supabase
				.from('node_blocks')
				.select('id')
				.eq('id', resolvedBlockId ?? '')
				.eq('node_id', resolvedNodeId)
				.eq('type', 'checkoff')
				.maybeSingle();
			if (blockErr) {
				logCheckoffError('load_checkoff_block', blockErr, ctx);
				return json({ error: 'Could not load the checkoff block.' }, { status: 500 });
			}

			if (checkoffBlock?.id) {
				const { error: progressErr } = await locals.supabase
					.from('user_node_block_progress')
					.upsert(
						{
							user_id: resolvedUserId,
							node_id: resolvedNodeId,
							block_id: checkoffBlock.id,
							completed_at: new Date().toISOString()
						},
						{ onConflict: 'user_id,block_id' }
					);
				if (progressErr) {
					logCheckoffError('upsert_block_progress', progressErr, ctx);
					return json({ error: progressErr.message }, { status: 400 });
				}
			}

			const reviewErr = await upsertReview('approved');
			if (reviewErr) {
				logCheckoffError('upsert_review', reviewErr, ctx);
				return json({ error: reviewErr.message }, { status: 400 });
			}

			if (checkoffBlock?.id) {
				const { data: autoCert, error: autoErr } = await locals.supabase.rpc(
					'try_auto_complete_node',
					{
						p_node_id: resolvedNodeId,
						p_target_user_id: resolvedUserId
					}
				);
				if (autoErr) {
					logCheckoffError('rpc_try_auto_complete', autoErr, ctx);
					return json({ error: autoErr.message }, { status: 400 });
				}
				// Keep progress moving for partially-finished block courses,
				// but do not overwrite a freshly completed certification.
				if (autoCert?.status !== 'completed') {
					const { error: tcErr } = await locals.supabase.rpc('transition_certification', {
						p_node_id: resolvedNodeId,
						p_new_status: 'quiz_pending',
						p_target_user_id: resolvedUserId,
						p_mentor_notes: notes ?? null
					});
					if (tcErr) {
						logCheckoffError('rpc_transition_partial_complete', tcErr, ctx);
						// Non-fatal — the review is already approved, the student
						// can keep working. Surface the issue but return ok.
					}
				}
			} else {
				const { error } = await locals.supabase.rpc('transition_certification', {
					p_node_id: resolvedNodeId,
					p_new_status: 'completed',
					p_target_user_id: resolvedUserId,
					p_mentor_notes: notes ?? null
				});
				if (error) {
					logCheckoffError('rpc_transition_complete', error, ctx);
					return json({ error: error.message }, { status: 400 });
				}
			}
			await notifyStudentOfOutcome({
				studentId: resolvedUserId,
				nodeId: resolvedNodeId,
				type: 'checkoff_approved',
				withEmail: true
			});
			return json({ ok: true, nodeId: resolvedNodeId, userId: resolvedUserId });
		}

		if (normalizedAction === 'retry_checkoff') {
			const reviewErr = await upsertReview('needs_review');
			if (reviewErr) {
				logCheckoffError('upsert_review_retry', reviewErr, ctx);
				return json({ error: reviewErr.message }, { status: 400 });
			}
			await notifyStudentOfOutcome({
				studentId: resolvedUserId,
				nodeId: resolvedNodeId,
				type: 'checkoff_needs_review',
				withEmail: true
			});
			return json({ ok: true, status: 'needs_review' });
		}

		const reviewErr = await upsertReview(
			normalizedAction === 'block_checkoff' ? 'blocked' : 'needs_review'
		);
		if (reviewErr) {
			logCheckoffError('upsert_review_block', reviewErr, ctx);
			return json({ error: reviewErr.message }, { status: 400 });
		}

		await notifyStudentOfOutcome({
			studentId: resolvedUserId,
			nodeId: resolvedNodeId,
			type: normalizedAction === 'block_checkoff' ? 'checkoff_blocked' : 'quiz_reset',
			withEmail: normalizedAction === 'block_checkoff'
		});
		return json({ ok: true });
	} catch (err) {
		logCheckoffError('unhandled', err, ctx);
		return json(
			{ error: 'Internal error processing checkoff. The team has been notified.' },
			{ status: 500 }
		);
	}
};
