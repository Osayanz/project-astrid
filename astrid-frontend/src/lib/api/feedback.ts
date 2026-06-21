import { api } from "./client";

export type FeedbackContext = "quiz_completed" | "quiz_created";

export const submitFeedback = async (
  context: FeedbackContext,
  rating: number,
  opts?: { quizId?: string; comment?: string }
) =>
  (await api.post("/feedback", {
    context,
    rating,
    quiz_id: opts?.quizId ?? null,
    comment: opts?.comment ?? null,
  })).data;

export const checkFeedback = async (
  context: FeedbackContext,
  quizId?: string
) => {
  const params: Record<string, string> = { context };
  if (quizId) params.quiz_id = quizId;
  const { data } = await api.get("/feedback/check", { params });
  return (data as { submitted: boolean }).submitted;
};
