import { describe, it, expect, vi } from 'vitest';
import { computeMentorQueueCount } from './sidebar-data';

describe('computeMentorQueueCount', () => {
	it('returns 0 for non-mentors', async () => {
		const supabase = { from: vi.fn() };
		const profile = { is_mentor: false };
		expect(await computeMentorQueueCount(supabase as any, profile as any)).toBe(0);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns the count from the relevant mentor-queue table for mentors', async () => {
		const queueQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ count: 4, data: null, error: null })
		};
		const supabase = { from: vi.fn().mockReturnValue(queueQuery) };
		const profile = { is_mentor: true };
		const result = await computeMentorQueueCount(supabase as any, profile as any);
		expect(result).toBe(4);
		expect(supabase.from).toHaveBeenCalledWith('certifications');
		expect(queueQuery.eq).toHaveBeenCalledWith('status', 'mentor_checkoff_pending');
	});

	it('returns 0 when the query errors', async () => {
		const queueQuery = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ count: null, data: null, error: new Error('db error') })
		};
		const supabase = { from: vi.fn().mockReturnValue(queueQuery) };
		const profile = { is_mentor: true };
		const result = await computeMentorQueueCount(supabase as any, profile as any);
		expect(result).toBe(0);
	});

	it('returns 0 for null profile', async () => {
		const supabase = { from: vi.fn() };
		expect(await computeMentorQueueCount(supabase as any, null)).toBe(0);
		expect(supabase.from).not.toHaveBeenCalled();
	});
});
