import type { PageServerLoad } from './$types';
import { getMediaEventsSummary } from '$lib/server/google-drive';

export type MediaEvent = {
	id: string;
	name: string;
	photoCount: number;
	photoCountIsApprox: boolean;
	coverPhotoId: string | null;
	coverThumb: string | null;
};

// In-process cache for the whole event list. Drive is the slow link and the
// folder structure changes rarely; a short TTL avoids re-hammering it on
// every page hit.
type CachedEvents = { events: MediaEvent[]; expiresAt: number };
let eventsCache: CachedEvents | null = null;
const EVENTS_TTL_MS = 90 * 1000;

const computeEvents = async (): Promise<MediaEvent[]> => {
	return getMediaEventsSummary();
};

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Tell the edge to cache too — combined with the in-process cache this
	// makes warm requests effectively free.
	setHeaders({ 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
	try {
		const now = Date.now();
		if (!eventsCache || eventsCache.expiresAt <= now) {
			const events = await computeEvents();
			eventsCache = { events, expiresAt: now + EVENTS_TTL_MS };
		}
		return { events: eventsCache.events, error: null as string | null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load media folders.';
		return { events: [] as MediaEvent[], error: message };
	}
};
