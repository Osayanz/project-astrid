import { useState } from "react";
import { CHART, smoothPath, niceTicks } from "./theme";
import { useElementWidth } from "./useElementWidth";

export type LineSeries = {
  name: string;
  color: string;
  dashed?: boolean;
  /** null = gap (no data at that x) */
  points: (number | null)[];
};

type Props = {
  labels: string[];
  series: LineSeries[];
  height?: number;
  yMax?: number;
  yUnit?: string;
  /** fill a soft area under the first series */
  area?: boolean;
};

// Smooth, responsive line chart. Renders at the container's real width so
// axis text stays crisp; supports multiple series, gaps, hover read-out.
export default function LineChart({
  labels,
  series,
  height = 260,
  yMax,
  yUnit = "",
  area = true,
}: Props) {
  const { ref, width } = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 38;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const w = Math.max(width, 280);
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const allVals = series.flatMap((s) => s.points.filter((p): p is number => p != null));
  const dataMax = allVals.length ? Math.max(...allVals) : 100;
  const top = yMax ?? (dataMax <= 100 ? 100 : Math.ceil(dataMax / 10) * 10);
  const ticks = niceTicks(top, 4);
  const realTop = ticks[ticks.length - 1] || top;

  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => padT + innerH - (v / realTop) * innerH;

  return (
    <div ref={ref} className="w-full" style={{ minHeight: height }}>
      {width > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label="Progression line chart"
          onMouseLeave={() => setHover(null)}
        >
          {/* gridlines + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padL}
                x2={w - padR}
                y1={y(t)}
                y2={y(t)}
                stroke={CHART.lineSoft}
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y(t) + 4}
                textAnchor="end"
                fontSize={11}
                fill={CHART.inkMuted}
                fontFamily="Poppins, sans-serif"
              >
                {t}
              </text>
            </g>
          ))}

          {/* x labels */}
          {labels.map((lab, i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 9}
              textAnchor="middle"
              fontSize={11}
              fill={CHART.inkMuted}
              fontFamily="Poppins, sans-serif"
            >
              {lab}
            </text>
          ))}

          {/* hover guide */}
          {hover != null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padT}
              y2={padT + innerH}
              stroke={CHART.line}
              strokeWidth={1}
            />
          )}

          {/* area under first series */}
          {area &&
            series[0] &&
            (() => {
              const pts = series[0].points
                .map((v, i) => (v == null ? null : { x: x(i), y: y(v) }))
                .filter((p): p is { x: number; y: number } => p != null);
              if (pts.length < 2) return null;
              const line = smoothPath(pts);
              const areaD = `${line} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`;
              return (
                <>
                  <defs>
                    <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={series[0].color} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={series[0].color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#lc-area)" className="lc-area" />
                </>
              );
            })()}

          {/* series lines */}
          {series.map((s) => {
            const pts = s.points
              .map((v, i) => (v == null ? null : { x: x(i), y: y(v) }))
              .filter((p): p is { x: number; y: number } => p != null);
            if (pts.length === 0) return null;
            return (
              <path
                key={s.name}
                d={smoothPath(pts)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? "5 5" : undefined}
                className="lc-line"
              />
            );
          })}

          {/* dots */}
          {series.map((s) =>
            s.points.map((v, i) =>
              v == null ? null : (
                <circle
                  key={`${s.name}-${i}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={hover === i ? 4.5 : 3}
                  fill="#fff"
                  stroke={s.color}
                  strokeWidth={2}
                />
              )
            )
          )}

          {/* hover hit-areas */}
          {labels.map((_, i) => (
            <rect
              key={i}
              x={x(i) - (innerW / Math.max(n - 1, 1)) / 2}
              y={padT}
              width={innerW / Math.max(n - 1, 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}

      {/* hover read-out */}
      {hover != null && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-medium text-[var(--text)]">{labels[hover]}</span>
          {series.map((s) => {
            const v = s.points[hover];
            if (v == null) return null;
            return (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.name}: <span className="font-medium text-[var(--text)]">{v}{yUnit}</span>
              </span>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes lcDraw { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }
        .lc-line { stroke-dasharray: 1200; animation: lcDraw 1.1s cubic-bezier(.22,1,.36,1) forwards; }
        .lc-line[stroke-dasharray="5 5"] { stroke-dasharray: 5 5; animation: none; }
        .lc-area { opacity: 0; animation: lcFade .9s ease forwards .3s; }
        @keyframes lcFade { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .lc-line, .lc-area { animation: none !important; stroke-dasharray: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
