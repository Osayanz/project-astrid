import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQuizzes } from "../../lib/api/quizzes";
import { getMyOverview } from "../../lib/api/overview";
import { getUnreadCount } from "../../lib/api/notifications";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import NotificationsPanel from "../../components/NotificationsPanel";
import AppHeader from "../../components/AppHeader";

const RISK_STYLE: Record<string, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-green-50 text-green-700 border-green-200",
};
const SUGGESTIONS: Record<string, string> = {
  Loops: "Practice writing for and while loops from scratch.",
  Functions: "Write small helper functions daily.",
  Arrays: "Practise list slicing and traversal exercises.",
  Strings: "Work through string indexing and methods.",
  Recursion: "Start with base-case problems.",
  "Variables and Identifiers": "Review naming rules and assignment.",
};
const suggest = (t: string) => SUGGESTIONS[t] ?? `Review your notes on ${t}.`;

type Tab = "dashboard" | "notifications";

export default function Dashboard() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "notifications" ? "notifications" : "dashboard");

  const { data: quizzes, isLoading, error } = useQuery({ queryKey: ["quizzes"], queryFn: getQuizzes });
  const { data: overview } = useQuery({ queryKey: ["my-overview"], queryFn: getMyOverview });
  const { data: unread, refetch: refetchUnread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[var(--paper)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto">
        <AppHeader />

        {/* heading row */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-2xl font-semibold">Your dashboard</h1>
          <Link
            to="/chat"
            className="btn-ember inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl"
          >
            Ask Astrid
          </Link>
        </div>

        {/* tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--line)]">
          <button
            onClick={() => setTab("dashboard")}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
            style={tab === "dashboard"
              ? { borderColor: "var(--brand)", color: "var(--brand)" }
              : { borderColor: "transparent", color: "var(--text-muted)" }}
          >
            My dashboard
          </button>
          <button
            onClick={() => setTab("notifications")}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2"
            style={tab === "notifications"
              ? { borderColor: "var(--brand)", color: "var(--brand)" }
              : { borderColor: "transparent", color: "var(--text-muted)" }}
          >
            Notifications
            {!!unread && unread > 0 && (
              <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-[var(--brand)] text-white text-[11px] font-semibold">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        </div>

        {tab === "notifications" ? (
          <div className="max-w-3xl">
            <NotificationsPanel onChange={() => refetchUnread()} />
          </div>
        ) : (
          <>
            {/* per-subject predictions */}
            {overview && overview.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3">
                  My predictions
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {overview.map((s) => (
                    <div key={s.subject_name} className="bg-[var(--card)] rounded-2xl border border-[var(--line)] shadow-sm p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{s.subject_name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {s.quizzes_completed} of {s.quizzes_total} quizzes completed
                          </p>
                        </div>
                        {s.risk_level && (
                          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${RISK_STYLE[s.risk_level] ?? ""}`}>
                            {s.risk_level} risk
                          </span>
                        )}
                      </div>

                      {s.predicted_final_score != null ? (
                        <p className="font-display text-3xl font-semibold mb-3">
                          {s.predicted_final_score}%
                          <span className="text-sm text-[var(--text-muted)] font-normal ml-2">predicted final</span>
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--text-muted)] mb-3">Complete a quiz to get a prediction.</p>
                      )}

                      {s.weak_topics.length > 0 && (
                        <div className="border-t border-[var(--line-soft)] pt-3 mt-1">
                          <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Focus on</p>
                          {s.weak_topics.slice(0, 3).map((t) => (
                            <div key={t} className="flex items-start gap-2 mb-1.5">
                              <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] flex items-center justify-center shrink-0">!</span>
                              <div>
                                <p className="text-xs font-medium">{t}</p>
                                <p className="text-[11px] text-[var(--text-muted)]">{suggest(t)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* available quizzes */}
            <h2 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3">
              Available quizzes
            </h2>
            {isLoading && <p className="text-sm text-[var(--text-muted)]">Loading quizzes…</p>}
            {error && <p className="text-red-600">Failed to load quizzes</p>}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quizzes?.map((quiz: any) => (
                <div key={quiz.id} className="bg-[var(--card)] rounded-2xl shadow-sm p-5 border border-[var(--line)] flex flex-col">
                  <h3 className="text-base font-semibold">{quiz.title}</h3>
                  {quiz.description && <p className="text-[var(--text-muted)] text-sm mt-1 flex-1">{quiz.description}</p>}
                  <button
                    className="btn-ember mt-4 w-full py-2.5 rounded-xl text-sm font-medium"
                    onClick={() => nav(`/quiz/${quiz.id}/play`)}
                  >
                    Start quiz
                  </button>
                </div>
              ))}
              {!isLoading && quizzes?.length === 0 && (
                <div className="col-span-full bg-[var(--card)] rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--text-muted)]">
                  No quizzes available yet. Check back soon.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
