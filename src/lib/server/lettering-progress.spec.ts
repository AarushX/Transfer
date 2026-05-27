import { describe, it, expect, vi } from 'vitest';
import { computeLetteringProgressPure, computeLetteringProgress } from './lettering-progress';

describe('computeLetteringProgressPure', () => {
	it('returns zero state when no requirements exist', () => {
		const result = computeLetteringProgressPure([], {});
		expect(result).toEqual({
			pct: 0,
			completedCount: 0,
			totalRequired: 0,
			overflow: false,
			categories: []
		});
	});

	it('computes percent from completed-vs-required ratio across requirements', () => {
		const result = computeLetteringProgressPure(
			[
				{ category: 'hours', required_value: 40 },
				{ category: 'outreach', required_value: 4 }
			],
			{ hours: 32, outreach: 5 }
		);
		// hours: 32/40 = 0.8 (clamped); outreach: 5/4 = 1.25 (clamped to 1); avg = 0.9 -> 90%
		expect(result.pct).toBe(90);
		expect(result.completedCount).toBe(1); // only outreach is fully met
		expect(result.totalRequired).toBe(2);
		expect(result.overflow).toBe(false);
	});

	it('flags overflow when raw average exceeds 100%', () => {
		const result = computeLetteringProgressPure([{ category: 'hours', required_value: 40 }], {
			hours: 60
		});
		expect(result.pct).toBeGreaterThan(100);
		expect(result.overflow).toBe(true);
	});

	it('treats missing tally entries as zero', () => {
		const result = computeLetteringProgressPure([{ category: 'outreach', required_value: 4 }], {});
		expect(result.pct).toBe(0);
		expect(result.completedCount).toBe(0);
	});
});

describe('computeLetteringProgress', () => {
	it('returns zero state when no active season', async () => {
		const supabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({ data: [], error: null })
			})
		};
		const result = await computeLetteringProgress(supabase as any, 'u1');
		expect(result.pct).toBe(0);
		expect(result.totalRequired).toBe(0);
	});
});
