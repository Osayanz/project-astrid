import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getYearSubjects, type AdminSubjectCard } from "../../lib/api/admin";
import AppHeader from "../../components/AppHeader";

const ordinal = (n: number) => `${n}${["st", "nd", "rd"][n - 1] ?? "th"}`;

export default function AdminYearSubjects() {
  const { year } = useParams();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<AdminSubjectCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!year) return;
    getYearSubjects(Number(year))
      .then(setSubjects)
      .finally(() => setLoading(false));
  }, [year]);

  const y = Number(year);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <AppHeader title={`${ordinal(y)} year — subjects`} />

      <div className="max-w-5xl mx-auto space-y-5">
        <button
          onClick={() => navigate("/admin")}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to years
        </button>

        {loading && <p className="text-sm text-gray-400">Loading subjects…</p>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/admin/subject/${s.id}`)}
              className="bg-white rounded-2xl border shadow-sm p-5 text-left hover:border-gray-400 transition-colors"
            >
              <p className="font-semibold text-gray-900 mb-1">{s.name}</p>
              {s.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{s.description}</p>
              )}
              <p className="text-xs text-gray-400">
                {s.quiz_count} quiz{s.quiz_count === 1 ? "" : "zes"} · {s.topic_count} topic{s.topic_count === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-gray-500 mt-3">View student performance →</p>
            </button>
          ))}

          {!loading && subjects.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm text-gray-400">
                No subjects target the {ordinal(y)} year yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
