/**
 * Core graph model: normalized map of nodes + explicit root.
 * Edges are implicit: structural `childId` (tree spine) and optional `linkTargetId` (jump).
 */
export type NodeId = string;

export interface LogicNode {
  id: NodeId;
  /** Human-readable condition expression */
  condition: string;
  /** Next node along the primary (nested) branch */
  childId: NodeId | null;
  /** Optional non-local jump — creates a directed edge for graph semantics */
  linkTargetId: NodeId | null;
}

export interface LogicGraph {
  nodes: Record<NodeId, LogicNode>;
  rootId: NodeId;
}

/** Directed edge in the execution graph (for visualization & cycle marking). */
export interface DirectedEdge {
  from: NodeId;
  to: NodeId;
  kind: 'child' | 'link';
}

export type VisitColor = 'white' | 'gray' | 'black';

/** Result of DFS-based cycle analysis */
export interface CycleAnalysis {
  hasCycle: boolean;
  /** Nodes that lie on at least one directed cycle */
  cyclicNodeIds: ReadonlySet<NodeId>;
  /** Edges that close a cycle (back-edges found during DFS) */
  cyclicEdges: readonly DirectedEdge[];
}
