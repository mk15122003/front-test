import { useMemo, useReducer, useState, useCallback, useEffect } from 'react';
import { LogicNodeEditor } from './components/LogicNodeEditor';
import { FlowGraphPreview } from './components/FlowGraphPreview';
import {
  createInitialGraph,
  graphReducer,
  type GraphAction,
} from './lib/graphReducer';
import { analyzeCyclesWithDfs } from './lib/dfsCycleDetection';
import type { LogicGraph, NodeId } from './types/graph';

function collectAllIds(graph: LogicGraph): NodeId[] {
  return Object.keys(graph.nodes);
}

function nextSimStep(
  graph: LogicGraph,
  current: NodeId,
  preferLink: boolean,
): NodeId | null {
  const n = graph.nodes[current];
  if (!n) return null;
  if (preferLink && n.linkTargetId) return n.linkTargetId;
  if (n.childId) return n.childId;
  if (!preferLink && n.linkTargetId) return n.linkTargetId;
  return null;
}

export default function App() {
  const [graph, dispatch] = useReducer(graphReducer, undefined, createInitialGraph);
  const analysis = useMemo(() => analyzeCyclesWithDfs(graph), [graph]);
  const allIds = useMemo(() => collectAllIds(graph), [graph]);

  const [simActive, setSimActive] = useState(false);
  const [simCursor, setSimCursor] = useState<NodeId | null>(null);
  const [preferLinkFirst, setPreferLinkFirst] = useState(true);
  const [trail, setTrail] = useState<NodeId[]>([]);

  const startSim = useCallback(() => {
    if (analysis.hasCycle) return;
    setSimActive(true);
    setSimCursor(graph.rootId);
    setTrail([graph.rootId]);
  }, [analysis.hasCycle, graph.rootId]);

  const stepSim = useCallback(() => {
    setSimCursor((cur) => {
      if (!cur) return null;
      const next = nextSimStep(graph, cur, preferLinkFirst);
      if (next) setTrail((t) => [...t, next]);
      return next;
    });
  }, [graph, preferLinkFirst]);

  const resetSim = useCallback(() => {
    setSimActive(false);
    setSimCursor(null);
    setTrail([]);
  }, []);

  const handleDispatch = useCallback((a: GraphAction) => {
    dispatch(a);
    resetSim();
  }, [resetSim]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!analysis.hasCycle && simActive && simCursor) stepSim();
      }
      if (e.key === 'Escape') resetSim();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [analysis.hasCycle, simActive, simCursor, stepSim, resetSim]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'logic-graph.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [graph]);

  const importJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        try {
          const data = JSON.parse(text) as LogicGraph;
          if (
            !data?.nodes ||
            typeof data.rootId !== 'string' ||
            !data.nodes[data.rootId]
          ) {
            return;
          }
          for (const id of Object.keys(data.nodes)) {
            const n = data.nodes[id];
            if (
              !n ||
              n.id !== id ||
              typeof n.condition !== 'string' ||
              (n.childId !== null && typeof n.childId !== 'string') ||
              (n.linkTargetId !== null && typeof n.linkTargetId !== 'string')
            ) {
              return;
            }
          }
          handleDispatch({ type: 'LOAD_GRAPH', graph: data });
        } catch {
          /* ignore invalid file */
        }
      });
    };
    input.click();
  }, [handleDispatch]);

  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 -z-10 animate-shimmer bg-[length:400%_100%]"
        style={{
          backgroundImage: `linear-gradient(110deg, #020617 0%, #0f172a 20%, #1e1b4b 40%, #0c4a6e 55%, #020617 80%)`,
        }}
      />

      <header className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-400/90">
              Recursive logic engine
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Logic Flow Mapper
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Build infinitely nested conditions, wire cross-node jumps, and validate execution graphs in real time with
              depth-first cycle detection.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="rounded-xl border border-white/15 bg-slate-900/80 px-4 py-2.5 font-display text-sm text-slate-200 transition hover:border-white/25 hover:bg-slate-800/90"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={importJson}
              className="rounded-xl border border-white/15 bg-slate-900/80 px-4 py-2.5 font-display text-sm text-slate-200 transition hover:border-white/25 hover:bg-slate-800/90"
            >
              Import JSON
            </button>
            <button
              type="button"
              onClick={() => handleDispatch({ type: 'RESET' })}
              className="rounded-xl border border-white/15 bg-slate-900/80 px-4 py-2.5 font-display text-sm text-slate-200 transition hover:border-white/25 hover:bg-slate-800/90"
            >
              New graph
            </button>
            <div
              className={[
                'flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-xs',
                analysis.hasCycle
                  ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                  : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  analysis.hasCycle ? 'animate-pulse bg-rose-400' : 'bg-emerald-400',
                ].join(' ')}
              />
              {analysis.hasCycle ? 'Invalid loop detected (DFS)' : 'Graph is acyclic'}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-medium text-white">Logic tree</h2>
            <span className="font-mono text-[11px] text-slate-500">
              {allIds.length} nodes
            </span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 shadow-2xl backdrop-blur">
            <LogicNodeEditor
              graph={graph}
              nodeId={graph.rootId}
              depth={0}
              dispatch={handleDispatch}
              analysis={analysis}
              linkOptions={allIds}
            />
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div>
            <h2 className="mb-2 font-display text-lg font-medium text-white">Live graph</h2>
            <FlowGraphPreview graph={graph} analysis={analysis} activeId={simCursor} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-5 shadow-xl backdrop-blur-md">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-slate-300">
              Simulate logic
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Walks the graph from root. With “Link first”, jumps take priority over the nested child when both exist.
              <span className="mt-1 block text-[10px] text-slate-600">
                Shortcut: Space to step (when running) · Esc to clear
              </span>
            </p>

            <label className="mt-4 flex cursor-pointer items-center gap-2 font-mono text-xs text-slate-400">
              <input
                type="checkbox"
                checked={preferLinkFirst}
                onChange={(e) => setPreferLinkFirst(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-cyan-500"
              />
              Prefer link edge on each step
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={analysis.hasCycle}
                onClick={startSim}
                className={[
                  'rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition',
                  analysis.hasCycle
                    ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                    : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:brightness-110',
                ].join(' ')}
              >
                {analysis.hasCycle ? 'Simulation locked (loop)' : 'Start simulation'}
              </button>
              <button
                type="button"
                disabled={!simActive || !simCursor || analysis.hasCycle}
                onClick={stepSim}
                className="rounded-xl border border-white/15 bg-slate-800/80 px-4 py-2.5 font-display text-sm text-slate-100 transition enabled:hover:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Step
              </button>
              <button
                type="button"
                onClick={resetSim}
                className="rounded-xl border border-white/10 px-4 py-2.5 font-display text-sm text-slate-400 transition hover:text-white"
              >
                Clear
              </button>
            </div>

            {trail.length > 0 && (
              <ol className="mt-4 max-h-40 overflow-auto rounded-xl border border-white/5 bg-slate-950/60 p-3 font-mono text-[10px] text-slate-400">
                {trail.map((id, i) => (
                  <li key={`${id}-${i}`} className={id === simCursor ? 'text-cyan-300' : ''}>
                    {i + 1}. {id.slice(0, 8)}… — {graph.nodes[id]?.condition?.slice(0, 48) ?? ''}
                  </li>
                ))}
                {!simCursor && trail.length > 0 && (
                  <li className="text-emerald-400/90">— terminal —</li>
                )}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-500">
            <strong className="font-display text-slate-400">Architecture</strong>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Normalized <code className="text-slate-400">Record&lt;id, Node&gt;</code> for O(1) updates</li>
              <li>Structural <code className="text-slate-400">childId</code> + optional <code className="text-slate-400">linkTargetId</code></li>
              <li>DFS back-edge detection flags nodes &amp; edges used in loops</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
