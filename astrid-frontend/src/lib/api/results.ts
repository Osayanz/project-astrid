import { api } from "./client";

export type QuizResultRow = {
  attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score: number;
  max_score: number;
  submitted_at?: string | null;

  attempt_no?: number | null;
  duration_sec?: number | null;
  score_percentage?: number | null;
  risk_level?: string | null;
  prediction_status?: string | null;
};

export async function getQuizResults(quizId: string) {
  const { data } = await api.get<QuizResultRow[]>(`/quizzes/${quizId}/results`);
  return data;
}