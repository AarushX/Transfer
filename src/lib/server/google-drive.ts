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
	const drive = getDriveClient();
	const meta = await drive.files.get({
		fileId,
		fields: 'thumbnailLink, mimeType, name',
		supportsAllDrives: true
	});
	const mimeType = meta.data.mimeType ?? 'image/jpeg';
	const link = meta.data.thumbnailLink;
	if (link) {
		// Drive thumbnail URLs use =s### as the longest-edge size token.
		const sizedUrl = link.replace(/=s\d+(-[a-z])?$/i, `=s${sizePx}`);
		const resp = await fetch(sizedUrl);
		return {
			stream: resp.body,
			contentType: resp.headers.get('content-type') ?? mimeType,
			status: resp.status
		};
	}
	// No thumbnail metadata — fall back to streaming the original file.
	const full = await drive.files.get(
		{ fileId, alt: 'media', supportsAllDrives: true },
		{ responseType: 'stream' }
	);
	const nodeStream = full.data as unknown as NodeJS.ReadableStream;
	// Node Readable → web ReadableStream
	const { Readable } = await import('node:stream');
	const webStream = Readable.toWeb(nodeStream as never) as unknown as ReadableStream<Uint8Array>;
	return { stream: webStream, contentType: mimeType, status: 200 };
};
