import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api/client";
import { listSubjects } from "../../lib/api/subjects";
import type { Subject } from "../../lib/api/subjects";

export default function CreateQuiz() {
  const navigate = useNavigate();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [duration,    setDuration]    = useState(30);
  const [quizNumber,  setQuizNumber]  = useState<number>(1);
  const [subjectId,   setSubjectId]   = useState<string>("");
  const [subjects,    setSubjects]    = useState<Subject[]>([]);
  const [loading,     setLoading]     = useState(false);

  // load lecturer's subjects for the dropdown
  useEffect(() => {
    listSubjects()
      .then((data) => {
        setSubjects(data);
        if (data.length > 0) setSubjectId(data[0].id);
      })
      .catch(() => setSubjects([]));
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) { alert("Please enter a quiz title."); return; }
    if (!subjectId)    { alert("Please select a subject. Add one in Manage Subjects first."); return; }

    try {
      setLoading(true);
      const { data } = await api.post("/quizzes", {
        title,
        description,
        duration,
        quiz_number: quizNumber,
        subject_id:  subjectId,
      });
      navigate(`/add-question/${data.id}`);
    } catch (err) {
      alert("Failed to create quiz.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">

        <h1 className="text-xl font-semibold mb-1">Create Quiz</h1>
        <p className="text-sm text-gray-500 mb-5">
          Choose a subject and fill in the details. The quiz number tells the
          ML model which stage to use for predictions.
        </p>

        {/* no subjects warning */}
        {subjects.length === 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            You have no subjects yet.{" "}
            <button
              onClick={() => navigate("/lecturer/subjects")}
              className="underline font-medium"
            >
              Add a subject first
            </button>
            .
          </div>
        )}

        {/* subject picker */}
        <label className="block mb-3">
          <span className="block text-sm font-medium text-gray-700 mb-1">Subject</span>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-black bg-white"
          >
            {subjects.length === 0 && <option value="">No subjects available</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        {/* title */}
        <label className="block mb-3">
          <span className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</span>
          <input
            placeholder="e.g. Programming Fundamentals — Quiz 1"
            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-black"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {/* description */}
        <label className="block mb-3">
          <span className="block text-sm font-medium text-gray-700 mb-1">Description</span>
          <textarea
            placeholder="Optional description"
            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-black"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {/* quiz number + duration */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Quiz Number
              <span className="ml-1 text-xs text-gray-400">(ML stage)</span>
            </span>
            <select
              value={quizNumber}
              onChange={(e) => setQuizNumber(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:border-black bg-white"
            >
              <option value={1}>Quiz 1 — Fundamentals</option>
              <option value={2}>Quiz 2 — Intermediate</option>
              <option value={3}>Quiz 3 — Advanced</option>
              <option value={4}>Quiz 4 — Final stage</option>
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</span>
            <input
              type="number"
              min={5}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:border-black"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Quiz & Add Questions →"}
        </button>

      </div>
    </div>
  );
}
