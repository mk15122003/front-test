import type {
  CycleAnalysis,
  DirectedEdge,
  LogicGraph,
  NodeId,
  VisitColor,
} from '../types/graph';

function neighborsOf(
  nodes: LogicGraph['nodes'],
  id: NodeId,
): Array<{ to: NodeId; kind: DirectedEdge['kind'] }> {
  const n = nodes[id];
  if (!n) return [];
  const out: Array<{ to: NodeId; kind: DirectedEdge['kind'] }> = [];
  if (n.childId) out.push({ to: n.childId, kind: 'child' });
  if (n.linkTargetId) out.push({ to: n.linkTargetId, kind: 'link' });
  return out;
}

/**
 * Depth-first search cycle detection for a directed graph.
 * Uses recursion-stack (GRAY = "currently visiting") to find back-edges.
 * Time: O(V + E), Space: O(V) for colors + stack.
 */
export function analyzeCyclesWithDfs(graph: LogicGraph): CycleAnalysis {
  const { nodes } = graph;
  const color = new Map<NodeId, VisitColor>();
  const cyclicNodeIds = new Set<NodeId>();
  const cyclicEdges: DirectedEdge[] = [];

  for (const id of Object.keys(nodes)) {
    color.set(id, 'white');
  }

  const dfs = (u: NodeId, stack: NodeId[]): void => {
    color.set(u, 'gray');
    stack.push(u);

    for (const { to: v, kind } of neighborsOf(nodes, u)) {
      if (!nodes[v]) continue;
      const c = color.get(v);
      if (c === 'gray') {
        cyclicEdges.push({ from: u, to: v, kind });
        const i = stack.indexOf(v);
        if (i >= 0) {
          for (let k = i; k < stack.length; k++) {
            cyclicNodeIds.add(stack[k]!);
          }
        }
        cyclicNodeIds.add(v);
        continue;
      }
      if (c === 'white') {
        dfs(v, stack);
      }
    }

    stack.pop();
    color.set(u, 'black');
  };

  for (const id of Object.keys(nodes)) {
    if (color.get(id) === 'white') {
      dfs(id, []);
    }
  }

  return {
    hasCycle: cyclicEdges.length > 0,
    cyclicNodeIds,
    cyclicEdges,
  };
}

export function edgeKey(e: DirectedEdge): string {
  return `${e.from}→${e.to}:${e.kind}`;
}
