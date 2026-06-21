import { api } from "./client";

export type JourneyQuizPoint = {
  quiz_id: string;
  quiz_number: number | null;
  title: string;
  score_percentage: number | null;
  predicted_final_score: number | null;
  risk_level: "High" | "Medium" | "Low" | null;
  submitted_at: string | null;
};

export type JourneySubject = {
  subject_id: string | null;
  subject_name: string;
  quizzes_total: number;
  quizzes_completed: number;
  average_score: number | null;
  latest_predicted: number | null;
  latest_risk: "High" | "Medium" | "Low" | null;
  weak_topics: string[];
  strong_topics: string[];
  points: JourneyQuizPoint[];
};

export const getMyJourney = async () =>
  (await api.get("/students/me/journey")).data as JourneySubject[];
