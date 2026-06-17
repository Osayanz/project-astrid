import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSubjects } from "../../lib/api/subjects";
import AppHeader from "../../components/AppHeader";

export default function LecturerDashboard() {
  const navigate = useNavigate();

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <AppHeader title="Lecturer Dashboard" />

      <div className="max-w-4xl mx-auto space-y-6">

        {/* actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/lecturer/subjects")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 bg-white"
          >
            Manage Subjects & Topics
          </button>
          <button
            onClick={() => navigate("/create-quiz")}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Create New Quiz
          </button>
        </div>

        {/* subjects grid */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            My subjects
          </h2>

          {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects?.map((s: any) => (
              <button
                key={s.id}
                onClick={() => navigate(`/lecturer/subject/${s.id}`)}
                className="bg-white rounded-2xl border shadow-sm p-5 text-left hover:border-gray-400 transition-colors"
              >
                <p className="font-semibold text-gray-900 mb-1">{s.name}</p>
                <p className="text-xs text-gray-400">
                  {s.topic_count} topics
                  {s.target_year ? ` · ${s.target_year}${["st","nd","rd"][s.target_year-1] ?? "th"}-year subject` : ""}
                </p>
                <p className="text-xs text-gray-500 mt-3">View quizzes & analysis →</p>
              </button>
            ))}

            {subjects?.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-dashed p-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No subjects yet.</p>
                <button
                  onClick={() => navigate("/lecturer/subjects")}
                  className="text-sm underline font-medium"
                >
                  Add your first subject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
