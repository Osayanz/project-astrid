import { api } from "./client";

export type Quiz = {
  id: string | number;
  title: string;
  description?: string | null;
  duration?: number | null;
};

export async function getQuizzes() {
  const { data } = await api.get<Quiz[]>("/quizzes/");
  return data;
}