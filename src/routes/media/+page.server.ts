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
// Promise lock — concurrent requests during a refresh share the same in-flight
// promise instead of triggering parallel Drive calls.
let inflightRefresh: Promise<MediaEvent[]> | null = null;

const computeEvents = async (): Promise<MediaEvent[]> => {
	return getMediaEventsSummary();
};

const startBackgroundRefresh = () => {
	if (inflightRefresh) return inflightRefresh;
	inflightRefresh = computeEvents()
		.then((events) => {
			eventsCache = { events, expiresAt: Date.now() + EVENTS_TTL_MS };
			return events;
		})
		.catch((err) => {
			console.error('Background events cache refresh failed:', err);
			throw err;
		})
		.finally(() => {
			inflightRefresh = null;
		});
	return inflightRefresh;
};

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Tell the edge to cache too — combined with the in-process cache this
	// makes warm requests effectively free.
	setHeaders({ 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
	try {
		const now = Date.now();
		if (!eventsCache) {
			// First load: block on the shared refresh promise so concurrent
			// first-loads don't each kick off their own Drive call.
			await startBackgroundRefresh();
		} else if (eventsCache.expiresAt <= now) {
			// Cache expired: kick off a background refresh (no await) and serve
			// stale data instantly. If one is already in-flight, this is a no-op.
			void startBackgroundRefresh();
		}
		return { events: eventsCache?.events ?? [], error: null as string | null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load media folders.';
		return { events: [] as MediaEvent[], error: message };
	}
};
