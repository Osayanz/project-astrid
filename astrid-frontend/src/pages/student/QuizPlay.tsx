import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api/client";
import { startAttempt, submitAttempt } from "../../lib/api/attempts";

type Question = {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  topic_tag?: string;
  points?: number;
};

type SavedAnswer = {
  selected_option: string;
  time_spent_sec: number;
  answered_at: string;
};

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function QuizPlay() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions]     = useState<Question[]>([]);
  const [attemptId, setAttemptId]     = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]         = useState<Record<string, SavedAnswer>>({});
  const [selected, setSelected]       = useState<string | null>(null);
  const [elapsed, setElapsed]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  // when the current question was shown to the student
  const questionStartRef = useRef<number>(Date.now());
  // interval for the live timer display
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── load quiz ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        if (!id) { setError("Quiz ID not found."); return; }
        const res  = await startAttempt(id);
        const aId  = res.attempt_id || res.id || "";
        setAttemptId(aId);

        const qRes = await api.get(`/quizzes/${id}/questions`);
        if (Array.isArray(qRes.data) && qRes.data.length > 0) {
          setQuestions(qRes.data);
        } else {
          setError("No questions found for this quiz.");
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // ── start per-question timer whenever currentIndex changes ─────────────
  useEffect(() => {
    if (questions.length === 0) return;

    // reset selection to whatever was previously saved for this question
    const q = questions[currentIndex];
    setSelected(answers[q.id]?.selected_option ?? null);

    // reset elapsed & start counting
    questionStartRef.current = Date.now();
    setElapsed(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - questionStartRef.current) / 1000));
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, questions]);

  // ── select an option (does NOT advance yet — student confirms with Next) ─
  const handleSelect = (option: string) => {
    setSelected(option);
  };

  // ── save answer + move to next question ───────────────────────────────
  const handleNext = () => {
    if (!selected) return;
    const q = questions[currentIndex];
    const time_spent_sec = Math.floor((Date.now() - questionStartRef.current) / 1000);

    setAnswers(prev => ({
      ...prev,
      [q.id]: {
        selected_option: selected,
        time_spent_sec,
        answered_at: new Date().toISOString(),
      },
    }));

    setCurrentIndex(i => i + 1);
  };

  // ── submit all answers ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selected) return;

    // save the final question's answer before submitting
    const q = questions[currentIndex];
    const time_spent_sec = Math.floor((Date.now() - questionStartRef.current) / 1000);
    const finalAnswers = {
      ...answers,
      [q.id]: {
        selected_option: selected,
        time_spent_sec,
        answered_at: new Date().toISOString(),
      },
    };

    try {
      setSubmitting(true);
      const payload = Object.entries(finalAnswers).map(([question_id, a]) => ({
        question_id,
        selected_option: a.selected_option,
        time_spent_sec:  a.time_spent_sec,
        answered_at:     a.answered_at,
      }));

      const result = await submitAttempt({ attempt_id: attemptId, answers: payload });
      navigate(`/quiz/${id}/result`, { state: result });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to submit quiz.");
      setSubmitting(false);
    }
  };

  // ── derived state ──────────────────────────────────────────────────────
  const isLast    = currentIndex === questions.length - 1;
  const progress  = questions.length > 0
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;
  const current   = questions[currentIndex];

  const optionLabels: Record<string, string> = current ? {
    A: current.option_a,
    B: current.option_b,
    C: current.option_c,
    D: current.option_d,
  } : {};

  // ── render ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading quiz...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow p-6 max-w-md w-full text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="rounded-lg bg-[var(--brand)] text-white px-4 py-2 hover:opacity-90"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );

  if (!current) return null;

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">

      {/* ── top bar ── */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
        {/* live per-question timer */}
        <span className="text-sm font-mono text-gray-700">
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
          {String(elapsed % 60).padStart(2, "0")}
        </span>
      </div>

      {/* ── progress bar ── */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-[var(--brand)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── question card ── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-2xl">

          {/* topic tag */}
          {current.topic_tag && (
            <span className="inline-block text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-0.5 mb-4">
              {current.topic_tag}
            </span>
          )}

          <p className="text-lg font-medium mb-6 leading-relaxed">
            {current.question_text}
          </p>

          {/* options */}
          <div className="space-y-3">
            {OPTIONS.map(label => (
              <button
                key={label}
                onClick={() => handleSelect(label)}
                className={`w-full text-left flex items-center gap-4 rounded-xl border p-4 transition-all
                  ${selected === label
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-gray-200 bg-white hover:border-gray-400"
                  }`}
              >
                <span className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-sm font-medium
                  ${selected === label
                    ? "border-white text-white"
                    : "border-gray-300 text-gray-500"
                  }`}>
                  {label}
                </span>
                <span className="text-sm">{optionLabels[label]}</span>
              </button>
            ))}
          </div>

          {/* error inline */}
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          {/* navigation */}
          <div className="mt-8 flex items-center justify-between">
            {/* answered count */}
            <span className="text-xs text-gray-400">
              {Object.keys(answers).length} answered
            </span>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="rounded-lg bg-[var(--brand)] text-white px-8 py-3 font-medium hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? "Submitting..." : "Submit quiz"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!selected}
                className="rounded-lg bg-[var(--brand)] text-white px-8 py-3 font-medium hover:opacity-90 disabled:opacity-40"
              >
                Next question →
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
