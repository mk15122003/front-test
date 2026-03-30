import type { LogicGraph, LogicNode, NodeId } from '../types/graph';

export type GraphAction =
  | { type: 'SET_CONDITION'; id: NodeId; condition: string }
  | { type: 'ADD_CHILD'; parentId: NodeId }
  | { type: 'REMOVE_BRANCH'; id: NodeId }
  | { type: 'SET_LINK'; id: NodeId; targetId: NodeId | null }
  | { type: 'RESET' }
  | { type: 'LOAD_GRAPH'; graph: LogicGraph };

function newId(): NodeId {
  return crypto.randomUUID();
}

export function createInitialGraph(): LogicGraph {
  const rootId = newId();
  const start: LogicNode = {
    id: rootId,
    condition: 'entry — start evaluation',
    childId: null,
    linkTargetId: null,
  };
  return { rootId, nodes: { [rootId]: start } };
}

function findParentWithChild(
  nodes: Record<NodeId, LogicNode>,
  childId: NodeId,
): NodeId | null {
  for (const n of Object.values(nodes)) {
    if (n.childId === childId) return n.id;
  }
  return null;
}

export function graphReducer(graph: LogicGraph, action: GraphAction): LogicGraph {
  switch (action.type) {
    case 'SET_CONDITION': {
      const n = graph.nodes[action.id];
      if (!n) return graph;
      return {
        ...graph,
        nodes: {
          ...graph.nodes,
          [action.id]: { ...n, condition: action.condition },
        },
      };
    }
    case 'ADD_CHILD': {
      const parent = graph.nodes[action.parentId];
      if (!parent) return graph;
      if (parent.childId) return graph;
      const childId = newId();
      const child: LogicNode = {
        id: childId,
        condition: 'new condition',
        childId: null,
        linkTargetId: null,
      };
      return {
        ...graph,
        nodes: {
          ...graph.nodes,
          [action.parentId]: { ...parent, childId },
          [childId]: child,
        },
      };
    }
    case 'REMOVE_BRANCH': {
      if (action.id === graph.rootId) return graph;
      const target = graph.nodes[action.id];
      if (!target) return graph;
      const parentId = findParentWithChild(graph.nodes, action.id);
      if (!parentId) return graph;

      const collectSubtree = (id: NodeId, acc: Set<NodeId>) => {
        acc.add(id);
        const x = graph.nodes[id];
        if (x?.childId) collectSubtree(x.childId, acc);
      };
      const toDelete = new Set<NodeId>();
      collectSubtree(action.id, toDelete);

      const nextNodes: Record<NodeId, LogicNode> = {};
      for (const [id, n] of Object.entries(graph.nodes)) {
        if (toDelete.has(id)) continue;
        nextNodes[id] = { ...n };
      }
      const parent = nextNodes[parentId]!;
      nextNodes[parentId] = {
        ...parent,
        childId: target.childId && !toDelete.has(target.childId) ? target.childId : null,
      };
      for (const id of Object.keys(nextNodes)) {
        const n = nextNodes[id]!;
        nextNodes[id] = {
          ...n,
          childId: n.childId && toDelete.has(n.childId) ? null : n.childId,
          linkTargetId:
            n.linkTargetId && toDelete.has(n.linkTargetId) ? null : n.linkTargetId,
        };
      }
      return { ...graph, nodes: nextNodes };
    }
    case 'SET_LINK': {
      const n = graph.nodes[action.id];
      if (!n) return graph;
      const t = action.targetId;
      if (t === action.id) return graph;
      if (t && !graph.nodes[t]) return graph;
      return {
        ...graph,
        nodes: {
          ...graph.nodes,
          [action.id]: { ...n, linkTargetId: t },
        },
      };
    }
    case 'RESET':
      return createInitialGraph();
    case 'LOAD_GRAPH':
      return action.graph;
    default:
      return graph;
  }
}
