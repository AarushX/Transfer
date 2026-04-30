const extractId = (input: string, marker: string) => {
	const idx = input.indexOf(marker);
	if (idx === -1) return '';
	const rest = input.slice(idx + marker.length);
	const stop = rest.search(/[/?&#]/);
	return (stop === -1 ? rest : rest.slice(0, stop)).trim();
};

export const toDriveDownloadUrl = (rawUrl: string): string => {
	const url = String(rawUrl ?? '').trim();
	if (!url) return '';

	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();
		if (!host.includes('google.com')) return url;

		if (host.includes('drive.google.com')) {
			const idFromQuery = parsed.searchParams.get('id')?.trim() ?? '';
			const idFromPath =
				extractId(parsed.pathname, '/file/d/') ||
				extractId(parsed.pathname, '/document/d/') ||
				extractId(parsed.pathname, '/spreadsheets/d/') ||
				extractId(parsed.pathname, '/presentation/d/');
			const id = idFromQuery || idFromPath;
			if (!id) return url;

			if (parsed.pathname.includes('/document/d/')) {
				return `https://docs.google.com/document/d/${id}/export?format=pdf`;
			}
			if (parsed.pathname.includes('/spreadsheets/d/')) {
				return `https://docs.google.com/spreadsheets/d/${id}/export?format=pdf`;
			}
			if (parsed.pathname.includes('/presentation/d/')) {
				return `https://docs.google.com/presentation/d/${id}/export/pdf`;
			}
			return `https://drive.google.com/uc?export=download&id=${id}`;
		}

		if (host.includes('docs.google.com')) {
			const idFromDoc = extractId(parsed.pathname, '/document/d/');
			const idFromSheet = extractId(parsed.pathname, '/spreadsheets/d/');
			const idFromSlide = extractId(parsed.pathname, '/presentation/d/');
			if (idFromDoc) return `https://docs.google.com/document/d/${idFromDoc}/export?format=pdf`;
			if (idFromSheet) return `https://docs.google.com/spreadsheets/d/${idFromSheet}/export?format=pdf`;
			if (idFromSlide) return `https://docs.google.com/presentation/d/${idFromSlide}/export/pdf`;
		}
	} catch {
		return url;
	}

	return url;
};
