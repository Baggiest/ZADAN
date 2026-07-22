"use client";

import { useMemo } from "react";

/** Escalation bands (% of gazetteer cities reporting activity). */
export const ESCALATION_BANDS = [
  { max: 3, color: "#00E676", label: "<3%" },
  { max: 10, color: "#A3E635", label: "3–10%" },
  { max: 20, color: "#FACC15", label: "10–20%" },
  { max: 40, color: "#FF9F1C", label: "20–40%" },
  { max: Infinity, color: "#FF1E1E", label: ">40%" },
] as const;

/** Dial scale: 0–50% of cities (red band starts at 40%). */
const GAUGE_MAX_PCT = 50;

export function escalationLevel(pct: number): number {
  if (pct < 3) return 0;
  if (pct < 10) return 1;
  if (pct < 20) return 2;
  if (pct < 40) return 3;
  return 4;
}

function needleAngle(pct: number): number {
  const t = Math.min(Math.max(pct, 0), GAUGE_MAX_PCT) / GAUGE_MAX_PCT;
  return -90 + t * 180;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

interface EscalationMeterProps {
  hitCities: number;
  totalCities: number;
  className?: string;
}

export function EscalationMeter({
  hitCities,
  totalCities,
  className = "",
}: EscalationMeterProps) {
  const pct = totalCities > 0 ? (hitCities / totalCities) * 100 : 0;
  const level = escalationLevel(pct);
  const band = ESCALATION_BANDS[level];
  const angle = needleAngle(pct);

  const segments = useMemo(() => {
    const edges = [0, 3, 10, 20, 40, GAUGE_MAX_PCT];
    return edges.slice(0, -1).map((startPct, i) => {
      const endPct = edges[i + 1];
      const a0 = -90 + (startPct / GAUGE_MAX_PCT) * 180;
      const a1 = -90 + (endPct / GAUGE_MAX_PCT) * 180;
      return {
        d: arcPath(50, 48, 36, a0, a1),
        color: ESCALATION_BANDS[i].color,
        active: i === level,
      };
    });
  }, [level]);

  const tip = polar(50, 48, 30, angle);

  return (
    <div
      className={`rounded-md border border-[#1F2937]/90 bg-[#0B1220]/90 px-2.5 py-2 backdrop-blur-sm ${className}`}
      title={`${hitCities} of ${totalCities} cities reporting (${pct.toFixed(1)}%)`}
    >
      <p className="mb-0.5 text-center text-[9px] uppercase tracking-wider text-[#9CA3AF]">
        Zadan-Meter™
      </p>
      <svg
        viewBox="0 0 100 62"
        className="h-[72px] w-[132px]"
        role="img"
        aria-label={`Escalation meter ${pct.toFixed(1)} percent`}
      >
        <path
          d={arcPath(50, 48, 36, -90, 90)}
          fill="none"
          stroke="#1F2937"
          strokeWidth={9}
          strokeLinecap="butt"
        />
        {segments.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill="none"
            stroke={s.color}
            strokeWidth={s.active ? 10 : 8}
            strokeLinecap="butt"
            opacity={s.active ? 1 : 0.5}
          />
        ))}
        <line
          x1={50}
          y1={48}
          x2={tip.x}
          y2={tip.y}
          stroke="#E5E7EB"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={50} cy={48} r={3.5} fill="#E5E7EB" />
        <circle cx={50} cy={48} r={1.6} fill={band.color} />
      </svg>
      <div className="mt-0.5 text-center">
        <p
          className="font-mono text-sm font-semibold tabular-nums"
          style={{ color: band.color }}
        >
          {pct.toFixed(1)}%
        </p>
        <p className="text-[10px] text-[#9CA3AF]">
          {hitCities}/{totalCities || "—"} cities
        </p>
      </div>
    </div>
  );
}
