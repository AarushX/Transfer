import { error, type RequestHandler } from '@sveltejs/kit';
import { fetchImageThumbnail } from '$lib/server/google-drive';

const MIN_SIZE = 64;
const MAX_SIZE = 4000;

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
	const fileId = params.fileId;
	if (!fileId) throw error(400, 'Missing fileId');
	const requested = Number(url.searchParams.get('sz') ?? '1000');
	const sizePx = Number.isFinite(requested)
		? Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.floor(requested)))
		: 1000;
	try {
		const { stream, contentType, status } = await fetchImageThumbnail(fileId, sizePx);
		if (!stream || status >= 400) {
			throw error(status || 502, 'Upstream image fetch failed');
		}
		setHeaders({
			'content-type': contentType,
			// Drive file contents are immutable per id; cache hard at the edge
			// and in the browser.
			'cache-control': 'public, max-age=31536000, immutable'
		});
		return new Response(stream, { status: 200 });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Image fetch failed';
		throw error(500, message);
	}
};
