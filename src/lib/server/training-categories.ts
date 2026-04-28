export type TrainingCategory = {
	id: string;
	name: string;
	slug: string;
	parent_id: string | null;
	kind: 'group' | 'program' | 'subteam' | 'topic';
	color_token: string;
	sort_order: number;
};

export async function loadTrainingCategories(supabase: any) {
	const [{ data: categories }, { data: nodeCategoryRows }] = await Promise.all([
		supabase
			.from('training_categories')
			.select('id,name,slug,parent_id,kind,color_token,sort_order')
			.eq('is_active', true)
			.order('sort_order', { ascending: true }),
		supabase.from('node_categories').select('node_id,category_id')
	]);

	return {
		categories: (categories ?? []) as TrainingCategory[],
		nodeCategories: (nodeCategoryRows ?? []) as Array<{ node_id: string; category_id: string }>
	};
}
