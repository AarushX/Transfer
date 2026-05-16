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

/** List image files inside a folder (handles pagination internally). */
export const listFolderImages = async (folderId: string): Promise<DrivePhoto[]> => {
	const drive = getDriveClient();
	const results: DrivePhoto[] = [];
	let pageToken: string | undefined;
	const safeFolder = escapeForQuery(folderId);
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

/** Fetch only the first image of a folder — used for event cover photos. */
export const firstFolderImage = async (folderId: string): Promise<DrivePhoto | null> => {
	const drive = getDriveClient();
	const safeFolder = escapeForQuery(folderId);
	const { data } = await drive.files.list({
		...sharedDriveOptions,
		q: `mimeType contains 'image/' and '${safeFolder}' in parents and trashed = false`,
		fields: 'files(id, name, mimeType, imageMediaMetadata(width, height))',
		orderBy: 'createdTime, name',
		pageSize: 1
	});
	const file = data.files?.[0];
	if (!file?.id || !file?.name) return null;
	return {
		id: file.id,
		name: file.name,
		width: file.imageMediaMetadata?.width ?? null,
		height: file.imageMediaMetadata?.height ?? null,
		mimeType: file.mimeType ?? 'image/jpeg'
	};
};

/** Count of images in a folder — uses pageSize=1 + size estimate via repeated calls only if needed. */
export const countFolderImages = async (folderId: string): Promise<number> => {
	const drive = getDriveClient();
	const safeFolder = escapeForQuery(folderId);
	let count = 0;
	let pageToken: string | undefined;
	do {
		const { data } = await drive.files.list({
			...sharedDriveOptions,
			q: `mimeType contains 'image/' and '${safeFolder}' in parents and trashed = false`,
			fields: 'nextPageToken, files(id)',
			pageSize: 1000,
			pageToken
		});
		count += data.files?.length ?? 0;
		pageToken = data.nextPageToken ?? undefined;
	} while (pageToken);
	return count;
};

export const buildThumbnailUrl = (id: string, sizePx = 1200) =>
	`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${sizePx}`;

export const buildFolderViewUrl = (id: string) =>
	`https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
