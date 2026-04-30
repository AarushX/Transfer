import { redirect, type Handle } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { isAdmin, isMentor, isParentGuardian } from '$lib/roles';

const PUBLIC_ROUTES = new Set(['/', '/login', '/attendance']);
const TEAM_EMAIL_DOMAIN = (process.env.TEAM_EMAIL_DOMAIN ?? '').toLowerCase();

type ProfileRow = NonNullable<Awaited<ReturnType<App.Locals['safeGetSession']>>['profile']>;

type SafeSessionResult = {
	session: Session | null;
	user: User | null;
	profile: ProfileRow | null;
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies);
	let cachedSessionResult: Promise<SafeSessionResult> | undefined;

	event.locals.safeGetSession = async () => {
		if (cachedSessionResult) return cachedSessionResult;
		cachedSessionResult = (async (): Promise<SafeSessionResult> => {
			const {
				data: { user },
				error: userError
			} = await event.locals.supabase.auth.getUser();
			if (userError || !user) return { session: null, user: null, profile: null };

			if (TEAM_EMAIL_DOMAIN && !user.email?.toLowerCase().endsWith(`@${TEAM_EMAIL_DOMAIN}`)) {
				await event.locals.supabase.auth.signOut();
				throw redirect(303, '/login?error=domain');
			}

			const { data: profile } = await event.locals.supabase
				.from('profiles')
				.select('id,email,full_name,role,base_role,is_mentor,is_lead,is_parent_guardian,subteam_id,bio,avatar_url')
				.eq('id', user.id)
				.single();

			return { session: null, user, profile: (profile ?? null) as ProfileRow | null };
		})();
		return cachedSessionResult;
	};

	const { user, profile } = await event.locals.safeGetSession();
	const path = event.url.pathname;
	const isPublicPath =
		PUBLIC_ROUTES.has(path) ||
		path.startsWith('/auth/') ||
		path.startsWith('/api/attendance/public/');

	if (!user && !isPublicPath) throw redirect(303, '/login');
	if (user && path === '/login') throw redirect(303, '/dashboard');

	if (path.startsWith('/mentor') && profile && !isMentor(profile)) {
		throw redirect(303, '/dashboard');
	}
	if (path.startsWith('/roster') && profile && !isMentor(profile)) {
		throw redirect(303, '/dashboard');
	}
	if (path.startsWith('/admin') && profile && !isAdmin(profile)) {
		throw redirect(303, '/dashboard');
	}

	if (profile && isParentGuardian(profile)) {
		const parentBlockedPrefixes = [
			'/mentor',
			'/roster',
			'/admin',
			'/ranked',
			'/calendar',
			'/surveys',
			'/scan',
			'/onboarding',
			'/teams',
			'/machines',
			'/passport',
			'/profile',
			'/parent'
		];
		if (parentBlockedPrefixes.some((prefix) => path.startsWith(prefix))) {
			throw redirect(303, '/dashboard');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
