type RoleLike = {
	role?: string | null;
	base_role?: string | null;
	is_mentor?: boolean | null;
	is_lead?: boolean | null;
	is_parent_guardian?: boolean | null;
};

export const isAdmin = (profile: RoleLike | null | undefined) =>
	!!profile && (profile.base_role === 'admin' || profile.role === 'admin');

export const isMentor = (profile: RoleLike | null | undefined) =>
	!!profile && (!!profile.is_mentor || profile.role === 'mentor');

export const isLead = (profile: RoleLike | null | undefined) =>
	!!profile && (!!profile.is_lead || profile.role === 'student_lead');

export const isParentGuardian = (profile: RoleLike | null | undefined) =>
	!!profile && !!profile.is_parent_guardian;

// Coarse, denormalized "is this user a lead anywhere" check (subteam or main team).
// is_lead is kept in sync by a DB trigger when subteam lead assignments change.
export const isSubteamLead = (profile: RoleLike | null | undefined) =>
	!!profile && (!!profile.is_lead || profile.role === 'student_lead');

// Who may reach the course studio: mentors, admins, and subteam leads.
// Subteam leads are further scoped to their own subteams server-side.
export const canManageCourses = (profile: RoleLike | null | undefined) =>
	isAdmin(profile) || isMentor(profile) || isSubteamLead(profile);

export const roleBadgeParts = (profile: RoleLike | null | undefined) => {
	if (!profile) return [];
	const base = profile.base_role === 'admin' ? 'admin' : 'member';
	const extras: string[] = [];
	if (isMentor(profile)) extras.push('mentor');
	if (isLead(profile)) extras.push('lead');
	if (isParentGuardian(profile)) extras.push('parent');
	return [base, ...extras];
};
