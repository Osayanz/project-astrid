import type { ReactNode } from "react";

export type LegendItem = { label: string; color: string; dashed?: boolean };

type Props = {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

// Consistent frame for every chart: white card, soft border, display-font
// title, optional subtitle, optional legend row, optional right-side action.
export default function ChartCard({
  title,
  subtitle,
  legend,
  action,
  className = "",
  children,
}: Props) {
  return (
    <section
      className={`bg-[var(--card)] rounded-2xl border border-[var(--line)] shadow-[0_1px_3px_rgba(20,23,40,0.05)] p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold text-[var(--text)] leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      {children}

      {legend && legend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-[var(--line-soft)]">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span
                className="inline-block rounded-full"
                style={
                  l.dashed
                    ? { width: 14, height: 0, borderTop: `2px dashed ${l.color}` }
                    : { width: 9, height: 9, background: l.color }
                }
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// Drop-in empty state that keeps card height steady.
export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-center px-6">
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  );
}
