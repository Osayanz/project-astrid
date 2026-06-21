import { useState } from "react";
import { CHART, niceTicks } from "./theme";
import { useElementWidth } from "./useElementWidth";

export type BarSeries = {
  name: string;
  color: string;
  values: (number | null)[];
  /** optional per-bar colours (single-series only, e.g. risk buckets) */
  perBarColors?: string[];
};

type Props = {
  labels: string[];
  series: BarSeries[];
  height?: number;
  yMax?: number;
  yUnit?: string;
  /** show numeric value above each bar */
  showValues?: boolean;
};

// Bar chart that auto-switches between single and grouped (clustered) bars.
export default function BarChart({
  labels,
  series,
  height = 260,
  yMax,
  yUnit = "",
  showValues = true,
}: Props) {
  const { ref, width } = useElementWidth();
  const [hover, setHover] = useState<string | null>(null);

  const padL = 38;
  const padR = 12;
  const padT = 16;
  const padB = labels.some((l) => l.length > 8) ? 42 : 28;
  const w = Math.max(width, 280);
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const allVals = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const dataMax = allVals.length ? Math.max(...allVals) : 100;
  const top = yMax ?? (dataMax <= 100 ? 100 : Math.ceil(dataMax / 10) * 10);
  const ticks = niceTicks(top, 4);
  const realTop = ticks[ticks.length - 1] || top;

  const groups = labels.length;
  const groupW = innerW / Math.max(groups, 1);
  const sCount = series.length;
  const barGap = 0.18 * groupW;
  const innerSlot = groupW - barGap;
  const barW = innerSlot / sCount;

  const y = (v: number) => padT + innerH - (v / realTop) * innerH;

  return (
    <div ref={ref} className="w-full" style={{ minHeight: height }}>
      {width > 0 && (
        <svg width={w} height={height} role="img" aria-label="Bar chart" onMouseLeave={() => setHover(null)}>
          {/* gridlines + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={CHART.lineSoft} strokeWidth={1} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={CHART.inkMuted} fontFamily="Poppins, sans-serif">
                {t}
              </text>
            </g>
          ))}

          {labels.map((lab, gi) => {
            const gx = padL + gi * groupW + barGap / 2;
            const isHover = hover === lab;
            return (
              <g key={lab} onMouseEnter={() => setHover(lab)}>
                {/* hover backdrop */}
                <rect
                  x={padL + gi * groupW}
                  y={padT}
                  width={groupW}
                  height={innerH}
                  fill={isHover ? CHART.paper2 : "transparent"}
                  opacity={0.5}
                  rx={6}
                />
                {series.map((s, si) => {
                  const v = s.values[gi];
                  if (v == null) return null;
                  const bx = gx + si * barW;
                  const bh = (v / realTop) * innerH;
                  const by = padT + innerH - bh;
                  const fill = s.perBarColors?.[gi] ?? s.color;
                  return (
                    <g key={s.name}>
                      <rect
                        x={bx + barW * 0.12}
                        y={by}
                        width={barW * 0.76}
                        height={Math.max(bh, 1)}
                        rx={Math.min(5, barW * 0.3)}
                        fill={fill}
                        className="bar-rect"
                        style={{ transformOrigin: `${bx}px ${padT + innerH}px` }}
                      />
                      {showValues && sCount <= 2 && (
                        <text
                          x={bx + barW / 2}
                          y={by - 5}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={600}
                          fill={CHART.ink}
                          fontFamily="Poppins, sans-serif"
                        >
                          {Math.round(v * 10) / 10}
                          {yUnit}
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* x label (truncate long) */}
                <text
                  x={padL + gi * groupW + groupW / 2}
                  y={height - (padB > 30 ? 22 : 9)}
                  textAnchor="middle"
                  fontSize={11}
                  fill={CHART.inkMuted}
                  fontFamily="Poppins, sans-serif"
                >
                  {lab.length > 14 ? lab.slice(0, 13) + "…" : lab}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <style>{`
        @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .bar-rect { animation: barGrow .7s cubic-bezier(.22,1,.36,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .bar-rect { animation: none !important; } }
      `}</style>
    </div>
  );
}
