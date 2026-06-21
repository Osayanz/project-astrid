import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getQuizOverview, getAttemptWeakTopics,
} from "../../lib/api/overview";
import type { QuizOverview, QuizStudentRow } from "../../lib/api/overview";
import AppHeader from "../../components/AppHeader";
import { sendCard } from "../../lib/api/notifications";

const RISK_STYLE: Record<string, string> = {
  High:   "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low:    "bg-green-50 text-green-700 border-green-200",
};

export default function QuizResults() {
  const { id } = useParams();

  const [data,    setData]    = useState<QuizOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup,   setPopup]   = useState<{ student: QuizStudentRow; topics: { topic: string; wrong_percentage: number }[] } | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [cardMsg, setCardMsg] = useState("");
  const [cardSending, setCardSending] = useState<"yellow" | "red" | null>(null);
  const [cardSent, setCardSent] = useState<string | null>(null);

  const issueCard = async (severity: "yellow" | "red") => {
    if (!popup) return;
    setCardSending(severity);
    setCardSent(null);
    try {
      await sendCard(popup.student.student_id, severity, cardMsg.trim() || undefined);
      setCardSent(`${severity === "yellow" ? "Yellow" : "Red"} card sent to ${popup.student.name}.`);
      setCardMsg("");
    } catch {
      setCardSent("Failed to send card. Please try again.");
    } finally {
      setCardSending(null);
    }
  };

  useEffect(() => {
    if (!id) return;
    getQuizOverview(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  const openStudent = async (student: QuizStudentRow) => {
    setPopupLoading(true);
    setPopup({ student, topics: [] });
    setCardMsg("");
    setCardSent(null);
    try {
      const t = await getAttemptWeakTopics(student.attempt_id);
      setPopup({ student, topics: t.filter((x) => x.wrong_percentage > 0) });
    } finally {
      setPopupLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!data)   return <div className="p-6 text-red-600">Quiz not found.</div>;

  const pctDone = data.eligible_total > 0
    ? Math.round((data.attempted / data.eligible_total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--paper)] p-6">
      <AppHeader title={data.title} />

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── summary cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Completed</p>
            <p className="text-2xl font-semibold">{data.attempted}<span className="text-sm text-gray-400 font-normal"> / {data.eligible_total}</span></p>
            <p className="text-xs text-gray-400 mt-1">{pctDone}% of class</p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Class average</p>
            <p className="text-2xl font-semibold">{data.avg_score != null ? `${data.avg_score}%` : "—"}</p>
            <p className="text-xs text-gray-400 mt-1">quiz score</p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Avg prediction</p>
            <p className="text-2xl font-semibold">{data.avg_predicted != null ? `${data.avg_predicted}%` : "—"}</p>
            <p className="text-xs text-gray-400 mt-1">predicted final</p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Risk split</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">H {data.risk_counts.High ?? 0}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">M {data.risk_counts.Medium ?? 0}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">L {data.risk_counts.Low ?? 0}</span>
            </div>
          </div>
        </div>

        {/* ── student list ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Students who completed this quiz</h2>
            <p className="text-xs text-gray-400">Click a student for detail</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="px-5 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Quiz score</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Predicted final</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr
                  key={s.attempt_id}
                  onClick={() => openStudent(s)}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-3 py-3 font-medium">{s.score_percentage != null ? `${s.score_percentage}%` : "—"}</td>
                  <td className="px-3 py-3">
                    {s.risk_level ? (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${RISK_STYLE[s.risk_level] ?? ""}`}>
                        {s.risk_level}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 font-medium">{s.predicted_final_score != null ? `${s.predicted_final_score}%` : "—"}</td>
                </tr>
              ))}
              {data.students.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                  No students have completed this quiz yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── student popup ── */}
      {popup && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">{popup.student.name}</p>
                <p className="text-xs text-gray-400">{popup.student.email}</p>
              </div>
              <button onClick={() => setPopup(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-gray-400">Quiz score</p>
                <p className="text-lg font-semibold">{popup.student.score_percentage != null ? `${popup.student.score_percentage}%` : "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-gray-400">Predicted</p>
                <p className="text-lg font-semibold">{popup.student.predicted_final_score != null ? `${popup.student.predicted_final_score}%` : "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-gray-400">Risk</p>
                <p className="text-lg font-semibold">{popup.student.risk_level ?? "—"}</p>
              </div>
            </div>

            <p className="text-xs font-medium text-gray-500 mb-2">Weak topics in this quiz</p>
            {popupLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : popup.topics.length === 0 ? (
              <p className="text-sm text-gray-400">No weak topics — all answered well.</p>
            ) : (
              <div className="space-y-1.5">
                {popup.topics.map((t) => (
                  <div key={t.topic} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{t.topic}</span>
                    <span className="text-xs text-red-600 font-medium">{t.wrong_percentage}% wrong</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── warning card ── */}
            <div className="border-t mt-5 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Send a warning card</p>
              <textarea
                value={cardMsg}
                onChange={(e) => setCardMsg(e.target.value)}
                rows={2}
                placeholder="Optional message (a default warning is used if left blank)…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => issueCard("yellow")}
                  disabled={cardSending !== null}
                  className="flex-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 py-2 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
                >
                  {cardSending === "yellow" ? "Sending…" : "🟨 Yellow card"}
                </button>
                <button
                  onClick={() => issueCard("red")}
                  disabled={cardSending !== null}
                  className="flex-1 rounded-lg border border-red-300 bg-red-50 text-red-800 py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  {cardSending === "red" ? "Sending…" : "🟥 Red card"}
                </button>
              </div>
              {cardSent && (
                <p className="text-xs text-gray-600 mt-2">{cardSent}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
