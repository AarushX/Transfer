import type { PageServerLoad } from './$types';
import {
	buildProxyThumbnailUrl,
	countFolderImages,
	firstFolderImage,
	getMediaRootFolderId,
	listChildFolders
} from '$lib/server/google-drive';

export type MediaEvent = {
	id: string;
	name: string;
	photoCount: number;
	coverPhotoId: string | null;
	coverThumb: string | null;
};

export const load: PageServerLoad = async () => {
	try {
		const rootId = getMediaRootFolderId();
		const folders = await listChildFolders(rootId);
		const events: MediaEvent[] = await Promise.all(
			folders.map(async (folder) => {
				const [cover, photoCount] = await Promise.all([
					firstFolderImage(folder.id).catch(() => null),
					countFolderImages(folder.id).catch(() => 0)
				]);
				return {
					id: folder.id,
					name: folder.name,
					photoCount,
					coverPhotoId: cover?.id ?? null,
					coverThumb: cover ? buildProxyThumbnailUrl(cover.id, 800) : null
				};
			})
		);
		events.sort((a, b) => b.name.localeCompare(a.name));
		return { events, error: null as string | null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load media folders.';
		return { events: [] as MediaEvent[], error: message };
	}
};
