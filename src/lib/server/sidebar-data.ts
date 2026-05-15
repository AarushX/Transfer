import type { SupabaseClient } from '@supabase/supabase-js';
import { isMentor } from '$lib/roles';

/**
 * Returns the number of certifications awaiting mentor checkoff.
 * The mentor queue is driven by `certifications.status = 'mentor_checkoff_pending'`.
 * Returns 0 immediately for non-mentors (no DB call made).
 */
export async function computeMentorQueueCount(
	supabase: SupabaseClient,
	profile: { is_mentor?: boolean; role?: string | null; base_role?: string | null } | null
): Promise<number> {
	if (!profile || !isMentor(profile)) return 0;
	const { count, error } = await supabase
		.from('certifications')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'mentor_checkoff_pending');
	if (error) return 0;
	return count ?? 0;
}
