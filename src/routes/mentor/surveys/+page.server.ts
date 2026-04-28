import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: surveys }, { data: nodes }] = await Promise.all([
		locals.supabase
			.from('surveys')
			.select('id,title,slug,is_active,show_when_inactive,visible_from,visible_until,updated_at')
			.order('updated_at', { ascending: false }),
		locals.supabase.from('nodes').select('id,title').order('title')
	]);

	return {
		surveys: surveys ?? [],
		nodes: nodes ?? []
	};
};
