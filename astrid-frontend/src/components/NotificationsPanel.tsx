import { useEffect, useState } from "react";
import {
  getNotifications, markRead, markAllRead,
  type AppNotification,
} from "../lib/api/notifications";

const TYPE_META: Record<string, { icon: string; tint: string }> = {
  weak_topics: { icon: "📊", tint: "bg-blue-50 border-blue-200" },
  new_quiz:    { icon: "📝", tint: "bg-indigo-50 border-indigo-200" },
  card:        { icon: "⚠", tint: "bg-gray-50 border-gray-200" },
};

const CARD_TINT: Record<string, string> = {
  yellow: "bg-amber-50 border-amber-300",
  red:    "bg-red-50 border-red-300",
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationsPanel({
  onChange,
}: {
  onChange?: () => void;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getNotifications()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onMarkRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await markRead(id);
    onChange?.();
  };

  const onMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllRead();
    onChange?.();
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Notifications</h2>
          <p className="text-xs text-gray-400">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkAll}
            className="text-xs font-medium text-gray-600 hover:text-black underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading && <p className="px-5 py-6 text-sm text-gray-400">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-gray-400">
          No notifications yet. Alerts about your quizzes and topics will appear here.
        </p>
      )}

      <ul className="divide-y">
        {items.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.card;
          const tint =
            n.type === "card" && n.severity
              ? CARD_TINT[n.severity] ?? meta.tint
              : meta.tint;
          return (
            <li
              key={n.id}
              className={`px-5 py-4 flex gap-3 ${n.is_read ? "opacity-70" : ""}`}
            >
              <div
                className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-base ${tint}`}
              >
                {n.type === "card" && n.severity === "yellow" ? "🟨"
                  : n.type === "card" && n.severity === "red" ? "🟥"
                  : meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm">{n.title}</p>
                  {!n.is_read && (
                    <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
                {n.body && <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-gray-400">{timeAgo(n.created_at)}</span>
                  {!n.is_read && (
                    <button
                      onClick={() => onMarkRead(n.id)}
                      className="text-[11px] text-gray-500 hover:text-black underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
