import QRCode from 'qrcode';
import { SignJWT } from 'jose';
import type { PageServerLoad } from './$types';

const encoder = new TextEncoder();

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) return { qrDataUrl: '', badges: [], tier: 'Unranked', profile: null };

	const { data: completedRows } = await locals.supabase
		.from('certifications')
		.select('node_id,nodes!inner(title,tier,subteam_id)')
		.eq('user_id', user.id)
		.eq('status', 'completed');

	const completed = completedRows ?? [];
	const badges = completed.map((row: any) => row.nodes?.title).filter(Boolean);
	const maxTier = completed.reduce(
		(max: number, row: any) => Math.max(max, row.nodes?.tier ?? 0),
		0
	);
	const tier = maxTier > 0 ? `Level ${maxTier} Machinist` : 'Level 0';

	const secret = encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me');
	const token = await new SignJWT({ user_id: user.id })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('10m')
		.sign(secret);
	const qrDataUrl = await QRCode.toDataURL(token);

	return { qrDataUrl, badges, tier, profile };
};
