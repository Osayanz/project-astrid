import { api } from "./client";

export type QuizAnalytics = {
  total_attempts: number;
  class_average: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_duration_sec: number;
};
export type WeakTopic = {
    topic: string;
    total_answers: number;
    wrong_answers: number;
    wrong_percentage: number;
  };

export async function getQuizAnalytics(quizId: string) {
  const res = await api.get<QuizAnalytics>(`/quizzes/${quizId}/analytics`);
  return res.data;
}
export async function getWeakTopics(quizId: string) {
    const res = await api.get<WeakTopic[]>(`/quizzes/${quizId}/weak-topics`);
    return res.data;
  }
  export async function getAttemptWeakTopics(attemptId: string) {
    const res = await api.get<WeakTopic[]>(`/attempts/${attemptId}/weak-topics`);
    return res.data;
  }