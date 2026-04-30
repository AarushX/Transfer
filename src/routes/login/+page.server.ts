import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const error = url.searchParams.get('error');
	const success = url.searchParams.get('success');
	return {
		error:
			error === 'domain'
				? 'Please sign in with your team email domain.'
				: error === 'missing_credentials'
					? 'Email and password are required.'
					: error === 'parent_only'
						? 'Email/password login is only for parent/guardian accounts.'
					: error,
		success:
			success === 'parent_signup'
				? 'Parent account created. If email confirmation is enabled, verify your email, then log in.'
				: null
	};
};
