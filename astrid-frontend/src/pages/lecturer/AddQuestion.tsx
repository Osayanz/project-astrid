import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../../lib/api/client";
import { listTopics } from "../../lib/api/subjects";
import type { Topic } from "../../lib/api/subjects";

export default function AddQuestion() {
  const { id }   = useParams();   // quiz id
  const navigate = useNavigate();

  const [question,        setQuestion]        = useState("");
  const [a, setA]         = useState("");
  const [b, setB]         = useState("");
  const [c, setC]         = useState("");
  const [d, setD]         = useState("");
  const [correct,         setCorrect]         = useState("A");
  const [difficultyLevel, setDifficultyLevel] = useState("Easy");
  const [points,          setPoints]          = useState(1);
  const [topicId,         setTopicId]         = useState("");
  const [topics,          setTopics]          = useState<Topic[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [addedCount,      setAddedCount]      = useState(0);

  // ── load the quiz, then its subject's topics ───────────────────────
  useEffect(() => {
    const loadTopics = async () => {
      try {
        // get the quiz to find its subject_id
        const { data: quiz } = await api.get(`/quizzes/${id}`);
        if (quiz?.subject_id) {
          const t = await listTopics(quiz.subject_id);
          setTopics(t);
          if (t.length > 0) setTopicId(t[0].id);
        }
      } catch {
        setTopics([]);
      }
    };
    loadTopics();
  }, [id]);

  const resetForm = () => {
    setQuestion("");
    setA(""); setB(""); setC(""); setD("");
    setCorrect("A");
    setPoints(1);
    // keep topic + difficulty for the next question
  };

  const addQuestion = async () => {
    if (!question.trim() || !a || !b || !c || !d) {
      alert("Please fill in the question and all 4 options.");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/quizzes/${id}/questions`, {
        question_text:   question,
        option_a:        a,
        option_b:        b,
        option_c:        c,
        option_d:        d,
        correct_option:  correct,
        topic_id:        topicId || null,
        difficulty_level: difficultyLevel,
        points,
      });
      setAddedCount((n) => n + 1);
      resetForm();
    } catch (err: any) {
      alert(
        err?.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Failed to add question."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 shadow-sm">

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Add Question</h1>
        {addedCount > 0 && (
          <span className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
            {addedCount} added
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Topic and difficulty are used by the ML model for predictions and weak-topic analysis.
      </p>

      {topics.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          This quiz's subject has no topics yet. Add topics in Manage Subjects,
          or questions will be saved as "General".
        </div>
      )}

      <div className="space-y-4">

        {/* question */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Question</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter the question"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
            rows={3}
          />
        </label>

        {/* options */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[["A", a, setA], ["B", b, setB], ["C", c, setC], ["D", d, setD]].map(
            ([label, val, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Option {label as string}</span>
                <input
                  value={val as string}
                  onChange={(e) => (setter as any)(e.target.value)}
                  placeholder={`Enter option ${label}`}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
                />
              </label>
            )
          )}
        </div>

        {/* correct + marks */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Correct Answer</span>
            <select
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black bg-white"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Marks</span>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
            />
          </label>
        </div>

        {/* topic + difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Topic
              <span className="ml-1 text-xs text-gray-400">(from this subject)</span>
            </span>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black bg-white"
            >
              {topics.length === 0 && <option value="">General</option>}
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Difficulty
              <span className="ml-1 text-xs text-gray-400">(ML uses this)</span>
            </span>
            <select
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black bg-white"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </label>
        </div>

        {/* actions */}
        <div className="pt-4 space-y-3">
          <button
            onClick={addQuestion}
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Question"}
          </button>

          <button
            onClick={() => navigate("/lecturer/quizzes")}
            className="w-full rounded-lg border px-4 py-3 font-medium hover:bg-gray-50"
          >
            Finish & Done
          </button>
        </div>

      </div>
    </div>
    </div>
  );
}
