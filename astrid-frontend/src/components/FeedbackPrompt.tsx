import { useEffect, useState } from "react";
import {
  submitFeedback, checkFeedback,
  type FeedbackContext,
} from "../lib/api/feedback";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function FeedbackPrompt({
  context,
  quizId,
  title,
  className = "",
}: {
  context: FeedbackContext;
  quizId?: string;
  title?: string;
  className?: string;
}) {
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState]     = useState<"loading" | "ready" | "done" | "hidden">("loading");
  const [saving, setSaving]   = useState(false);

  // don't re-prompt if they've already rated this
  useEffect(() => {
    let alive = true;
    checkFeedback(context, quizId)
      .then((already) => alive && setState(already ? "hidden" : "ready"))
      .catch(() => alive && setState("ready"));
    return () => { alive = false; };
  }, [context, quizId]);

  if (state === "loading" || state === "hidden") return null;

  const heading =
    title ?? (context === "quiz_completed"
      ? "How was this quiz?"
      : "How was creating this quiz?");

  const send = async () => {
    if (rating < 1) return;
    setSaving(true);
    try {
      await submitFeedback(context, rating, { quizId, comment: comment.trim() || undefined });
      setState("done");
    } catch {
      // keep the form open so they can retry
    } finally {
      setSaving(false);
    }
  };

  if (state === "done") {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center ${className}`}>
        <p className="text-2xl mb-1">🙏</p>
        <p className="text-sm font-medium text-gray-900">Thanks for your feedback!</p>
        <p className="text-xs text-gray-400 mt-0.5">You rated {rating} / 5.</p>
      </div>
    );
  }

  const active = hover || rating;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
      <h2 className="text-sm font-medium text-gray-900 mb-1">{heading}</h2>
      <p className="text-xs text-gray-400 mb-4">Tap a star to rate your experience.</p>

      {/* stars */}
      <div className="flex items-center gap-1.5 mb-2" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="text-3xl leading-none transition-transform hover:scale-110 focus:outline-none"
            style={{ color: n <= active ? "#f5b301" : "#d1d5db" }}
          >
            {n <= active ? "★" : "☆"}
          </button>
        ))}
        {active > 0 && (
          <span className="ml-2 text-sm text-gray-500">{LABELS[active]}</span>
        )}
      </div>

      {/* comment + submit appear once a rating is picked */}
      {rating > 0 && (
        <div className="mt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Add a comment (optional)…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand) resize-none"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={send}
              disabled={saving}
              className="rounded-lg bg-(--brand) text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Sending…" : "Submit feedback"}
            </button>
            <button
              onClick={() => setState("hidden")}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
