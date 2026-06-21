import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppHeader from "../../components/AppHeader";
import StatTile from "../../components/StatTile";
import { getMyJourney, type JourneySubject } from "../../lib/api/journey";
import {
  LineChart, BarChart, DonutChart, ChartCard, ChartEmpty,
  CHART, RISK_COLOR, RISK_ORDER,
} from "../../components/charts";

const RISK_BADGE: Record<string, string> = {
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-green-50 text-green-700 border-green-200",
};

function quizLabel(p: { quiz_number: number | null; title: string }) {
  return p.quiz_number != null ? `Q${p.quiz_number}` : p.title.slice(0, 8);
}

function SubjectJourney({ s }: { s: JourneySubject }) {
  const completed = s.points.filter((p) => p.score_percentage != null);
  const labels = s.points.map(quizLabel);
  const actual = s.points.map((p) => p.score_percentage);
  const predicted = s.points.map((p) => p.predicted_final_score);
  const hasPredicted = predicted.some((v) => v != null);
  const pct = s.quizzes_total ? Math.round((s.quizzes_completed / s.quizzes_total) * 100) : 0;

  return (
    <ChartCard
      title={s.subject_name}
      subtitle={`${s.quizzes_completed} of ${s.quizzes_total} quizzes · avg ${s.average_score ?? "–"}%`}
      legend={
        hasPredicted
          ? [
              { label: "Your score", color: CHART.brand },
              { label: "Predicted final", color: "#6366f1", dashed: true },
            ]
          : [{ label: "Your score", color: CHART.brand }]
      }
      action={
        s.latest_risk ? (
          <span className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${RISK_BADGE[s.latest_risk] ?? ""}`}>
            {s.latest_risk} risk
          </span>
        ) : undefined
      }
    >
      {completed.length === 0 ? (
        <ChartEmpty message="No completed quizzes in this subject yet." />
      ) : (
        <LineChart
          labels={labels}
          yMax={100}
          yUnit="%"
          series={[
            { name: "Your score", color: CHART.brand, points: actual },
            ...(hasPredicted
              ? [{ name: "Predicted final", color: "#6366f1", dashed: true, points: predicted }]
              : []),
          ]}
        />
      )}

      {/* completion + topics */}
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
            <span>Course progress</span>
            <span className="font-medium text-[var(--text)]">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--paper-2)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--ember-bright), var(--ember-deep))" }}
            />
          </div>
          {s.strong_topics.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Strong topics</p>
              <div className="flex flex-wrap gap-1.5">
                {s.strong_topics.slice(0, 4).map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          {s.weak_topics.length > 0 ? (
            <>
              <p className="text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Focus next on</p>
              <div className="flex flex-wrap gap-1.5">
                {s.weak_topics.slice(0, 5).map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {t}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">No weak topics flagged — keep it up.</p>
          )}
        </div>
      </div>
    </ChartCard>
  );
}

export default function StudentJourney() {
  const { data, isLoading, error } = useQuery({ queryKey: ["my-journey"], queryFn: getMyJourney });

  const subjects = data ?? [];
  const allPoints = subjects.flatMap((s) => s.points.filter((p) => p.score_percentage != null));
  const totalCompleted = subjects.reduce((a, s) => a + s.quizzes_completed, 0);
  const avgScore = allPoints.length
    ? Math.round((allPoints.reduce((a, p) => a + (p.score_percentage ?? 0), 0) / allPoints.length) * 10) / 10
    : null;

  // overall risk mix across subjects
  const riskCounts = RISK_ORDER.map((level) => ({
    label: level,
    value: subjects.filter((s) => s.latest_risk === level).length,
    color: RISK_COLOR[level],
  })).filter((d) => d.value > 0);

  // average score per subject (comparison)
  const subjLabels = subjects.filter((s) => s.average_score != null).map((s) => s.subject_name);
  const subjAvgs = subjects.filter((s) => s.average_score != null).map((s) => s.average_score);
  const subjColors = subjects
    .filter((s) => s.average_score != null)
    .map((s) => (s.latest_risk ? RISK_COLOR[s.latest_risk] : CHART.brand));

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[var(--paper)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto">
        <AppHeader />

        <div className="flex items-center justify-between mb-5 gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">My Journey</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              How your scores have moved across quizzes, and where to focus next.
            </p>
          </div>
          <Link to="/chat" className="btn-ember inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl shrink-0">
            Ask Astrid
          </Link>
        </div>

        {isLoading && <p className="text-sm text-[var(--text-muted)]">Loading your journey…</p>}
        {error && <p className="text-red-600 text-sm">Couldn't load your journey. Try again shortly.</p>}

        {!isLoading && subjects.length === 0 && (
          <div className="bg-[var(--card)] rounded-2xl border border-dashed border-[var(--line)] p-10 text-center">
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Your journey starts after your first quiz. Complete one to see your progress here.
            </p>
            <Link to="/dashboard" className="text-sm font-medium text-[var(--brand)]">
              Go to available quizzes →
            </Link>
          </div>
        )}

        {subjects.length > 0 && (
          <>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatTile label="Subjects tracked" value={subjects.length} />
              <StatTile label="Quizzes completed" value={totalCompleted} accent="#6366f1" />
              <StatTile label="Average score" value={avgScore != null ? `${avgScore}%` : "–"} accent="#0ea5a4" />
              <StatTile
                label="Subjects at risk"
                value={subjects.filter((s) => s.latest_risk === "High" || s.latest_risk === "Medium").length}
                accent={RISK_COLOR.Medium}
                hint="High or medium"
              />
            </div>

            {/* overall row */}
            <div className="grid lg:grid-cols-2 gap-5 mb-6">
              <ChartCard title="Risk across your subjects" subtitle="Based on your latest prediction per subject">
                {riskCounts.length > 0 ? (
                  <DonutChart data={riskCounts} centerLabel="subjects" />
                ) : (
                  <ChartEmpty message="No risk predictions yet." />
                )}
              </ChartCard>

              <ChartCard title="Average score by subject" subtitle="Your mean score so far">
                {subjLabels.length > 0 ? (
                  <BarChart
                    labels={subjLabels}
                    yMax={100}
                    yUnit="%"
                    series={[{ name: "Average", color: CHART.brand, values: subjAvgs, perBarColors: subjColors }]}
                  />
                ) : (
                  <ChartEmpty message="No scores yet." />
                )}
              </ChartCard>
            </div>

            {/* per-subject progression */}
            <h2 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3">
              Progress by subject
            </h2>
            <div className="grid gap-5">
              {subjects.map((s) => (
                <SubjectJourney key={s.subject_name} s={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
