import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isAdmin, isMentor, canManageCourses } from '$lib/roles';

export type CourseScope = {
	/** Whether the actor may reach the course studio at all. */
	canManage: boolean;
	/** Mentor or admin: full catalog, full edit, RLS-bound client is fine. */
	isFull: boolean;
	/** Subteam ids this user leads (empty for mentors/admins — they aren't scoped). */
	ledTeamIds: string[];
};

/**
 * Resolves a user's course-management scope. Mentors and admins get the full
 * catalog (`isFull`); subteam leads are limited to the subteams they lead.
 */
export async function resolveCourseScope(
	supabase: SupabaseClient,
	user: User | null,
	profile: {
		role?: string | null;
		base_role?: string | null;
		is_mentor?: boolean | null;
		is_lead?: boolean | null;
	} | null
): Promise<CourseScope> {
	if (!user || !profile || !canManageCourses(profile)) {
		return { canManage: false, isFull: false, ledTeamIds: [] };
	}
	const isFull = isAdmin(profile) || isMentor(profile);
	if (isFull) {
		return { canManage: true, isFull: true, ledTeamIds: [] };
	}
	const { data } = await supabase.from('teams').select('id').eq('lead_user_id', user.id);
	const ledTeamIds = (data ?? []).map((r: { id: string }) => String(r.id));
	return { canManage: ledTeamIds.length > 0, isFull: false, ledTeamIds };
}
