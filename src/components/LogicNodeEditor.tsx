import { memo } from 'react';
import type { CycleAnalysis, LogicGraph, NodeId } from '../types/graph';
import type { GraphAction } from '../lib/graphReducer';

interface Props {
  graph: LogicGraph;
  nodeId: NodeId;
  depth: number;
  dispatch: (a: GraphAction) => void;
  analysis: CycleAnalysis;
  linkOptions: NodeId[];
}

export const LogicNodeEditor = memo(function LogicNodeEditor({
  graph,
  nodeId,
  depth,
  dispatch,
  analysis,
  linkOptions,
}: Props) {
  const n = graph.nodes[nodeId];
  if (!n) return null;

  const isRoot = nodeId === graph.rootId;
  const cyclic = analysis.cyclicNodeIds.has(nodeId);
  const child = n.childId ? graph.nodes[n.childId] : null;

  const indentStyle = { marginLeft: Math.min(depth, 12) * 12 };

  return (
    <div className="relative" style={indentStyle}>
      {depth > 0 && (
        <div
          className="absolute -left-3 top-8 bottom-8 w-px bg-gradient-to-b from-cyan-400/40 via-violet-400/30 to-transparent"
          aria-hidden
        />
      )}

      <div
        className={[
          'group relative mb-4 rounded-2xl border bg-slate-900/50 p-4 shadow-xl backdrop-blur-md transition-colors',
          cyclic
            ? 'border-rose-500/70 ring-2 ring-rose-500/30'
            : 'border-white/10 hover:border-cyan-400/25',
        ].join(' ')}
      >
        {cyclic && (
          <div className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg">
            Cycle
          </div>
        )}

        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block font-display text-xs font-medium uppercase tracking-wider text-slate-400">
              Condition
            </label>
            <textarea
              value={n.condition}
              onChange={(e) =>
                dispatch({ type: 'SET_CONDITION', id: nodeId, condition: e.target.value })
              }
              rows={2}
              className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-sm text-slate-100 outline-none ring-cyan-400/0 transition-[box-shadow,border-color] placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="Describe this branch…"
            />
          </div>

          <div className="w-full min-w-[200px] max-w-xs sm:w-52">
            <label className="mb-1 block font-display text-xs font-medium uppercase tracking-wider text-slate-400">
              Link jump
            </label>
            <select
              value={n.linkTargetId ?? ''}
              onChange={(e) =>
                dispatch({
                  type: 'SET_LINK',
                  id: nodeId,
                  targetId: e.target.value === '' ? null : e.target.value,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-violet-400/40"
            >
              <option value="">— none —</option>
              {linkOptions
                .filter((id) => id !== nodeId)
                .map((id) => {
                  const lbl = graph.nodes[id]?.condition ?? '';
                  const short = lbl.length > 42 ? `${lbl.slice(0, 42)}…` : lbl || id.slice(0, 8);
                  return (
                    <option key={id} value={id}>
                      {short}
                    </option>
                  );
                })}
            </select>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">
              Creates a non-tree edge · DFS validates loops
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-2 sm:ml-auto">
            {!n.childId && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADD_CHILD', parentId: nodeId })}
                className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-sky-600/90 px-3 py-2 font-display text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 active:scale-[0.98]"
              >
                + Nested child
              </button>
            )}
            {!isRoot && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'REMOVE_BRANCH', id: nodeId })}
                className="rounded-xl border border-white/15 bg-slate-950/50 px-3 py-2 font-display text-xs text-rose-200/90 transition hover:border-rose-400/40 hover:bg-rose-950/40"
              >
                Remove branch
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-slate-500">
          <span className="rounded-md bg-slate-800/80 px-2 py-0.5">id:{nodeId.slice(0, 8)}…</span>
          {n.childId && <span className="text-cyan-400/80">→ child</span>}
          {n.linkTargetId && <span className="text-violet-300/80">⇝ link</span>}
        </div>
      </div>

      {child && (
        <LogicNodeEditor
          graph={graph}
          nodeId={child.id}
          depth={depth + 1}
          dispatch={dispatch}
          analysis={analysis}
          linkOptions={linkOptions}
        />
      )}
    </div>
  );
});
