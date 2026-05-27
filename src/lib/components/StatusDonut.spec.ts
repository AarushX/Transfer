import { describe, it, expect } from 'vitest';
import { computeSegments } from './status-donut-math';

describe('computeSegments', () => {
	it('returns five segments summing to circumference within rounding', () => {
		const segments = computeSegments(
			{ done: 7, current: 2, awaiting: 1, blocked: 1, locked: 1 },
			251.327
		);
		const total = segments.reduce((acc, s) => acc + s.length, 0);
		expect(total).toBeCloseTo(251.327, 2);
		expect(segments).toHaveLength(5);
	});

	it('handles all-zero gracefully', () => {
		const segments = computeSegments(
			{ done: 0, current: 0, awaiting: 0, blocked: 0, locked: 0 },
			251.327
		);
		expect(segments.every((s) => s.length === 0)).toBe(true);
	});

	it('emits offsets that chain sequentially', () => {
		const segments = computeSegments(
			{ done: 5, current: 0, awaiting: 0, blocked: 0, locked: 5 },
			100
		);
		expect(segments[0].offset).toBe(0);
		expect(segments[1].offset).toBe(segments[0].length);
	});
});
