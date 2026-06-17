import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api/client";

type PredictionResult = {
  predicted_final_score: number;
  risk_label:            "High" | "Medium" | "Low";
  confidence:            "low" | "medium" | "high";
  weak_topics:           string[];
  strong_topics:         string[];
  stage:                 number;
  prediction_status:     string;
};

const RISK_CONFIG = {
  High:   { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",    icon: "⚠", label: "High risk" },
  Medium: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  icon: "◎", label: "Medium risk" },
  Low:    { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700",  icon: "✓", label: "Low risk" },
};

const STAGE_MSG: Record<number, string> = {
  1: "Based on Quiz 1 only — prediction improves as you complete more quizzes.",
  2: "Based on Quiz 1 + 2 — getting more accurate.",
  3: "Based on Quiz 1 + 2 + 3 — high confidence.",
  4: "Based on all 4 quizzes — most accurate prediction.",
};

const TOPIC_SUGGESTIONS: Record<string, string> = {
  "Loops":                  "Practice writing for and while loops from scratch.",
  "Recursion":              "Work through base-case problems on LeetCode.",
  "Functions":              "Write small helper functions daily to build intuition.",
  "Arrays":                 "Practise array traversal and slicing exercises.",
  "OOP Basics":             "Build a small class-based project — e.g. a bank account.",
  "Inheritance":            "Extend a base class and override at least one method.",
  "Exception Handling":     "Wrap 3 different functions with try/except blocks.",
  "Data Structures":        "Implement a stack and a queue from scratch.",
  "Sorting and Searching":  "Implement bubble sort and binary search by hand.",
  "Dynamic Programming":    "Start with the Fibonacci memoisation problem.",
  "Debugging":              "Use print statements and a debugger to trace a bug.",
  "Code Tracing":           "Trace through code on paper before running it.",
};

function getSuggestion(topic: string): string {
  return TOPIC_SUGGESTIONS[topic] ?? `Review your notes and practice more questions on ${topic}.`;
}

export default function QuizResult() {
  const location = useNavigate() && useLocation();
  const navigate  = useNavigate();
  const state     = (location as any).state ?? {};

  const attemptId      = state.attempt_id;
  const score          = state.score          ?? 0;
  const maxScore       = state.max_score       ?? 30;
  const scorePct       = state.score_percentage ?? Math.round((score / maxScore) * 100);
  const ruleRisk       = state.risk_level       ?? null;

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!attemptId) { setLoading(false); return; }

    const fetchPrediction = async () => {
      try {
        const { data } = await api.post(`/predictions/${attemptId}`);
        setPrediction(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? "Could not load prediction.");
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [attemptId]);

  const riskLabel  = prediction?.risk_label ?? ruleRisk ?? "Medium";
  const riskCfg    = RISK_CONFIG[riskLabel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.Medium;
  const weakTopics = prediction?.weak_topics   ?? [];
  const strongTopics = prediction?.strong_topics ?? [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── header ── */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <span className="font-medium text-gray-900">Quiz complete</span>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Back to dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* ── score card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Your score</p>
              <p className="text-5xl font-semibold text-gray-900">
                {score}
                <span className="text-2xl text-gray-400 font-normal"> / {maxScore}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Percentage</p>
              <p className="text-3xl font-semibold text-gray-900">{scorePct}%</p>
            </div>
          </div>

          {/* progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full bg-black transition-all duration-500"
              style={{ width: `${scorePct}%` }}
            />
          </div>
        </div>

        {/* ── ML prediction card ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span className="text-sm">Calculating your prediction…</span>
            </div>
          </div>
        ) : prediction ? (
          <div className={`rounded-2xl border shadow-sm p-6 ${riskCfg.bg} ${riskCfg.border}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Predicted final exam score</p>
                <p className={`text-4xl font-semibold ${riskCfg.text}`}>
                  {prediction.predicted_final_score}%
                </p>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${riskCfg.badge}`}>
                {riskCfg.icon} {riskCfg.label}
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-1">
              {STAGE_MSG[prediction.stage] ?? ""}
              {prediction.confidence === "low" && " · Low confidence — complete more quizzes for a better estimate."}
              {prediction.confidence === "high" && " · High confidence estimate."}
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* ── weak topics ── */}
        {weakTopics.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-1">Topics to work on</h2>
            <p className="text-xs text-gray-400 mb-4">
              Based on your answers across all quizzes completed so far.
            </p>
            <div className="space-y-3">
              {weakTopics.slice(0, 5).map((topic) => (
                <div key={topic} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center shrink-0">!</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{topic}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{getSuggestion(topic)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── strong topics ── */}
        {strongTopics.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Your strengths</h2>
            <div className="flex flex-wrap gap-2">
              {strongTopics.slice(0, 6).map((topic) => (
                <span
                  key={topic}
                  className="text-xs px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700"
                >
                  ✓ {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── what this means ── */}
        {prediction && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-900 mb-3">What this means</h2>
            <div className="space-y-2 text-sm text-gray-600">
              {riskLabel === "High" && (
                <>
                  <p>Your current performance suggests the final exam may be challenging. The good news — there's still time to turn this around.</p>
                  <p className="font-medium text-gray-800 mt-2">Recommended: focus on your weak topics above and attempt practice problems daily.</p>
                </>
              )}
              {riskLabel === "Medium" && (
                <>
                  <p>You're on track but there's room to improve. Strengthening your weak topics could move you into the Low risk category.</p>
                  <p className="font-medium text-gray-800 mt-2">Recommended: revisit the topics flagged above before the next quiz.</p>
                </>
              )}
              {riskLabel === "Low" && (
                <>
                  <p>You're performing well. Keep this up and the final exam should be within reach.</p>
                  <p className="font-medium text-gray-800 mt-2">Recommended: continue at this pace and don't neglect the harder topics.</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── actions ── */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full rounded-xl bg-black text-white py-3 font-medium hover:opacity-90"
        >
          Back to dashboard
        </button>

      </div>
    </div>
  );
}
