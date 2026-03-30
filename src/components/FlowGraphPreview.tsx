import { useMemo } from 'react';
import type { CycleAnalysis, LogicGraph } from '../types/graph';
import { computeTreeLayout } from '../lib/layoutGraph';
import { edgeKey } from '../lib/dfsCycleDetection';

const W = 920;
const H = 420;
const PAD = 56;

function curvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function FlowGraphPreview({
  graph,
  analysis,
  activeId,
}: {
  graph: LogicGraph;
  analysis: CycleAnalysis;
  activeId: string | null;
}) {
  const { nodes, rootId } = graph;

  const scaled = useMemo(() => {
    const raw = computeTreeLayout(graph, {
      nodeW: 120,
      nodeH: 56,
      gapX: 90,
      gapY: 72,
    });
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of raw.values()) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    if (!Number.isFinite(minX)) {
      minX = maxX = minY = maxY = 0;
    }
    const bw = Math.max(40, maxX - minX + 200);
    const bh = Math.max(40, maxY - minY + 140);
    const scale = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh, 1.1);
    const ox = PAD + (W - PAD * 2 - bw * scale) / 2 - minX * scale;
    const oy = PAD + (H - PAD * 2 - bh * scale) / 2 - minY * scale;

    const scaled = new Map<string, { x: number; y: number }>();
    for (const [id, p] of raw.entries()) {
      scaled.set(id, { x: p.x * scale + ox, y: p.y * scale + oy });
    }
    return scaled;
  }, [graph]);

  const cyclicEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of analysis.cyclicEdges) s.add(edgeKey(e));
    return s;
  }, [analysis.cyclicEdges]);

  const edges = useMemo(() => {
    const list: Array<{
      from: string;
      to: string;
      kind: 'child' | 'link';
      d: string;
      bad: boolean;
    }> = [];
    for (const n of Object.values(nodes)) {
      const a = scaled.get(n.id);
      if (!a) continue;
      if (n.childId) {
        const b = scaled.get(n.childId);
        if (b) {
          const d = curvePath(a.x + 52, a.y, b.x - 52, b.y);
          list.push({
            from: n.id,
            to: n.childId,
            kind: 'child',
            d,
            bad: cyclicEdgeSet.has(edgeKey({ from: n.id, to: n.childId, kind: 'child' })),
          });
        }
      }
      if (n.linkTargetId) {
        const b = scaled.get(n.linkTargetId);
        if (b) {
          const lift = n.linkTargetId === n.childId ? 28 : 0;
          const d = curvePath(a.x, a.y + 26 + lift, b.x, b.y - 26 - lift);
          list.push({
            from: n.id,
            to: n.linkTargetId,
            kind: 'link',
            d,
            bad: cyclicEdgeSet.has(
              edgeKey({ from: n.id, to: n.linkTargetId, kind: 'link' }),
            ),
          });
        }
      }
    }
    return list;
  }, [nodes, scaled, cyclicEdgeSet]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(56,189,248,0.12), transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(168,85,247,0.14), transparent 42%)`,
        }}
      />
      <svg
        className="block w-full"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Logic graph preview"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="edgeOk" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(94,234,212,0.4)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.85)" />
          </linearGradient>
          <linearGradient id="edgeBad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(251,113,133,0.5)" />
            <stop offset="100%" stopColor="rgba(244,63,94,0.95)" />
          </linearGradient>
        </defs>

        {edges.map((e, i) => (
          <path
            key={`${e.from}-${e.to}-${e.kind}-${i}`}
            d={e.d}
            fill="none"
            strokeWidth={e.bad ? 3.2 : 2}
            stroke={e.bad ? 'url(#edgeBad)' : 'url(#edgeOk)'}
            strokeDasharray={e.kind === 'link' ? '7 6' : undefined}
            opacity={e.bad ? 1 : 0.85}
            filter={e.bad ? 'url(#glow)' : undefined}
            className={e.bad ? 'animate-pulse' : ''}
          />
        ))}

        {Object.values(nodes).map((n) => {
          const p = scaled.get(n.id);
          if (!p) return null;
          const isRoot = n.id === rootId;
          const cyclic = analysis.cyclicNodeIds.has(n.id);
          const active = activeId === n.id;
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`}>
              <rect
                x={-58}
                y={-28}
                width={116}
                height={56}
                rx={14}
                fill={
                  cyclic
                    ? 'rgba(244,63,94,0.18)'
                    : active
                      ? 'rgba(56,189,248,0.22)'
                      : 'rgba(15,23,42,0.72)'
                }
                stroke={
                  cyclic
                    ? 'rgba(251,113,133,0.95)'
                    : active
                      ? 'rgba(34,211,238,0.9)'
                      : 'rgba(148,163,184,0.35)'
                }
                strokeWidth={cyclic || active ? 2 : 1}
              />
              <text
                textAnchor="middle"
                y={5}
                className="fill-slate-100 font-mono text-[10px]"
              >
                {isRoot ? 'ROOT' : n.id.slice(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] text-slate-500">
        Solid = child edge · Dashed = link jump
      </p>
    </div>
  );
}
