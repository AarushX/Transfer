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
// every page hit. We use a Stale-While-Revalidate (SWR) pattern to serve
// cached data instantly (0ms) and refresh in the background.
type CachedEvents = { events: MediaEvent[]; expiresAt: number };
let eventsCache: CachedEvents | null = null;
const EVENTS_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
let isRefreshing = false;

const computeEvents = async (): Promise<MediaEvent[]> => {
	return getMediaEventsSummary();
};

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Tell the edge to cache too — combined with the in-process cache this
	// makes warm requests effectively free.
	setHeaders({ 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
	try {
		const now = Date.now();
		if (!eventsCache) {
			// First load: block to fetch and populate the cache.
			const events = await computeEvents();
			eventsCache = { events, expiresAt: now + EVENTS_TTL_MS };
		} else if (eventsCache.expiresAt <= now && !isRefreshing) {
			// Cache expired: serve stale data instantly and trigger background refresh!
			isRefreshing = true;
			computeEvents()
				.then((events) => {
					eventsCache = { events, expiresAt: Date.now() + EVENTS_TTL_MS };
				})
				.catch((err) => {
					console.error('Background events cache refresh failed:', err);
				})
				.finally(() => {
					isRefreshing = false;
				});
		}
		return { events: eventsCache.events, error: null as string | null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load media folders.';
		return { events: [] as MediaEvent[], error: message };
	}
};
