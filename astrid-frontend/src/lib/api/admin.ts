import { api } from "./client";

export type AdminYear = {
  year: number;
  student_count: number;
  subject_count: number;
};

export type AdminSubjectCard = {
  id: string;
  name: string;
  description: string | null;
  target_year: number | null;
  quiz_count: number;
  topic_count: number;
};

export type AdminStudentPerf = {
  id: string;
  name: string;
  email: string;
  enrollment_year: number | null;
  year_of_study: number | null;
  quizzes_completed: number;
  avg_score: number | null;
  risk_level: string | null;
  predicted_final_score: number | null;
};

export type AdminSubjectPerformance = {
  subject_id: string;
  subject_name: string;
  target_year: number | null;
  quiz_count: number;
  class_average: number | null;
  students: AdminStudentPerf[];
};

export type CreateStudentPayload = {
  name: string;
  email: string;
  password: string;
  enrollment_year: number;
};

export const createStudent = async (payload: CreateStudentPayload) =>
  (await api.post("/admin/students", payload)).data;

export const getYears = async () =>
  (await api.get("/admin/years")).data as AdminYear[];

export const getYearSubjects = async (year: number) =>
  (await api.get(`/admin/years/${year}/subjects`)).data as AdminSubjectCard[];

export const getSubjectPerformance = async (subjectId: string) =>
  (await api.get(`/admin/subjects/${subjectId}/performance`)).data as
    AdminSubjectPerformance;

export const getAdminStudentTopics = async (subjectId: string, studentId: string) =>
  (await api.get(`/admin/subjects/${subjectId}/students/${studentId}/topics`)).data as
    { weak_topics: string[]; strong_topics: string[] };
