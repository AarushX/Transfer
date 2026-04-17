export const load = async ({ locals, cookies }) => {
	const { session, user, profile } = await locals.safeGetSession();
	return {
		session,
		user,
		profile,
		cookies: cookies.getAll()
	};
};
