import type { SupabaseClient } from '@supabase/supabase-js';

export type UpdateMemberAccessResult = { ok: true } | { status: number; error: string };

export async function updateMemberAccess(opts: {
	supabase: SupabaseClient;
	isAdminViewer: boolean;
	formData: FormData;
}): Promise<UpdateMemberAccessResult> {
	if (!opts.isAdminViewer) return { status: 403, error: 'Forbidden' };
	const userId = String(opts.formData.get('user_id') ?? '').trim();
	if (!userId) return { status: 400, error: 'Missing user_id' };

	const patch: Record<string, unknown> = {};
	if (opts.formData.has('base_role')) {
		patch.base_role = String(opts.formData.get('base_role'));
	}
	// Checkbox semantics: presence of 'is_mentor' / 'is_lead' as a NAMED form field means form sent
	// the field. FormData.has returns true even when the value is 'on'; 'is not sent at all' returns
	// false (unchecked). Treat 'on' = true, anything else = false.
	if (opts.formData.has('is_mentor')) {
		patch.is_mentor = opts.formData.get('is_mentor') === 'on';
	}
	if (opts.formData.has('is_lead')) {
		patch.is_lead = opts.formData.get('is_lead') === 'on';
	}
	if (opts.formData.has('lead_team_group_id')) {
		const v = String(opts.formData.get('lead_team_group_id') ?? '').trim();
		patch.lead_team_group_id = v || null;
	}
	if (opts.formData.has('lead_subteam_id')) {
		const v = String(opts.formData.get('lead_subteam_id') ?? '').trim();
		patch.lead_subteam_id = v || null;
	}

	const { error } = await opts.supabase.from('profiles').update(patch).eq('id', userId);
	if (error) return { status: 400, error: error.message };
	return { ok: true };
}
