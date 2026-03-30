import type { LogicGraph, NodeId } from '../types/graph';

export interface NodePosition {
  x: number;
  y: number;
}

/** Layer tree children only for layout; link-only targets still get a position fallback. */
export function computeTreeLayout(
  graph: LogicGraph,
  options: { nodeW: number; nodeH: number; gapX: number; gapY: number },
): Map<NodeId, NodePosition> {
  const { nodes, rootId } = graph;
  const pos = new Map<NodeId, NodePosition>();

  const levels: NodeId[][] = [];
  let frontier: NodeId[] = [rootId];
  while (frontier.length) {
    levels.push(frontier);
    const next: NodeId[] = [];
    for (const id of frontier) {
      const c = nodes[id]?.childId;
      if (c) next.push(c);
    }
    frontier = next;
  }

  levels.forEach((row, depth) => {
    const yOff = (row.length - 1) * options.gapY * -0.5;
    row.forEach((id, j) => {
      pos.set(id, {
        x: depth * (options.nodeW + options.gapX),
        y: yOff + j * options.gapY,
      });
    });
  });

  for (const id of Object.keys(nodes)) {
    if (!pos.has(id)) {
      pos.set(id, { x: 0, y: Object.keys(nodes).indexOf(id) * options.gapY });
    }
  }

  return pos;
}
