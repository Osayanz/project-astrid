import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSubjectPerformance, getAdminStudentTopics,
  type AdminSubjectPerformance, type AdminStudentPerf,
} from "../../lib/api/admin";
import AppHeader from "../../components/AppHeader";

const RISK_STYLE: Record<string, string> = {
  High:   "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low:    "bg-green-50 text-green-700 border-green-200",
};
const ordinal = (n: number) => `${n}${["st", "nd", "rd"][n - 1] ?? "th"}`;

export default function AdminSubjectPerformance() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminSubjectPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ student: AdminStudentPerf; weak: string[]; strong: string[] } | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSubjectPerformance(id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  const openStudent = async (student: AdminStudentPerf) => {
    if (!id) return;
    setPopupLoading(true);
    setPopup({ student, weak: [], strong: [] });
    try {
      const t = await getAdminStudentTopics(id, student.id);
      setPopup({ student, weak: t.weak_topics, strong: t.strong_topics });
    } finally {
      setPopupLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!data) return <div className="p-6 text-red-600">Subject not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <AppHeader title={data.subject_name} />

      <div className="max-w-5xl mx-auto space-y-5">
        <button
          onClick={() => navigate(data.target_year ? `/admin/year/${data.target_year}` : "/admin")}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back
        </button>

        {/* summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Target year</p>
            <p className="text-2xl font-semibold">
              {data.target_year ? ordinal(data.target_year) : "All"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Students</p>
            <p className="text-2xl font-semibold">{data.students.length}</p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Quizzes</p>
            <p className="text-2xl font-semibold">{data.quiz_count}</p>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Class average</p>
            <p className="text-2xl font-semibold">
              {data.class_average != null ? `${data.class_average}%` : "—"}
            </p>
          </div>
        </div>

        {/* student table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Student performance</h2>
            <p className="text-xs text-gray-400">Click a student to see weak & strong topics</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="px-5 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Quizzes done</th>
                <th className="px-3 py-2 font-medium">Avg score</th>
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
                  <td className="px-3 py-3 text-gray-600">{s.quizzes_completed}</td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {s.avg_score != null ? `${s.avg_score}%` : "—"}
                  </td>
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
                  No students for this subject's year.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* student popup */}
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
                <p className="text-[11px] text-gray-400">Avg score</p>
                <p className="text-lg font-semibold">
                  {popup.student.avg_score != null ? `${popup.student.avg_score}%` : "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-gray-400">Predicted</p>
                <p className="text-lg font-semibold">
                  {popup.student.predicted_final_score != null ? `${popup.student.predicted_final_score}%` : "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[11px] text-gray-400">Risk</p>
                <p className="text-lg font-semibold">{popup.student.risk_level ?? "—"}</p>
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
