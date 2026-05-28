import type { PageServerLoad } from './$types';

const errorMessages: Record<string, string> = {
	domain: 'Please sign in with your team email domain.',
	missing_credentials: 'Email and password are required.',
	parent_only: 'Email/password login is only for parent/guardian accounts.',
	debug_empty: 'Paste an exported session blob first.',
	debug_decode: 'That session blob is not valid base64 JSON.',
	debug_shape: 'Session blob is not in the expected format.',
	debug_invalid: 'No valid Supabase session cookies found in that blob.'
};

function friendlyError(raw: string): string {
	if (errorMessages[raw]) return errorMessages[raw];
	if (raw.toLowerCase().includes('invalid login credentials')) return 'Invalid email or password.';
	if (raw.toLowerCase().includes('user already registered'))
		return 'An account with this email already exists. Try logging in instead.';
	if (raw.toLowerCase().includes('is invalid')) return 'Please enter a valid email address.';
	if (raw.toLowerCase().includes('password') && raw.toLowerCase().includes('characters'))
		return 'Password must be at least 6 characters.';
	return raw;
}

export const load: PageServerLoad = async ({ url }) => {
	const error = url.searchParams.get('error');
	const success = url.searchParams.get('success');
	return {
		error: error ? friendlyError(error) : null,
		success: null
	};
};
