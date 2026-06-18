import { api } from "./client";

export async function askChat(question: string) {
  const { data } = await api.post("/chat", { question });
  return data as { answer: string };
}