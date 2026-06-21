import { useState } from "react";
import { CHART } from "./theme";

export type DonutSlice = { label: string; value: number; color: string };

type Props = {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  /** centre number override; defaults to the total */
  centerValue?: string | number;
};

// Donut with a centred total and a value+percentage legend beside it.
export default function DonutChart({ data, size = 168, centerLabel = "total", centerValue }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = size / 2;
  const stroke = size * 0.16;
  const radius = r - stroke / 2 - 2;
  const C = 2 * Math.PI * radius;

  let offset = 0;
  const segs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = frac * C;
    const seg = { ...d, i, dash: len, gap: C - len, off: offset, frac };
    offset += len;
    return seg;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${centerLabel} donut chart`}>
          <circle cx={r} cy={r} r={radius} fill="none" stroke={CHART.lineSoft} strokeWidth={stroke} />
          {total > 0 &&
            segs.map((s) => (
              <circle
                key={s.label}
                cx={r}
                cy={r}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === s.i ? stroke + 3 : stroke}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.off}
                strokeLinecap="butt"
                transform={`rotate(-90 ${r} ${r})`}
                className="donut-seg"
                style={{ transition: "stroke-width .15s ease", cursor: "default" }}
                onMouseEnter={() => setHover(s.i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-display text-2xl font-semibold text-[var(--text)] leading-none">
            {centerValue ?? total}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] mt-1">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex-1 w-full space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li
              key={d.label}
              className="flex items-center justify-between gap-3 text-sm rounded-lg px-2 py-1 -mx-2"
              style={{ background: hover === i ? CHART.paper2 : "transparent" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="inline-flex items-center gap-2 min-w-0 text-[var(--text)]">
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="text-[var(--text-muted)] tabular-nums shrink-0">
                <span className="font-medium text-[var(--text)]">{d.value}</span> · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
