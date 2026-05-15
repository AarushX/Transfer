import { describe, it, expect, vi } from 'vitest';
import { fetchCourseAggregates } from './course-aggregates';

describe('fetchCourseAggregates', () => {
	it('returns a Map keyed by node_id', async () => {
		const supabase = {
			rpc: vi.fn().mockResolvedValue({
				data: [
					{ node_id: 'n1', assigned: 14, completed: 12 },
					{ node_id: 'n2', assigned: 22, completed: 19 }
				],
				error: null
			})
		};
		const result = await fetchCourseAggregates(supabase as any, ['n1', 'n2']);
		expect(supabase.rpc).toHaveBeenCalledWith('course_completion_aggregate', {
			node_ids: ['n1', 'n2']
		});
		expect(result.get('n1')).toEqual({ assigned: 14, completed: 12 });
		expect(result.get('n2')).toEqual({ assigned: 22, completed: 19 });
	});

	it('returns empty Map when input list is empty (no RPC call)', async () => {
		const supabase = { rpc: vi.fn() };
		const result = await fetchCourseAggregates(supabase as any, []);
		expect(result.size).toBe(0);
		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	it('returns empty Map when RPC errors', async () => {
		const supabase = {
			rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } })
		};
		const result = await fetchCourseAggregates(supabase as any, ['n1']);
		expect(result.size).toBe(0);
	});
});
