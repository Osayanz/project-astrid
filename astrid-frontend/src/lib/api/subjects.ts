import { api } from "./client";
 
export type Subject = {
  id: string;
  name: string;
  description?: string;
  target_year?: number | null;
  topic_count: number;
};
 
export type Topic = {
  id: string;
  name: string;
  subject_id: string;
};
 
export async function createSubject(name: string, description?: string, target_year?: number) {
  const { data } = await api.post("/subjects", { name, description, target_year });
  return data as Subject;
}
 
export async function listSubjects() {
  const { data } = await api.get("/subjects");
  return data as Subject[];
}
 
export async function deleteSubject(id: string) {
  const { data } = await api.delete(`/subjects/${id}`);
  return data;
}
 
export async function addTopic(subjectId: string, name: string) {
  const { data } = await api.post(`/subjects/${subjectId}/topics`, { name });
  return data as Topic;
}
 
export async function listTopics(subjectId: string) {
  const { data } = await api.get(`/subjects/${subjectId}/topics`);
  return data as Topic[];
}
 
export async function deleteTopic(topicId: string) {
  const { data } = await api.delete(`/topics/${topicId}`);
  return data;
}
 