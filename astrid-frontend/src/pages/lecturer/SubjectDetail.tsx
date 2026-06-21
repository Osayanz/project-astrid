import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSubjectDetail, getStudentSubjectTopics,
} from "../../lib/api/overview";
import type { SubjectDetail as SubjectDetailType, StudentRow } from "../../lib/api/overview";
import AppHeader from "../../components/AppHeader";

const RISK_STYLE: Record<string, string> = {
  High:   "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low:    "bg-green-50 text-green-700 border-green-200",
};

export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data,    setData]    = useState<SubjectDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup,   setPopup]   = useState<{ student: StudentRow; weak: string[]; strong: string[] } | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSubjectDetail(id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const openStudent = async (student: StudentRow) => {
    if (!id) return;
    setPopupLoading(true);
    setPopup({ student, weak: [], strong: [] });
    try {
      const t = await getStudentSubjectTopics(id, student.id);
      setPopup({ student, weak: t.weak_topics, strong: t.strong_topics });
    } finally {
      setPopupLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!data)   return <div className="p-6 text-red-600">Subject not found.</div>;

  return (
    <div className="min-h-screen bg-[var(--paper)] p-6">
      <AppHeader title={data.subject_name} />

      <div className="max-w-5xl mx-auto space-y-6">

        <p className="text-sm text-gray-500">
          {data.target_year ? `Target: ${data.target_year}${["st","nd","rd"][data.target_year-1] ?? "th"}-year students` : "All years"}
          {" · "}{data.students.length} eligible students
        </p>

        {/* ── quiz cards ── */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Quizzes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate(`/lecturer/quiz/${q.id}/results`)}
                className="bg-white rounded-2xl border shadow-sm p-4 text-left hover:border-gray-400 transition-colors"
              >
                <p className="text-xs text-gray-400 mb-1">Quiz {q.quiz_number ?? "—"}</p>
                <p className="font-semibold text-gray-900 mb-2">{q.title}</p>
                <p className="text-xs text-gray-500">{q.attempt_count} attempts</p>
              </button>
            ))}
            {data.quizzes.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full">No quizzes in this subject yet.</p>
            )}
          </div>
        </div>

        {/* ── student list ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Students</h2>
            <p className="text-xs text-gray-400">Click a student to see their weak topics</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="px-5 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Year</th>
                <th className="px-3 py-2 font-medium">Quizzes done</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Predicted final</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => openStudent(s)}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {s.year_of_study ? `${s.year_of_study}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{s.quizzes_completed}</td>
                  <td className="px-3 py-3">
                    {s.risk_level ? (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${RISK_STYLE[s.risk_level] ?? ""}`}>
                        {s.risk_level}
                      </span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.predicted_final_score != null ? `${s.predicted_final_score}%` : "—"}
                  </td>
                </tr>
              ))}
              {data.students.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400">
                  No eligible students for this subject's year.
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

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Predicted final</p>
                <p className="text-xl font-semibold">
                  {popup.student.predicted_final_score != null ? `${popup.student.predicted_final_score}%` : "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Risk level</p>
                <p className="text-xl font-semibold">{popup.student.risk_level ?? "—"}</p>
              </div>
            </div>

            {popupLoading ? (
              <p className="text-sm text-gray-400">Loading topics…</p>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-500 mb-2">Weak topics</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {popup.weak.length === 0 && <span className="text-xs text-gray-400">None detected</span>}
                  {popup.weak.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">{t}</span>
                  ))}
                </div>
                <p className="text-xs font-medium text-gray-500 mb-2">Strong topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {popup.strong.length === 0 && <span className="text-xs text-gray-400">None yet</span>}
                  {popup.strong.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
