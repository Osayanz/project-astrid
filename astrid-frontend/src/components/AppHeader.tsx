import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "../lib/auth/session";
import { token } from "../lib/auth/token";
import { getUnreadCount } from "../lib/api/notifications";

type Role = "student" | "lecturer" | "admin";

type NavItem = { label: string; to: string; match?: (p: string) => boolean };

const NAV: Record<Role, NavItem[]> = {
  student: [
    { label: "Dashboard", to: "/dashboard" },
    { label: "My Journey", to: "/journey" },
    { label: "Ask Astrid", to: "/chat" },
  ],
  lecturer: [
    { label: "Dashboard", to: "/lecturer", match: (p) => p === "/lecturer" },
    { label: "Quizzes", to: "/lecturer/quizzes", match: (p) => p.startsWith("/lecturer/quiz") || p.startsWith("/add-question") || p.startsWith("/create-quiz") },
    { label: "Subjects", to: "/lecturer/subjects", match: (p) => p.startsWith("/lecturer/subject") },
    { label: "Journey", to: "/lecturer/journey" },
    { label: "Create quiz", to: "/create-quiz" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin", match: (p) => p === "/admin" || p.startsWith("/admin/year") || p.startsWith("/admin/subject") },
    { label: "Overall Journey", to: "/admin/journey" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  lecturer: "Lecturer",
  admin: "Administrator",
};

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="astrid-wordmark text-[13px] text-[var(--text)]">ASTRID</span>
    </div>
  );
}

export default function AppHeader({ title }: { title?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const role = (session?.role as Role) ?? "student";
  const items = NAV[role] ?? [];

  const { data: unread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: getUnreadCount,
    enabled: role === "student",
    refetchInterval: 30000,
  });

  const isActive = (item: NavItem) =>
    item.match ? item.match(location.pathname) : location.pathname === item.to;

  const logout = () => {
    token.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mb-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] px-4 sm:px-5 py-3 shadow-[0_1px_3px_rgba(20,23,40,0.05)]">
        {/* left: brand + role */}
        <div className="flex items-center gap-4 min-w-0">
          <BrandMark />
          <span className="hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--brand-soft)", color: "var(--brand-deep)" }}>
            {ROLE_LABEL[role]}
          </span>
        </div>

        {/* center: nav links */}
        <nav className="flex-1 hidden md:flex items-center justify-center gap-7 text-sm overflow-x-auto">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="nav-link whitespace-nowrap" data-active={isActive(it)}>
              {it.label}
            </Link>
          ))}
        </nav>

        {/* right: bell + logout */}
        <div className="flex items-center gap-2">
          {role === "student" && (
            <button
              onClick={() => navigate("/dashboard?tab=notifications")}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-lg border border-[var(--line)] flex items-center justify-center hover:bg-[var(--paper-2)] transition-colors"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {!!unread && unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-[var(--brand)] text-white text-[10px] font-semibold flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          )}
          <button
            onClick={logout}
            className="text-sm font-medium px-3.5 py-2 rounded-lg border border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--paper-2)] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* mobile nav row */}
      {items.length > 1 && (
        <nav className="md:hidden mt-2 flex items-center gap-5 text-sm overflow-x-auto px-1">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="nav-link whitespace-nowrap py-1" data-active={isActive(it)}>
              {it.label}
            </Link>
          ))}
        </nav>
      )}

      {title && (
        <h1 className="mt-5 font-display text-2xl font-semibold text-[var(--text)]">{title}</h1>
      )}
    </div>
  );
}
