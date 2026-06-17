import { useQuery } from "@tanstack/react-query";
import { getQuizzes } from "../../lib/api/quizzes";
import { getMyOverview } from "../../lib/api/overview";
import { useNavigate } from "react-router-dom";
import { token } from "../../lib/auth/token";

const RISK_STYLE: Record<string, string> = {
  High:   "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low:    "bg-green-50 text-green-700 border-green-200",
};

const SUGGESTIONS: Record<string, string> = {
  "Loops": "Practice writing for and while loops from scratch.",
  "Functions": "Write small helper functions daily.",
  "Arrays": "Practise list slicing and traversal exercises.",
  "Strings": "Work through string indexing and methods.",
  "Recursion": "Start with base-case problems.",
  "Variables and Identifiers": "Review naming rules and assignment.",
};
const suggest = (t: string) => SUGGESTIONS[t] ?? `Review your notes on ${t}.`;

export default function Dashboard() {
  const nav = useNavigate();

  const { data: quizzes, isLoading, error } = useQuery({
    queryKey: ["quizzes"],
    queryFn: getQuizzes,
  });

  const { data: overview } = useQuery({
    queryKey: ["my-overview"],
    queryFn: getMyOverview,
  });

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Student Dashboard</h1>
        <button
          className="rounded-lg border px-3 py-2 hover:bg-gray-100"
          onClick={() => { token.clear(); nav("/login"); }}
        >
          Logout
        </button>
      </div>

      {/* ── per-subject predictions ── */}
      {overview && overview.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            My predictions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {overview.map((s) => (
              <div key={s.subject_name} className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{s.subject_name}</p>
                    <p className="text-xs text-gray-400">
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
                  <p className="text-3xl font-semibold text-gray-900 mb-3">
                    {s.predicted_final_score}%
                    <span className="text-sm text-gray-400 font-normal ml-2">predicted final</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mb-3">Complete a quiz to get a prediction.</p>
                )}

                {s.weak_topics.length > 0 && (
                  <div className="border-t pt-3 mt-1">
                    <p className="text-xs font-medium text-gray-500 mb-2">Focus on</p>
                    {s.weak_topics.slice(0, 3).map((t) => (
                      <div key={t} className="flex items-start gap-2 mb-1.5">
                        <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] flex items-center justify-center shrink-0">!</span>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{t}</p>
                          <p className="text-[11px] text-gray-500">{suggest(t)}</p>
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

      {/* ── available quizzes ── */}
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Available quizzes
      </h2>
      {isLoading && <p>Loading quizzes...</p>}
      {error && <p className="text-red-600">Failed to load quizzes</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quizzes?.map((quiz: any) => (
          <div key={quiz.id} className="bg-white rounded-xl shadow p-4 border">
            <h2 className="text-lg font-semibold">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-gray-600 text-sm mt-1">{quiz.description}</p>
            )}
            <button
              className="mt-4 w-full bg-black text-white py-2 rounded-lg hover:opacity-90"
              onClick={() => nav(`/quiz/${quiz.id}/play`)}
            >
              Start Quiz
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
