import { api } from "./client";

export type SubjectOverview = {
  subject_id: string | null;
  subject_name: string;
  quizzes_completed: number;
  quizzes_total: number;
  predicted_final_score: number | null;
  risk_level: "High" | "Medium" | "Low" | null;
  weak_topics: string[];
  strong_topics: string[];
};

export type QuizCard = { id: string; title: string; quiz_number: number | null; attempt_count: number };

export type StudentRow = {
  id: string; name: string; email: string;
  enrollment_year: number | null; year_of_study: number | null;
  quizzes_completed: number;
  risk_level: string | null; predicted_final_score: number | null;
};

export type SubjectDetail = {
  subject_id: string; subject_name: string; target_year: number | null;
  quizzes: QuizCard[]; students: StudentRow[];
};

export type QuizStudentRow = {
  student_id: string; attempt_id: string; name: string; email: string;
  score_percentage: number | null; risk_level: string | null;
  predicted_final_score: number | null;
};

export type QuizOverview = {
  quiz_id: string; title: string; quiz_number: number | null;
  eligible_total: number; attempted: number;
  avg_score: number | null; avg_predicted: number | null;
  risk_counts: Record<string, number>;
  students: QuizStudentRow[];
};

export const getMyOverview = async () =>
  (await api.get("/students/me/overview")).data as SubjectOverview[];

export const getSubjectDetail = async (subjectId: string) =>
  (await api.get(`/subjects/${subjectId}/detail`)).data as SubjectDetail;

export const getStudentSubjectTopics = async (subjectId: string, studentId: string) =>
  (await api.get(`/subjects/${subjectId}/students/${studentId}/weak-topics`)).data as
    { weak_topics: string[]; strong_topics: string[] };

export const getQuizOverview = async (quizId: string) =>
  (await api.get(`/quizzes/${quizId}/overview`)).data as QuizOverview;

export const getAttemptWeakTopics = async (attemptId: string) =>
  (await api.get(`/attempts/${attemptId}/weak-topics`)).data as
    { topic: string; wrong_percentage: number }[];