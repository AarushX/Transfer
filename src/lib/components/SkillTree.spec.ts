import { describe, it, expect } from 'vitest';
import { filterByScope } from './skill-tree-scope';

describe('filterByScope', () => {
	const nodes = [
		{ id: 'a', title: 'A', slug: 'a' },
		{ id: 'b', title: 'B', slug: 'b' },
		{ id: 'c', title: 'C', slug: 'c' }
	];
	const prereqs = [
		{ node_id: 'b', prerequisite_node_id: 'a' },
		{ node_id: 'c', prerequisite_node_id: 'b' }
	];

	it('returns all when scope undefined', () => {
		const r = filterByScope(nodes, prereqs, undefined);
		expect(r.nodes).toHaveLength(3);
		expect(r.prerequisites).toHaveLength(2);
	});

	it('filters to allowed ids and drops dangling edges', () => {
		const r = filterByScope(nodes, prereqs, new Set(['b', 'c']));
		expect(r.nodes.map((n) => n.id)).toEqual(['b', 'c']);
		expect(r.prerequisites).toEqual([{ node_id: 'c', prerequisite_node_id: 'b' }]);
	});

	it('returns empty when scope is empty set', () => {
		const r = filterByScope(nodes, prereqs, new Set());
		expect(r.nodes).toEqual([]);
		expect(r.prerequisites).toEqual([]);
	});
});
