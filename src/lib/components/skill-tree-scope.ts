type Node = { id: string; title: string; slug: string };
type Edge = { node_id: string; prerequisite_node_id: string };

export function filterByScope(
	nodes: Node[],
	prerequisites: Edge[],
	scope: Set<string> | undefined
): { nodes: Node[]; prerequisites: Edge[] } {
	if (!scope) return { nodes, prerequisites };
	const allowed = scope;
	const filteredNodes = nodes.filter((n) => allowed.has(n.id));
	const filteredEdges = prerequisites.filter(
		(e) => allowed.has(e.node_id) && allowed.has(e.prerequisite_node_id)
	);
	return { nodes: filteredNodes, prerequisites: filteredEdges };
}
