import { useState, useRef, useEffect, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { askChat } from "../../lib/api/chat";
import { token } from "../../lib/auth/token";
import { getSession } from "../../lib/auth/session";
import { getUnreadCount } from "../../lib/api/notifications";

type Msg = { role: "user" | "bot"; text: string };

const SUGGESTIONS = [
  "How am I doing overall?",
  "What are my weak topics?",
  "What should I study next?",
  "Why is my risk level what it is?",
];

function AstridOrb({ size = 30 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, var(--ember-bright), var(--ember-deep))",
        boxShadow: "0 0 16px rgba(255,122,44,0.6)",
      }}
    >
      <span className="astrid-wordmark" style={{ color: "#fff", fontSize: size * 0.46, lineHeight: 1, letterSpacing: 0 }}>
        A
      </span>
    </span>
  );
}

/* ── lightweight markdown for bot replies (lists, bold, paragraphs) ── */
function inline(s: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p) || /^__[^_]+__$/.test(p))
      return <strong key={i} className="font-semibold text-[var(--ink-50)]">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p))
      return <code key={i} className="px-1 py-0.5 rounded bg-white/10 text-[var(--gold)] text-[13px]">{p.slice(1, -1)}</code>;
    return p;
  });
}

function normalize(text: string): string {
  let t = text.replace(/\r\n/g, "\n").trim();
  if (!t.includes("\n")) {
    if ((t.match(/(?:^|\s)\d+\.\s+\S/g) || []).length >= 2) {
      t = t.replace(/\s(\d+)\.\s+/g, (_m, n) => `\n${n}. `);
    }
    if ((t.match(/(?:^|\s)[•·]\s+\S/g) || []).length >= 2) {
      t = t.replace(/\s[•·]\s+/g, "\n- ");
    }
  }
  return t;
}

function MessageContent({ text }: { text: string }) {
  const lines = normalize(text).split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) { i++; continue; }
    if (/^\s*\d+[.)]\s+/.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(<ol key={key++} className="list-decimal pl-5 space-y-1 marker:text-[var(--ember-bright)]">{items.map((it, x) => <li key={x} className="pl-1">{inline(it)}</li>)}</ol>);
      continue;
    }
    if (/^\s*[-*•]\s+/.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ""));
      blocks.push(<ul key={key++} className="list-disc pl-5 space-y-1 marker:text-[var(--ember-bright)]">{items.map((it, x) => <li key={x} className="pl-1">{inline(it)}</li>)}</ul>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(\d+[.)]|[-*•])\s+/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key++}>{inline(para.join(" "))}</p>);
  }
  return <div className="space-y-2">{blocks}</div>;
}

export default function Chat() {
  const navigate = useNavigate();
  const session = getSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  });

  const started = messages.length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (started && el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, started]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const { answer } = await askChat(question);
      setMessages((m) => [...m, { role: "bot", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong reaching the server." }]);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    token.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen bg-[var(--space-950)] text-[var(--ink-100)] flex flex-col relative overflow-hidden">
      <div className="stars" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-34%] w-[90%] max-w-4xl aspect-square rounded-full pointer-events-none"
           style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,122,44,0.14), transparent 60%)", filter: "blur(24px)" }} />

      {/* ── dark nav bar ── */}
      <header className="relative z-20 shrink-0 border-b border-white/10 bg-[var(--space-900)]/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* brand + role */}
          <div className="flex items-center gap-3 min-w-0">
            <AstridOrb size={28} />
            <span className="astrid-wordmark text-[13px] text-[var(--ink-50)]">ASTRID</span>
            <span className="hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,122,44,0.14)", color: "var(--ember-bright)", border: "1px solid rgba(255,122,44,0.3)" }}>
              {(session?.role ?? "student") === "student" ? "Student" : (session?.role as string)}
            </span>
          </div>

          {/* center links */}
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <Link to="/dashboard" className="nav-link-dark">Dashboard</Link>
            <Link to="/chat" className="nav-link-dark" data-active={true}>Ask Astrid</Link>
          </nav>

          {/* right: bell + logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard?tab=notifications")}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-lg border border-white/12 flex items-center justify-center hover:bg-white/5 transition-colors"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-300)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {!!unread && unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-[var(--ember)] text-white text-[10px] font-semibold flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <button onClick={logout} className="text-sm font-medium px-3.5 py-2 rounded-lg border border-white/12 text-[var(--ink-300)] hover:text-[var(--ink-50)] hover:bg-white/5 transition-colors">
              Logout
            </button>
          </div>
        </div>
        {/* mobile links */}
        <nav className="md:hidden flex items-center gap-5 text-sm px-4 pb-3">
          <Link to="/dashboard" className="nav-link-dark">Dashboard</Link>
          <Link to="/chat" className="nav-link-dark" data-active={true}>Ask Astrid</Link>
        </nav>
      </header>

      {/* ── body ── */}
      {!started ? (
        /* centered welcome state */
        <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="reveal reveal-1">
            <AstridOrb size={64} />
          </div>
          <h1 className="reveal reveal-2 font-display text-2xl sm:text-3xl font-semibold text-[var(--ink-50)] mt-6">
            How can I help with your studies?
          </h1>
          <p className="reveal reveal-3 text-sm text-[var(--ink-300)] mt-2 max-w-md">
            Ask about your scores, weak topics, risk level, or what to focus on next — grounded in your own results.
          </p>
          <div className="reveal reveal-4 mt-8 flex flex-wrap gap-2 justify-center max-w-xl">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-sm px-4 py-2.5 rounded-full chip hover:border-white/25 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* conversation */
        <div ref={scrollRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && <AstridOrb size={28} />}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user" ? "text-white rounded-br-sm" : "glass text-[var(--ink-100)] rounded-bl-sm"
                  }`}
                  style={
                    m.role === "user"
                      ? { background: "linear-gradient(96deg, var(--ember), var(--ember-deep))", boxShadow: "0 8px 24px -10px rgba(255,122,44,0.6)" }
                      : undefined
                  }
                >
                  {m.role === "bot" ? <MessageContent text={m.text} /> : m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2.5 justify-start">
                <AstridOrb size={28} />
                <div className="glass rounded-2xl rounded-bl-sm px-4 py-3.5">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--ember-bright)" }} />
                    <span className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--ember-bright)", animationDelay: "0.2s" }} />
                    <span className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--ember-bright)", animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── input ── */}
      <div className="relative z-10 shrink-0 border-t border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask about your progress…"
            className="glass-input flex-1 rounded-xl px-4 py-3 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn-ember rounded-xl px-5 font-medium disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
