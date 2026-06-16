// Pure recipient-resolution logic for mentor-queue notifications, kept
// DB-free so it can be unit tested. Mirrors the gate in
// /api/mentor/checkoff: mentors with no subteam preferences receive
// everything; mentors with preferences only receive nodes in them.

export type MentorRecipient = { id: string };
export type MentorPref = { mentor_id: string; subteam_id: string };

export const resolveMentorRecipients = (
	mentors: MentorRecipient[],
	prefs: MentorPref[],
	nodeSubteamId: string | null
): string[] => {
	const prefsByMentor = new Map<string, Set<string>>();
	for (const pref of prefs) {
		const set = prefsByMentor.get(pref.mentor_id) ?? new Set<string>();
		set.add(pref.subteam_id);
		prefsByMentor.set(pref.mentor_id, set);
	}
	return mentors
		.filter((mentor) => {
			const set = prefsByMentor.get(mentor.id);
			if (!set || set.size === 0) return true;
			if (!nodeSubteamId) return true;
			return set.has(nodeSubteamId);
		})
		.map((mentor) => mentor.id);
};
