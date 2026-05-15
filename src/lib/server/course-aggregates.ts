import type { SupabaseClient } from '@supabase/supabase-js';

export type Aggregate = { assigned: number; completed: number };

export async function fetchCourseAggregates(
	supabase: SupabaseClient,
	nodeIds: string[]
): Promise<Map<string, Aggregate>> {
	if (nodeIds.length === 0) return new Map();
	const { data, error } = await supabase.rpc('course_completion_aggregate', {
		node_ids: nodeIds
	});
	if (error || !data) return new Map();
	const map = new Map<string, Aggregate>();
	for (const row of data as Array<{ node_id: string; assigned: number; completed: number }>) {
		map.set(String(row.node_id), {
			assigned: Number(row.assigned ?? 0),
			completed: Number(row.completed ?? 0)
		});
	}
	return map;
}
