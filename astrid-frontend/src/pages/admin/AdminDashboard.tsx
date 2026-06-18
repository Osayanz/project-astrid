import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createStudent, getYears,
  type AdminYear,
} from "../../lib/api/admin";
import AppHeader from "../../components/AppHeader";

const currentYear = new Date().getFullYear();
const yearOptions = [0, 1, 2, 3, 4, 5].map((n) => currentYear - n);
const ordinal = (n: number) => `${n}${["st", "nd", "rd"][n - 1] ?? "th"}`;

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [years, setYears] = useState<AdminYear[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);

  // add-student form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enrollYear, setEnrollYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadYears = () => {
    setLoadingYears(true);
    getYears()
      .then(setYears)
      .finally(() => setLoadingYears(false));
  };

  useEffect(loadYears, []);

  const onAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (name.trim().length < 2) return setMsg({ ok: false, text: "Name is required." });
    if (!email.includes("@")) return setMsg({ ok: false, text: "Enter a valid email." });
    if (password.length < 6) return setMsg({ ok: false, text: "Password must be at least 6 characters." });
    if (!enrollYear) return setMsg({ ok: false, text: "Select an enrollment year." });

    setSubmitting(true);
    try {
      await createStudent({
        name: name.trim(),
        email: email.trim(),
        password,
        enrollment_year: Number(enrollYear),
      });
      setMsg({ ok: true, text: `Student "${name.trim()}" added successfully.` });
      setName(""); setEmail(""); setPassword(""); setEnrollYear("");
      loadYears();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setMsg({ ok: false, text: typeof detail === "string" ? detail : "Failed to add student." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <AppHeader title="Admin Dashboard" />

      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-5">
        {/* ── Add student ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Add a student</h2>
            <p className="text-xs text-gray-400 mb-4">
              Create a new student account. They can log in with this email and password.
            </p>

            <form onSubmit={onAddStudent} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Temporary password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Enrollment year
                  <span className="ml-1 text-xs text-gray-400">(year they joined)</span>
                </label>
                <select
                  value={enrollYear}
                  onChange={(e) => setEnrollYear(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select year…</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y} {currentYear - y > 0 ? `(${ordinal(currentYear - y)} year now)` : "(new)"}
                    </option>
                  ))}
                </select>
              </div>

              {msg && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    msg.ok
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <button
                disabled={submitting}
                className="w-full rounded-lg bg-black text-white py-2 font-medium hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add student"}
              </button>
            </form>
          </div>
        </div>

        {/* ── Years ── */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Student performance by year
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Pick a year to see its subjects, then open a subject to view each student's performance.
          </p>

          {loadingYears && <p className="text-sm text-gray-400">Loading years…</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            {years.map((y) => (
              <button
                key={y.year}
                onClick={() => navigate(`/admin/year/${y.year}`)}
                className="bg-white rounded-2xl border shadow-sm p-5 text-left hover:border-gray-400 transition-colors"
              >
                <p className="text-lg font-semibold text-gray-900">{ordinal(y.year)} year</p>
                <p className="text-xs text-gray-400 mt-1">
                  {y.student_count} student{y.student_count === 1 ? "" : "s"} · {y.subject_count} subject{y.subject_count === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-gray-500 mt-3">View subjects →</p>
              </button>
            ))}

            {!loadingYears && years.length === 0 && (
              <div className="sm:col-span-2 bg-white rounded-2xl border border-dashed p-8 text-center">
                <p className="text-sm text-gray-400">
                  No years to show yet. Add students and create subjects with a target year.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
