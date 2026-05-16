import { json, type RequestHandler } from '@sveltejs/kit';
import {
	buildFolderViewUrl,
	buildProxyThumbnailUrl,
	folderSummary,
	getMediaRootFolderId,
	listChildFolders,
	listFolderImages
} from '$lib/server/google-drive';

const CACHE_HEADERS = {
	'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
};

const failure = (err: unknown) => {
	const message = err instanceof Error ? err.message : 'Drive request failed.';
	return json({ error: message }, { status: 500 });
};

export const GET: RequestHandler = async ({ url }) => {
	const folderId = url.searchParams.get('folderId');

	if (folderId) {
		try {
			const photos = await listFolderImages(folderId);
			return json(
				{
					folderId,
					driveUrl: buildFolderViewUrl(folderId),
					photos: photos.map((p) => ({
						id: p.id,
						name: p.name,
						width: p.width,
						height: p.height,
						mimeType: p.mimeType,
						thumb: buildProxyThumbnailUrl(p.id, 600),
						full: buildProxyThumbnailUrl(p.id, 2000)
					}))
				},
				{ headers: CACHE_HEADERS }
			);
		} catch (err) {
			return failure(err);
		}
	}

	try {
		const rootId = getMediaRootFolderId();
		const folders = await listChildFolders(rootId);
		const events = await Promise.all(
			folders.map(async (folder) => {
				const summary = await folderSummary(folder.id).catch(() => ({
					cover: null,
					approxPhotoCount: 0,
					hasMoreThanReturned: false
				}));
				return {
					id: folder.id,
					name: folder.name,
					photoCount: summary.approxPhotoCount,
					photoCountIsApprox: summary.hasMoreThanReturned,
					coverPhotoId: summary.cover?.id ?? null,
					coverThumb: summary.cover ? buildProxyThumbnailUrl(summary.cover.id, 800) : null,
					driveUrl: buildFolderViewUrl(folder.id)
				};
			})
		);
		// Newest folder first by name when names contain dates; fall back to alpha desc.
		events.sort((a, b) => b.name.localeCompare(a.name));
		return json({ events }, { headers: CACHE_HEADERS });
	} catch (err) {
		return failure(err);
	}
};
