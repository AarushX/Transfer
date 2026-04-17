import QRCode from 'qrcode';
import { SignJWT } from 'jose';
import type { PageServerLoad } from './$types';

const encoder = new TextEncoder();

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) return { qrDataUrl: '', badges: [], progressSummary: 'No certifications yet', profile: null };

	const { data: completedRows } = await locals.supabase
		.from('certifications')
		.select('node_id,nodes!inner(title,subteam_id)')
		.eq('user_id', user.id)
		.eq('status', 'completed');

	const completed = completedRows ?? [];
	const badges = completed.map((row: any) => row.nodes?.title).filter(Boolean);
	const progressSummary = `${completed.length} module${completed.length === 1 ? '' : 's'} completed`;

	const secret = encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me');
	const token = await new SignJWT({ user_id: user.id })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('10m')
		.sign(secret);
	const qrDataUrl = await QRCode.toDataURL(token);

	return { qrDataUrl, badges, progressSummary, profile };
};
