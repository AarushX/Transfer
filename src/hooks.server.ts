import { redirect, type Handle } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';
import { createSupabaseServerClient, createSupabaseServiceClient } from '$lib/server/supabase';
import { isAdmin, isMentor, isParentGuardian } from '$lib/roles';

const PUBLIC_ROUTES = new Set(['/', '/login', '/attendance']);
const TEAM_EMAIL_DOMAIN = (process.env.TEAM_EMAIL_DOMAIN ?? '').toLowerCase();
const serviceClient = createSupabaseServiceClient();

// The active onboarding-step list rarely changes but is read on nearly every
// authenticated request; cache the required ids briefly to avoid a per-request
// round-trip. The per-user completion check stays live below.
let cachedRequiredStepIds: string[] | null = null;
let requiredStepsExpiresAt = 0;
const REQUIRED_STEPS_TTL_MS = 60 * 1000;

async function getRequiredStepIds(client: App.Locals['supabase']): Promise<string[]> {
	if (cachedRequiredStepIds && Date.now() < requiredStepsExpiresAt) {
		return cachedRequiredStepIds;
	}
	const { data } = await client.from('onboarding_steps').select('id').eq('is_active', true);
	cachedRequiredStepIds = (data ?? []).map((s: any) => String(s.id));
	requiredStepsExpiresAt = Date.now() + REQUIRED_STEPS_TTL_MS;
	return cachedRequiredStepIds;
}

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

			const { data: profile } = await serviceClient
				.from('profiles')
				.select(
					'id,email,full_name,role,base_role,is_mentor,is_lead,is_parent_guardian,subteam_id,bio,avatar_url'
				)
				.eq('id', user.id)
				.single();

			const isParent = profile?.is_parent_guardian === true;
			if (
				TEAM_EMAIL_DOMAIN &&
				!isParent &&
				!user.email?.toLowerCase().endsWith(`@${TEAM_EMAIL_DOMAIN}`)
			) {
				await event.locals.supabase.auth.signOut();
				throw redirect(303, '/login?error=domain');
			}

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
	if (user && path === '/login') {
		throw redirect(303, '/dashboard');
	}

	// /mentor (exact) is reachable by non-mentors who hold course_veterans
	// grants — the page filters its queue accordingly. All other /mentor/*
	// subpaths (courses editor, machines, etc.) stay mentor-only.
	if (path.startsWith('/mentor/') && profile && !isMentor(profile)) {
		throw redirect(303, '/dashboard');
	}
	if (path.startsWith('/roster') && profile && !isMentor(profile)) {
		throw redirect(303, '/dashboard');
	}
	if (path.startsWith('/admin') && profile && !isAdmin(profile)) {
		throw redirect(303, '/dashboard');
	}

	// Block app navigation until onboarding is finished, but allow the
	// onboarding flow itself, the API endpoints it uses, and the attendance
	// kiosk. Admins can preview onboarding without being trapped in it.
	if (
		user &&
		profile &&
		!isParentGuardian(profile) &&
		!isAdmin(profile) &&
		!path.startsWith('/onboarding') &&
		!path.startsWith('/auth/') &&
		!path.startsWith('/api/') &&
		path !== '/login' &&
		path !== '/attendance'
	) {
		const required = await getRequiredStepIds(event.locals.supabase);
		if (required.length > 0) {
			const { data: doneSteps } = await event.locals.supabase
				.from('onboarding_progress')
				.select('step_id')
				.eq('user_id', user.id)
				.not('completed_at', 'is', null);
			const done = new Set((doneSteps ?? []).map((p: any) => String(p.step_id)));
			if (required.some((id) => !done.has(id))) {
				throw redirect(303, '/onboarding');
			}
		}
	}

	if (profile && isParentGuardian(profile)) {
		const parentBlockedPrefixes = [
			'/mentor',
			'/roster',
			'/admin',
			'/ranked',
			'/surveys',
			'/scan',
			'/onboarding',
			'/teams',
			'/machines',
			'/passport',
			'/profile',
			'/lettering',
			'/outreach'
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
