import { json, type RequestHandler } from '@sveltejs/kit';
import { jwtVerify } from 'jose';

const encoder = new TextEncoder();

export const POST: RequestHandler = async ({ locals, request }) => {
	const { profile } = await locals.safeGetSession();
	if (!profile || !['mentor', 'admin'].includes(profile.role)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { token, machineId } = await request.json();
	if (machineId) {
		const { data: machine } = await locals.supabase
			.from('machines')
			.select('*')
			.eq('id', machineId)
			.single();
		return json({ machine });
	}

	try {
		const { payload } = await jwtVerify(
			token,
			encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me')
		);
		const userId = String(payload.user_id ?? '');
		const { data: profileData } = await locals.supabase
			.from('profiles')
			.select('id,email,full_name,role')
			.eq('id', userId)
			.single();
		const { data: certs } = await locals.supabase
			.from('certifications')
			.select('node_id,status,nodes!inner(title)')
			.eq('user_id', userId)
			.eq('status', 'completed');
		return json({ token, profile: profileData, certifications: certs ?? [] });
	} catch {
		return json({ error: 'Invalid QR token' }, { status: 400 });
	}
};
