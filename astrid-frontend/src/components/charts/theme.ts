// Shared palette + helpers for the ASTRID chart components.
// Colours echo the light-theme tokens in index.css so charts feel native.

export const CHART = {
  brand: "#ef6a12",
  brandBright: "#ff9d52",
  brandDeep: "#d65a08",
  gold: "#f0a836",
  ink: "#17171c",
  inkMuted: "#5a6070",
  line: "#e7e9f1",
  lineSoft: "#eef0f6",
  paper2: "#eceef5",
  card: "#ffffff",
};

// Risk colours match the dashboard's red / amber / green language.
export const RISK_COLOR: Record<string, string> = {
  High: "#dc2626",
  Medium: "#d97706",
  Low: "#16a34a",
};
export const RISK_SOFT: Record<string, string> = {
  High: "#fef2f2",
  Medium: "#fffbeb",
  Low: "#f0fdf4",
};
export const RISK_ORDER = ["High", "Medium", "Low"] as const;

// A restrained categorical palette: ember first, then cool complements.
// Orange + indigo/teal reads clean and never muddy.
export const SERIES = [
  "#ef6a12", // ember
  "#6366f1", // indigo
  "#0ea5a4", // teal
  "#f0a836", // gold
  "#ec4899", // pink
  "#64748b", // slate
];

export const seriesColor = (i: number) => SERIES[i % SERIES.length];

// Build "nice" rounded axis ticks for a 0..max range.
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 25, 50, 75, 100];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

// Catmull-Rom → cubic bezier, for smooth (not jittery) progression lines.
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
