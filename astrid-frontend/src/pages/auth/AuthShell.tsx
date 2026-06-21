import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--space-950)] text-[var(--ink-100)] relative overflow-hidden flex flex-col">
      <div className="stars" />
      {/* ambient glow bottom */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-30%] w-[80%] max-w-3xl aspect-square rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,122,44,0.18), transparent 62%)", filter: "blur(20px)" }} />

      {/* top brand */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="astrid-wordmark text-[13px] text-[var(--ink-50)]">ASTRID</span>
        </Link>
      </header>

      {/* card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="reveal reveal-1 glass rounded-2xl p-7 shadow-2xl">
            <h1 className="font-display text-2xl font-semibold text-[var(--ink-50)]">{title}</h1>
            <p className="text-sm text-[var(--ink-300)] mt-1">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="text-center mt-5 text-sm text-[var(--ink-300)]">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* shared field styles */
export const fieldLabel = "block text-sm font-medium text-[var(--ink-100)] mb-1.5";
export const fieldInput =
  "glass-input w-full rounded-xl px-3.5 py-2.5 text-sm transition-shadow";
export const fieldError = "text-sm text-[#ff8f6b] mt-1.5";
