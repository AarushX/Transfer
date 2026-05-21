import { json, type RequestHandler } from '@sveltejs/kit';
import {
	buildFolderViewUrl,
	buildProxyThumbnailUrl,
	listFolderImages,
	getMediaEventsSummary
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
		const events = await getMediaEventsSummary();
		return json({ events }, { headers: CACHE_HEADERS });
	} catch (err) {
		return failure(err);
	}
};
