import { useEffect, useState } from "react";
import type { Subject, Topic } from "../../lib/api/subjects";
import {
  listSubjects, createSubject, deleteSubject,
  listTopics, addTopic, deleteTopic,
} from "../../lib/api/subjects";
import AppHeader from "../../components/AppHeader";

export default function Subjects() {
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [selected, setSelected]   = useState<Subject | null>(null);
  const [topics,   setTopics]     = useState<Topic[]>([]);

  const [newSubject, setNewSubject] = useState("");
  const [newTopic,   setNewTopic]   = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [newYear, setNewYear] = useState<number>(1);


  // ── load subjects ──────────────────────────────────────────────────
  const loadSubjects = async () => {
    try {
      const data = await listSubjects();
      setSubjects(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubjects(); }, []);

  // ── load topics when a subject is selected ─────────────────────────
  useEffect(() => {
    if (!selected) { setTopics([]); return; }
    listTopics(selected.id).then(setTopics).catch(() => setTopics([]));
  }, [selected]);

  // ── handlers ───────────────────────────────────────────────────────
  const handleAddSubject = async () => {
    const name = newSubject.trim();
    if (!name) return;
    try {
      await createSubject(name, undefined, newYear);
      setNewSubject("");
      loadSubjects();
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Could not add subject.");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Delete this subject and all its topics?")) return;
    await deleteSubject(id);
    if (selected?.id === id) setSelected(null);
    loadSubjects();
  };

  const handleAddTopic = async () => {
    if (!selected) return;
    const name = newTopic.trim();
    if (!name) return;
    try {
      const t = await addTopic(selected.id, name);
      setTopics((prev) => [...prev, t]);
      setNewTopic("");
      loadSubjects(); // refresh topic count
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Could not add topic.");
    }
  };

  const handleDeleteTopic = async (id: string) => {
    await deleteTopic(id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
    loadSubjects();
  };

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--paper)] p-6">
      <AppHeader />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">My subjects</h1>
        <p className="text-sm text-gray-500 mb-6">
          Add the subjects you teach and the topics under each. You'll pick
          these when creating quizzes and questions.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── left: subjects ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Subjects</h2>

            <div className="flex gap-2 mb-4">
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                placeholder="e.g. Programming Fundamentals"
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
            <select
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="border rounded-lg px-2 py-2 text-sm bg-white"
              >
              <option value={1}>1st yr</option>
              <option value={2}>2nd yr</option>
              <option value={3}>3rd yr</option>
              <option value={4}>4th yr</option>
            </select>
              <button onClick={handleAddSubject}
                className="rounded-lg bg-[var(--brand)] text-white px-4 text-sm hover:opacity-90">
                Add
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-gray-400">No subjects yet. Add your first one above.</p>
            ) : (
              <div className="space-y-2">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                      selected?.id === s.id
                        ? "border-[var(--brand)] bg-gray-50"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.topic_count} topics</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id); }}
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── right: topics ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">
              {selected ? `Topics in ${selected.name}` : "Topics"}
            </h2>

            {!selected ? (
              <p className="text-sm text-gray-400">
                Select a subject on the left to manage its topics.
              </p>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                    placeholder="e.g. Loops"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                  />
                  <button
                    onClick={handleAddTopic}
                    className="rounded-lg bg-[var(--brand)] text-white px-4 text-sm hover:opacity-90"
                  >
                    Add
                  </button>
                </div>

                {topics.length === 0 ? (
                  <p className="text-sm text-gray-400">No topics yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t) => (
                      <span
                        key={t.id}
                        className="group flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700"
                      >
                        {t.name}
                        <button
                          onClick={() => handleDeleteTopic(t.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
