# Logic Flow Mapper

Front-end assessment project: a **recursive if/then builder** with **cross-node links**, **real-time validation**, and a **depth-first search (DFS)** cycle detector. Built with **React 19**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Infinite nesting** via a structural `childId` pointer on each node (recursive UI + normalized state).
- **Non-linear graphs** via optional `linkTargetId` jumps (drawn as dashed edges in the preview).
- **DFS loop detection**: back edges while visiting the recursion stack mark invalid cycles; offending nodes and edges are highlighted; **Simulate logic** stays disabled until the graph is acyclic.
- **Branch removal** splices the tree and scrubs pointers that pointed into deleted subtrees.
- **Live SVG preview** with scaling layout, gradient edges, and simulation highlighting.

## Data structure: nested vs normalized

The **UI** is nested (recursive components follow `childId`), but **state** is **normalized**:

- `nodes: Record<NodeId, LogicNode>` — O(1) lookup and updates for any depth.
- Each `LogicNode` holds `condition`, at most one `childId` (primary branch), and optional `linkTargetId` (extra directed edge).

This avoids cloning deep trees on every keystroke and keeps link targets stable when the spine moves.

## Cycle detection algorithm

The execution graph is **directed**. Out-neighbors of a node are `childId` and `linkTargetId` (when set). The analyzer runs **DFS** with three colors / states:

- **white** — unvisited  
- **gray** — on the current recursion stack  
- **black** — finished  

Whenrelaxing an edge `u → v`, if `v` is **gray**, that edge is a **back edge** and indicates a **directed cycle**. All nodes on the stack from `v` upward are marked as cyclic, and the closing edges are stored for UI emphasis.

Complexity is **O(V + E)** over nodes and implicit edges.

## Scripts

```bash
npm install
npm run dev
npm run build   # production bundle
npm run preview
```

## Deploy (demo link)

After `npm run build`, publish the `dist` folder to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (static site). Connect your Git repo for continuous deployment.

## Evaluation alignment

| Criterion | Approach |
|----------|----------|
| Algorithm | DFS back-edge detection, full-graph sweep |
| Architecture | Normalized graph + recursive view; `useReducer` |
| Edge cases | Delete subtree + scrub `childId` / `linkTargetId` refs |
| Performance | Single record updates, memoized analysis & layout |

---

MIT licensed — use freely for your assessment submission.
