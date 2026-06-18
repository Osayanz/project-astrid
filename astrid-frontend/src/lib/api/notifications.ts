import { api } from "./client";

export type NotificationType = "weak_topics" | "new_quiz" | "card";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  severity: "yellow" | "red" | null;
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
};

export const getNotifications = async () =>
  (await api.get("/notifications")).data as AppNotification[];

export const getUnreadCount = async () =>
  ((await api.get("/notifications/unread-count")).data as { count: number }).count;

export const markRead = async (id: string) =>
  (await api.post(`/notifications/${id}/read`)).data;

export const markAllRead = async () =>
  (await api.post("/notifications/read-all")).data;

export const sendCard = async (
  studentId: string,
  severity: "yellow" | "red",
  message?: string
) =>
  (await api.post(`/lecturer/students/${studentId}/card`, { severity, message }))
    .data;
