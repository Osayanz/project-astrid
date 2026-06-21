import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string; // left accent bar colour
};

// Compact metric tile: big value, small label, optional hint + accent.
export default function StatTile({ label, value, hint, accent = "var(--brand)" }: Props) {
  return (
    <div className="relative bg-[var(--card)] rounded-2xl border border-[var(--line)] shadow-[0_1px_3px_rgba(20,23,40,0.05)] p-4 overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-semibold text-[var(--text)] mt-1 leading-none">{value}</p>
      {hint && <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{hint}</p>}
    </div>
  );
}
