import QRCode from 'qrcode';
import { SignJWT } from 'jose';
import type { PageServerLoad } from './$types';

const encoder = new TextEncoder();

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) return { qrDataUrl: '', badges: [], progressSummary: 'No certifications yet', profile: null };

	const [{ data: completedRows }, { data: subteams }] = await Promise.all([
		locals.supabase
			.from('certifications')
			.select('node_id,nodes!inner(title,subteam_id)')
			.eq('user_id', user.id)
			.eq('status', 'completed'),
		locals.supabase.from('subteams').select('id,name')
	]);

	const completed = completedRows ?? [];
	const badges = completed.map((row: any) => row.nodes?.title).filter(Boolean);
	const progressSummary = `${completed.length} module${completed.length === 1 ? '' : 's'} completed`;
	const subteamNameById = new Map((subteams ?? []).map((s: any) => [String(s.id), String(s.name)]));
	const perTrack = new Map<string, number>();
	for (const row of completed) {
		const trackId = String(row?.nodes?.subteam_id ?? '');
		if (!trackId) continue;
		perTrack.set(trackId, (perTrack.get(trackId) ?? 0) + 1);
	}
	const trackRanks = Array.from(perTrack.entries())
		.map(([trackId, count]) => ({
			trackId,
			trackName: subteamNameById.get(trackId) ?? 'Unknown track',
			count,
			tier: count >= 5 ? 'Expert' : count >= 3 ? 'Skilled' : 'Novice'
		}))
		.sort((a, b) => b.count - a.count || a.trackName.localeCompare(b.trackName));

	const overallRank =
		completed.length >= 12
			? 'Master'
			: completed.length >= 8
				? 'Specialist'
				: completed.length >= 4
					? 'Builder'
					: completed.length >= 1
						? 'Apprentice'
						: 'Rookie';
	const masteredTracks = trackRanks.filter((t) => t.tier === 'Expert').length;
	const specialTitles = [
		...(masteredTracks >= 2 ? ['Cross-Track Ace'] : []),
		...(masteredTracks >= 3 ? ['Multi-Track Legend'] : [])
	];

	const secret = encoder.encode(process.env.PASSPORT_QR_SECRET ?? 'dev-secret-change-me');
	const token = await new SignJWT({ user_id: user.id })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('10m')
		.sign(secret);
	const qrDataUrl = await QRCode.toDataURL(token);

	return { qrDataUrl, badges, progressSummary, profile, overallRank, trackRanks, specialTitles };
};
