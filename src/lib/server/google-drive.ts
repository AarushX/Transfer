import { google, type drive_v3 } from 'googleapis';
import { env as privateEnv } from '$env/dynamic/private';

export type DriveFolder = {
	id: string;
	name: string;
};

export type DrivePhoto = {
	id: string;
	name: string;
	width: number | null;
	height: number | null;
	mimeType: string;
};

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

let cachedClient: drive_v3.Drive | null = null;
let cachedClientKey = '';

const parseCredentials = () => {
	const raw = privateEnv.GOOGLE_SERVICE_ACCOUNT_JSON ?? '';
	if (!raw) {
		throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
	}
	try {
		return JSON.parse(raw) as { client_email?: string; private_key?: string };
	} catch (err) {
		throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${(err as Error).message}`);
	}
};

const getDriveClient = (): drive_v3.Drive => {
	const raw = privateEnv.GOOGLE_SERVICE_ACCOUNT_JSON ?? '';
	if (cachedClient && cachedClientKey === raw) return cachedClient;
	const credentials = parseCredentials();
	if (!credentials.client_email || !credentials.private_key) {
		throw new Error(
			'GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key — re-download the service account JSON.'
		);
	}
	const auth = new google.auth.GoogleAuth({
		credentials: {
			client_email: credentials.client_email,
			// JSON-encoded newlines (\\n) need to become real newlines so the PEM parser is happy.
			private_key: credentials.private_key.replace(/\\n/g, '\n')
		},
		scopes: DRIVE_SCOPES
	});
	cachedClient = google.drive({ version: 'v3', auth });
	cachedClientKey = raw;
	return cachedClient;
};

export const getMediaRootFolderId = (): string => {
	const id = privateEnv.GOOGLE_DRIVE_MEDIA_FOLDER_ID ?? '';
	if (!id) throw new Error('GOOGLE_DRIVE_MEDIA_FOLDER_ID is not set');
	return id;
};

// Common query options to support Shared Drives.
const sharedDriveOptions = {
	supportsAllDrives: true,
	includeItemsFromAllDrives: true,
	corpora: 'allDrives' as const,
	spaces: 'drive' as const
};

const escapeForQuery = (value: string) => value.replace(/['\\]/g, (m) => `\\${m}`);

/** List immediate child folders of a parent — used to enumerate events. */
export const listChildFolders = async (parentId: string): Promise<DriveFolder[]> => {
	const drive = getDriveClient();
	const results: DriveFolder[] = [];
	let pageToken: string | undefined;
	const safeParent = escapeForQuery(parentId);
	do {
		const { data } = await drive.files.list({
			...sharedDriveOptions,
			q: `mimeType = 'application/vnd.google-apps.folder' and '${safeParent}' in parents and trashed = false`,
			fields: 'nextPageToken, files(id, name)',
			orderBy: 'name',
			pageSize: 200,
			pageToken
		});
		for (const file of data.files ?? []) {
			if (!file.id || !file.name) continue;
			results.push({ id: file.id, name: file.name });
		}
		pageToken = data.nextPageToken ?? undefined;
	} while (pageToken);
	return results;
};

/** List images directly inside one folder (no recursion). */
const listImagesIn = async (folderId: string): Promise<DrivePhoto[]> => {
	const drive = getDriveClient();
	const safeFolder = escapeForQuery(folderId);
	const results: DrivePhoto[] = [];
	let pageToken: string | undefined;
	do {
		const { data } = await drive.files.list({
			...sharedDriveOptions,
			q: `mimeType contains 'image/' and '${safeFolder}' in parents and trashed = false`,
			fields:
				'nextPageToken, files(id, name, mimeType, imageMediaMetadata(width, height), createdTime)',
			orderBy: 'createdTime desc, name',
			pageSize: 200,
			pageToken
		});
		for (const file of data.files ?? []) {
			if (!file.id || !file.name) continue;
			results.push({
				id: file.id,
				name: file.name,
				width: file.imageMediaMetadata?.width ?? null,
				height: file.imageMediaMetadata?.height ?? null,
				mimeType: file.mimeType ?? 'image/jpeg'
			});
		}
		pageToken = data.nextPageToken ?? undefined;
	} while (pageToken);
	return results;
};

/**
 * List image files inside a folder *and* all of its descendant subfolders.
 * Event folders sometimes contain dated sub-buckets ("Saturday", "Day 2"…)
 * and the gallery should show every photo under the event regardless of depth.
 * Depth is capped to avoid runaway traversals on misconfigured drives.
 */
export const listFolderImages = async (
	folderId: string,
	{ maxDepth = 6 }: { maxDepth?: number } = {}
): Promise<DrivePhoto[]> => {
	const seen = new Set<string>();
	const all: DrivePhoto[] = [];
	const walk = async (id: string, depth: number) => {
		if (depth > maxDepth || seen.has(id)) return;
		seen.add(id);
		const [images, subfolders] = await Promise.all([
			listImagesIn(id),
			listChildFolders(id)
		]);
		for (const img of images) all.push(img);
		// Recurse breadth-first across subfolders in parallel.
		await Promise.all(subfolders.map((sf) => walk(sf.id, depth + 1)));
	};
	await walk(folderId, 0);
	// De-dupe by file id in case a photo is reachable via multiple parents.
	const byId = new Map<string, DrivePhoto>();
	for (const img of all) byId.set(img.id, img);
	return Array.from(byId.values());
};

/** First image in a folder tree — used for the event card cover photo. */
export const firstFolderImage = async (folderId: string): Promise<DrivePhoto | null> => {
	// Try direct children first (fast path); only descend if empty.
	const direct = await listImagesIn(folderId);
	if (direct.length > 0) return direct[0];
	const all = await listFolderImages(folderId);
	return all[0] ?? null;
};

/** Recursive count of images under a folder. */
export const countFolderImages = async (folderId: string): Promise<number> => {
	const photos = await listFolderImages(folderId);
	return photos.length;
};

/**
 * Cheap one-shot summary for a folder — used by the /media index where we
 * only need a cover photo + approximate count. Avoids the recursive walk
 * (which was the main cause of slow folder-index loads). One Drive call:
 * we ask for one image + a generous page of images so we can both pick a
 * cover and report an exact count for the common case where everything
 * lives at one depth.
 */
export const folderSummary = async (
	folderId: string
): Promise<{ cover: DrivePhoto | null; approxPhotoCount: number; hasMoreThanReturned: boolean }> => {
	const drive = getDriveClient();
	const safeFolder = escapeForQuery(folderId);
	const { data } = await drive.files.list({
		...sharedDriveOptions,
		q: `mimeType contains 'image/' and '${safeFolder}' in parents and trashed = false`,
		fields:
			'nextPageToken, files(id, name, mimeType, imageMediaMetadata(width, height))',
		orderBy: 'createdTime, name',
		pageSize: 200
	});
	const files = data.files ?? [];
	const cover = files[0]
		? {
				id: String(files[0].id),
				name: String(files[0].name),
				width: files[0].imageMediaMetadata?.width ?? null,
				height: files[0].imageMediaMetadata?.height ?? null,
				mimeType: files[0].mimeType ?? 'image/jpeg'
			}
		: null;
	return {
		cover,
		approxPhotoCount: files.length,
		hasMoreThanReturned: Boolean(data.nextPageToken)
	};
};

/**
 * Public Drive thumbnail URL — only works if the file is shared as
 * "anyone with the link". Prefer buildProxyThumbnailUrl for service-account
 * owned files in a private Shared Drive (no public link required).
 */
export const buildThumbnailUrl = (id: string, sizePx = 1200) =>
	`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${sizePx}`;

/** Same-origin proxy URL that streams the image through our server. */
export const buildProxyThumbnailUrl = (id: string, sizePx = 1200) =>
	`/api/media/image/${encodeURIComponent(id)}?sz=${sizePx}`;

export const buildFolderViewUrl = (id: string) =>
	`https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;

// In-process cache for Drive thumbnailLink + mimeType. The link itself is a
// short-lived signed URL but the metadata roundtrip dominates the proxy's
// response time, so caching it for a minute is a huge win: a typical
// 30-image gallery goes from 30 Drive `files.get` calls down to 0 on warm
// pages.
type ThumbMeta = { link: string | null; mimeType: string };
const thumbMetaCache = new Map<string, { value: ThumbMeta; expiresAt: number }>();
const THUMB_META_TTL_MS = 4 * 60 * 1000;

const getThumbMeta = async (fileId: string): Promise<ThumbMeta> => {
	const now = Date.now();
	const cached = thumbMetaCache.get(fileId);
	if (cached && cached.expiresAt > now) return cached.value;
	const drive = getDriveClient();
	const meta = await drive.files.get({
		fileId,
		fields: 'thumbnailLink, mimeType',
		supportsAllDrives: true
	});
	const value: ThumbMeta = {
		link: meta.data.thumbnailLink ?? null,
		mimeType: meta.data.mimeType ?? 'image/jpeg'
	};
	thumbMetaCache.set(fileId, { value, expiresAt: now + THUMB_META_TTL_MS });
	return value;
};

/**
 * Fetch a thumbnail image stream for a given file id. Uses the service
 * account's `thumbnailLink` so private Shared Drive files load without
 * needing the folder to be publicly shared. Falls back to the full-file
 * media stream if no thumbnailLink is available.
 */
export const fetchImageThumbnail = async (
	fileId: string,
	sizePx: number
): Promise<{ stream: ReadableStream<Uint8Array> | null; contentType: string; status: number }> => {
	const { link, mimeType } = await getThumbMeta(fileId);
	if (link) {
		// Drive thumbnail URLs use =s### as the longest-edge size token.
		const sizedUrl = link.replace(/=s\d+(-[a-z])?$/i, `=s${sizePx}`);
		const resp = await fetch(sizedUrl);
		// If the cached signed link has expired, refresh and retry once.
		if (resp.status === 403 || resp.status === 404) {
			thumbMetaCache.delete(fileId);
			const fresh = await getThumbMeta(fileId);
			if (fresh.link) {
				const retryUrl = fresh.link.replace(/=s\d+(-[a-z])?$/i, `=s${sizePx}`);
				const retry = await fetch(retryUrl);
				return {
					stream: retry.body,
					contentType: retry.headers.get('content-type') ?? fresh.mimeType,
					status: retry.status
				};
			}
		}
		return {
			stream: resp.body,
			contentType: resp.headers.get('content-type') ?? mimeType,
			status: resp.status
		};
	}
	// No thumbnail metadata — fall back to streaming the original file.
	const drive = getDriveClient();
	const full = await drive.files.get(
		{ fileId, alt: 'media', supportsAllDrives: true },
		{ responseType: 'stream' }
	);
	const nodeStream = full.data as unknown as NodeJS.ReadableStream;
	const { Readable } = await import('node:stream');
	const webStream = Readable.toWeb(nodeStream as never) as unknown as ReadableStream<Uint8Array>;
	return { stream: webStream, contentType: mimeType, status: 200 };
};

export type MediaEventSummary = {
	id: string;
	name: string;
	photoCount: number;
	photoCountIsApprox: boolean;
	coverPhotoId: string | null;
	coverThumb: string | null;
	driveUrl: string;
};

/**
 * Highly optimized batch summary of all event folders and images under the media root.
 * Instead of making individual nested calls for each event folder, this performs just
 * 2 batch list operations to fully reconstruct the tree hierarchy and compute counts
 * and covers in memory. Loads in under 1 second!
 */
export const getMediaEventsSummary = async (): Promise<MediaEventSummary[]> => {
	const drive = getDriveClient();
	const rootId = getMediaRootFolderId();

	// 1. Fetch all folders in the drive to reconstruct the hierarchy
	const allFolders: drive_v3.Schema$File[] = [];
	let folderPageToken: string | undefined;
	do {
		const resp = await drive.files.list({
			...sharedDriveOptions,
			q: `mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
			fields: 'nextPageToken, files(id, name, parents)',
			pageSize: 300,
			pageToken: folderPageToken
		});
		if (resp.data.files) {
			allFolders.push(...resp.data.files);
		}
		folderPageToken = resp.data.nextPageToken ?? undefined;
	} while (folderPageToken && allFolders.length < 1000);

	// 2. Build parent -> children map for folders
	const parentToChildren = new Map<string, { id: string; name: string }[]>();
	for (const folder of allFolders) {
		if (!folder.id || !folder.name) continue;
		const parents = folder.parents ?? [];
		for (const parentId of parents) {
			if (!parentToChildren.has(parentId)) {
				parentToChildren.set(parentId, []);
			}
			parentToChildren.get(parentId)!.push({ id: folder.id, name: folder.name });
		}
	}

	// Direct children of the media root are our event folders
	const eventFolders = parentToChildren.get(rootId) ?? [];

	// Helper to collect all subfolder IDs (including the folder itself)
	const getDescendantFolderIds = (folderId: string): Set<string> => {
		const ids = new Set<string>([folderId]);
		const queue = [folderId];
		while (queue.length > 0) {
			const curr = queue.shift()!;
			const children = parentToChildren.get(curr) ?? [];
			for (const child of children) {
				if (!ids.has(child.id)) {
					ids.add(child.id);
					queue.push(child.id);
				}
			}
		}
		return ids;
	};

	// 3. Fetch all images in the drive to group them by parent folder
	const allImages: drive_v3.Schema$File[] = [];
	let imagePageToken: string | undefined;
	do {
		const resp = await drive.files.list({
			...sharedDriveOptions,
			q: `mimeType contains 'image/' and trashed = false`,
			fields: 'nextPageToken, files(id, name, mimeType, parents, imageMediaMetadata(width, height), createdTime)',
			orderBy: 'createdTime desc, name',
			pageSize: 500,
			pageToken: imagePageToken
		});
		if (resp.data.files) {
			allImages.push(...resp.data.files);
		}
		imagePageToken = resp.data.nextPageToken ?? undefined;
	} while (imagePageToken && allImages.length < 2000);

	// Group images by parent folder ID
	const folderIdToImages = new Map<string, DrivePhoto[]>();
	for (const file of allImages) {
		if (!file.id || !file.name) continue;
		const parents = file.parents ?? [];
		const photo: DrivePhoto = {
			id: file.id,
			name: file.name,
			width: file.imageMediaMetadata?.width ? Number(file.imageMediaMetadata.width) : null,
			height: file.imageMediaMetadata?.height ? Number(file.imageMediaMetadata.height) : null,
			mimeType: file.mimeType ?? 'image/jpeg'
		};
		for (const parentId of parents) {
			if (!folderIdToImages.has(parentId)) {
				folderIdToImages.set(parentId, []);
			}
			folderIdToImages.get(parentId)!.push(photo);
		}
	}

	// 4. Assemble the summaries for each event folder
	const summaries: MediaEventSummary[] = eventFolders.map((folder) => {
		const descendantFolderIds = getDescendantFolderIds(folder.id);
		const eventImages: DrivePhoto[] = [];

		// Gather all images from any descendant folders
		for (const fId of descendantFolderIds) {
			const imgs = folderIdToImages.get(fId) ?? [];
			eventImages.push(...imgs);
		}

		// Since allImages is ordered desc by createdTime, cover photo is the first one
		const cover = eventImages[0] ?? null;

		return {
			id: folder.id,
			name: folder.name,
			photoCount: eventImages.length,
			photoCountIsApprox: false, // We have the exact count now
			coverPhotoId: cover?.id ?? null,
			coverThumb: cover ? buildProxyThumbnailUrl(cover.id, 800) : null,
			driveUrl: buildFolderViewUrl(folder.id)
		};
	});

	// Newest event first by folder name
	summaries.sort((a, b) => b.name.localeCompare(a.name));

	return summaries;
};

