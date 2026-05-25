import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	buildFolderViewUrl,
	buildProxyThumbnailUrl,
	listFolderImages
} from '$lib/server/google-drive';
import { google } from 'googleapis';
import { env as privateEnv } from '$env/dynamic/private';

const lookupFolderName = async (folderId: string): Promise<string | null> => {
	try {
		const raw = privateEnv.GOOGLE_SERVICE_ACCOUNT_JSON ?? '';
		if (!raw) return null;
		const credentials = JSON.parse(raw) as { client_email?: string; private_key?: string };
		if (!credentials.client_email || !credentials.private_key) return null;
		const auth = new google.auth.GoogleAuth({
			credentials: {
				client_email: credentials.client_email,
				private_key: credentials.private_key.replace(/\\n/g, '\n')
			},
			scopes: ['https://www.googleapis.com/auth/drive.readonly']
		});
		const drive = google.drive({ version: 'v3', auth });
		const { data } = await drive.files.get({
			fileId: folderId,
			fields: 'id, name, mimeType',
			supportsAllDrives: true
		});
		return data.name ?? null;
	} catch {
		return null;
	}
};

export type GalleryPhoto = {
	id: string;
	name: string;
	width: number | null;
	height: number | null;
	thumb: string;
	full: string;
};

type CachedGallery = {
	eventName: string;
	driveUrl: string;
	photos: GalleryPhoto[];
	expiresAt: number;
};
type GalleryData = Omit<CachedGallery, 'expiresAt'>;
const galleryCache = new Map<string, CachedGallery>();
const GALLERY_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
// Promise lock per folder — concurrent requests for the same gallery share
// the in-flight fetch instead of each kicking off their own Drive call.
const inflightFetches = new Map<string, Promise<GalleryData>>();

const fetchGallery = async (folderId: string): Promise<GalleryData> => {
	const [photos, name] = await Promise.all([
		listFolderImages(folderId),
		lookupFolderName(folderId)
	]);
	const gallery: GalleryPhoto[] = photos.map((p) => ({
		id: p.id,
		name: p.name,
		width: p.width,
		height: p.height,
		thumb: buildProxyThumbnailUrl(p.id, 600),
		full: buildProxyThumbnailUrl(p.id, 1600)
	}));
	return {
		eventName: name ?? 'Event',
		driveUrl: buildFolderViewUrl(folderId),
		photos: gallery
	};
};

const refreshGallery = (folderId: string): Promise<GalleryData> => {
	const existing = inflightFetches.get(folderId);
	if (existing) return existing;
	const promise = fetchGallery(folderId)
		.then((data) => {
			galleryCache.set(folderId, { ...data, expiresAt: Date.now() + GALLERY_TTL_MS });
			return data;
		})
		.catch((err) => {
			console.error(`Gallery refresh failed for ${folderId}:`, err);
			throw err;
		})
		.finally(() => {
			inflightFetches.delete(folderId);
		});
	inflightFetches.set(folderId, promise);
	return promise;
};

export const load: PageServerLoad = async ({ params }) => {
	const folderId = params.eventId;
	const now = Date.now();
	const cached = galleryCache.get(folderId);

	try {
		if (!cached) {
			// First load of this gallery: await the shared in-flight fetch.
			const data = await refreshGallery(folderId);
			return {
				folderId,
				...data,
				error: null as string | null
			};
		}

		if (cached.expiresAt <= now) {
			// Stale cache: kick off a background refresh (no await) and serve
			// stale data instantly. The lock prevents duplicate fetches.
			void refreshGallery(folderId).catch(() => {
				// Already logged in refreshGallery; swallow here to keep stale serve.
			});
		}

		// Return cached data instantly (0ms response time!)
		return {
			folderId,
			eventName: cached.eventName,
			driveUrl: cached.driveUrl,
			photos: cached.photos,
			error: null as string | null
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load gallery.';
		if (message.toLowerCase().includes('not found')) {
			throw error(404, 'Event not found');
		}
		return {
			folderId,
			eventName: 'Event',
			driveUrl: buildFolderViewUrl(folderId),
			photos: [] as GalleryPhoto[],
			error: message
		};
	}
};
