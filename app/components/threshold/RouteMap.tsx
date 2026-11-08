import type { LatLng } from "@shared/engine/geo";
import { miles } from "@/lib/format";
import { distanceKm } from "@shared/engine/geo";

const W = 360;
const H = 400;
const PAD = 64;

/**
 * A quiet map: you, the place, and the straight line between them.
 * Positions come from real coordinates; no streets are drawn, and the distance is straight-line.
 */
export function RouteMap({ from, fromLabel, to, toLabel }: { from: LatLng; fromLabel: string; to: LatLng | null; toLabel: string | null }) {
  const lat0 = from.lat;
  const project = (p: LatLng) => ({ x: (p.lng - from.lng) * Math.cos((lat0 * Math.PI) / 180), y: from.lat - p.lat });
  const a = { x: 0, y: 0 };
  const b = to ? project(to) : null;
  const spanX = Math.abs(b?.x ?? 0);
  const spanY = Math.abs(b?.y ?? 0);
  const scale = b ? Math.min((W - PAD * 2) / Math.max(spanX, 1e-6), (H - PAD * 2) / Math.max(spanY, 1e-6), 40000) : 0;
  const cx = W / 2 - (b ? (b.x * scale) / 2 : 0);
  const cy = H / 2 - (b ? (b.y * scale) / 2 : 0);
  const at = (p: { x: number; y: number }) => ({ x: cx + p.x * scale, y: cy + p.y * scale });
  const pa = at(a);
  const pb = b ? at(b) : null;
  const km = to ? distanceKm(from, to) : null;
  const grid = Array.from({ length: 15 }, (_, i) => i * 36 - 90);
  const label = `You in ${fromLabel}${toLabel && km !== null ? `, ${toLabel}, ${miles(km)} away in a straight line` : ""}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label} className="size-full">
      <g stroke="var(--color-th-line)" strokeWidth="1" opacity="0.55">
        {grid.map((n) => (
          <g key={n}>
            <line x1={-120} x2={W + 120} y1={n} y2={n} />
            <line y1={-120} y2={H + 120} x1={n} x2={n} />
          </g>
        ))}
      </g>

      {pb ? (
        <>
          <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="var(--color-th-amber)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" />
          <circle cx={pb.x} cy={pb.y} r="34" fill="var(--color-th-amber)" opacity="0.14" />
          <path d={`M${pb.x} ${pb.y + 2}c-9-11-13-17-13-23a13 13 0 1 1 26 0c0 6-4 12-13 23z`} fill="var(--color-th-amber)" />
          <circle cx={pb.x} cy={pb.y - 21} r="4.5" fill="var(--color-th-ink)" />
          {toLabel ? (
            <text x={pb.x} y={pb.y + 22} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-th-text)" stroke="var(--color-th-ground)" strokeWidth="4" paintOrder="stroke">
              {toLabel}
            </text>
          ) : null}
          {km !== null ? (
            <g transform={`translate(${(pa.x + pb.x) / 2 + 22} ${(pa.y + pb.y) / 2})`}>
              <rect x="-27" y="-13" width="54" height="26" rx="13" fill="var(--color-th-surface)" stroke="var(--color-th-line)" />
              <text textAnchor="middle" y="4.5" fontSize="12" fontWeight="600" fill="var(--color-th-text)">
                {miles(km)}
              </text>
            </g>
          ) : null}
        </>
      ) : null}

      <circle cx={pa.x} cy={pa.y} r="16" fill="var(--color-th-raised)" stroke="var(--color-th-line)" />
      <circle cx={pa.x} cy={pa.y} r="6" fill="var(--color-th-text)" />
      <text x={pa.x} y={pa.y + 34} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-th-text)" stroke="var(--color-th-ground)" strokeWidth="4" paintOrder="stroke">
        You · {fromLabel}
      </text>
    </svg>
  );
}
