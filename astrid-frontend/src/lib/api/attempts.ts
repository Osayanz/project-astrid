import { api } from "./client";

export async function startAttempt(quizId: string) {
  const { data } = await api.post("/attempts/start", { quiz_id: quizId });
  return data;
}

export async function submitAttempt(payload: {
  attempt_id: string;
  answers: {
    question_id:    string;
    selected_option: string;
    time_spent_sec?: number;
    answered_at?:    string;
  }[];
}) {
  const { data } = await api.post("/attempts/submit", payload);
  return data;
}

export async function getPrediction(attemptId: string) {
  const { data } = await api.post(`/predictions/${attemptId}`);
  return data;
}