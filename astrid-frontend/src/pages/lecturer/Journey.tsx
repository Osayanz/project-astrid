import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import AppHeader from "../../components/AppHeader";
import StatTile from "../../components/StatTile";
import { listSubjects } from "../../lib/api/subjects";
import { getSubjectDetail, getQuizOverview } from "../../lib/api/overview";
import {
  LineChart, BarChart, DonutChart, ChartCard, ChartEmpty,
  CHART, RISK_COLOR, RISK_ORDER,
} from "../../components/charts";

const SCORE_BUCKETS = [
  { label: "0–39", min: 0, max: 39.999, color: "#dc2626" },
  { label: "40–59", min: 40, max: 59.999, color: "#f97316" },
  { label: "60–74", min: 60, max: 74.999, color: "#d97706" },
  { label: "75–89", min: 75, max: 89.999, color: "#65a30d" },
  { label: "90–100", min: 90, max: 100, color: "#16a34a" },
];

function bucketScores(scores: number[]) {
  return SCORE_BUCKETS.map((b) => ({
    label: b.label,
    color: b.color,
    value: scores.filter((s) => s >= b.min && s <= b.max).length,
  }));
}

export default function LecturerJourney() {
  const [subjectId, setSubjectId] = useState<string>("");
  const [quizSel, setQuizSel] = useState<string>("overall");

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });

  // default to first subject once loaded
  const activeSubject = subjectId || subjects?.[0]?.id || "";

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["subject-detail", activeSubject],
    queryFn: () => getSubjectDetail(activeSubject),
    enabled: !!activeSubject,
  });

  const quizzes = useMemo(
    () => (detail?.quizzes ?? []).slice().sort((a, b) => (a.quiz_number ?? 0) - (b.quiz_number ?? 0)),
    [detail]
  );

  // fetch every quiz's overview in parallel for the "overall" progression
  const overviews = useQueries({
    queries: quizzes.map((q) => ({
      queryKey: ["quiz-overview", q.id],
      queryFn: () => getQuizOverview(q.id),
      enabled: !!activeSubject,
    })),
  });

  const overviewData = overviews.map((o) => o.data).filter(Boolean);
  const ready = quizzes.length > 0 && overviewData.length === quizzes.length;

  // ── OVERALL series ────────────────────────────────────────────────
  const labels = quizzes.map((q) => (q.quiz_number != null ? `Q${q.quiz_number}` : q.title.slice(0, 8)));
  const avgScores = overviews.map((o) => o.data?.avg_score ?? null);
  const avgPredicted = overviews.map((o) => o.data?.avg_predicted ?? null);
  const participation = overviews.map((o) =>
    o.data && o.data.eligible_total ? Math.round((o.data.attempted / o.data.eligible_total) * 100) : null
  );
  const hasPredicted = avgPredicted.some((v) => v != null);

  // aggregate latest risk mix (use most advanced quiz that has attempts)
  const latestWithRisk = [...overviewData].reverse().find((o) => o && Object.values(o.risk_counts).some((v) => v > 0));
  const riskDonut = latestWithRisk
    ? RISK_ORDER.map((lvl) => ({ label: lvl, value: latestWithRisk.risk_counts[lvl] ?? 0, color: RISK_COLOR[lvl] })).filter((d) => d.value > 0)
    : [];

  // KPIs
  const classAvg = (() => {
    const vals = avgScores.filter((v): v is number => v != null);
    return vals.length ? Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 10) / 10 : null;
  })();
  const avgParticipation = (() => {
    const vals = participation.filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : null;
  })();

  // ── PER-QUIZ view ─────────────────────────────────────────────────
  const selectedOverview = quizSel !== "overall" ? overviewData.find((o) => o && o.quiz_id === quizSel) : null;
  const selectedScores = (selectedOverview?.students ?? [])
    .map((s) => s.score_percentage)
    .filter((v): v is number => v != null);

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[var(--paper)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto">
        <AppHeader />

        <div className="mb-5">
          <h1 className="font-display text-2xl font-semibold">Journey</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Track the whole class across a subject, or drill into one quiz.
          </p>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="text-sm text-[var(--text-muted)]">Subject</label>
          <select
            value={activeSubject}
            onChange={(e) => { setSubjectId(e.target.value); setQuizSel("overall"); }}
            className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {quizzes.length > 0 && (
            <div className="flex items-center gap-1 ml-auto bg-[var(--paper-2)] rounded-xl p-1">
              <button
                onClick={() => setQuizSel("overall")}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={quizSel === "overall" ? { background: "var(--card)", color: "var(--brand)", boxShadow: "0 1px 2px rgba(20,23,40,.06)" } : { color: "var(--text-muted)" }}
              >
                Overall
              </button>
              <select
                value={quizSel === "overall" ? "" : quizSel}
                onChange={(e) => setQuizSel(e.target.value || "overall")}
                className="text-sm bg-transparent px-2 py-1.5 rounded-lg focus:outline-none"
                style={{ color: quizSel !== "overall" ? "var(--brand)" : "var(--text-muted)" }}
              >
                <option value="">Per quiz…</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.quiz_number != null ? `Quiz ${q.quiz_number}` : q.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {(loadingSubjects || loadingDetail) && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}

        {!loadingDetail && quizzes.length === 0 && (
          <div className="bg-[var(--card)] rounded-2xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--text-muted)]">
            This subject has no quizzes yet. Create a quiz to start tracking the class journey.
          </div>
        )}

        {/* ── OVERALL ── */}
        {quizSel === "overall" && quizzes.length > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatTile label="Quizzes" value={quizzes.length} />
              <StatTile label="Students" value={detail?.students.length ?? 0} accent="#6366f1" />
              <StatTile label="Class average" value={classAvg != null ? `${classAvg}%` : "–"} accent="#0ea5a4" />
              <StatTile label="Participation" value={avgParticipation != null ? `${avgParticipation}%` : "–"} accent={CHART.gold} hint="Avg attempted" />
            </div>

            <div className="grid gap-5">
              <ChartCard
                title="Class progression across quizzes"
                subtitle="Average score per quiz, and the average predicted final"
                legend={
                  hasPredicted
                    ? [{ label: "Class average", color: CHART.brand }, { label: "Predicted final", color: "#6366f1", dashed: true }]
                    : [{ label: "Class average", color: CHART.brand }]
                }
              >
                {ready ? (
                  <LineChart
                    labels={labels}
                    yMax={100}
                    yUnit="%"
                    series={[
                      { name: "Class average", color: CHART.brand, points: avgScores },
                      ...(hasPredicted ? [{ name: "Predicted final", color: "#6366f1", dashed: true, points: avgPredicted }] : []),
                    ]}
                  />
                ) : (
                  <ChartEmpty message="Gathering quiz results…" />
                )}
              </ChartCard>

              <div className="grid lg:grid-cols-2 gap-5">
                <ChartCard title="Participation by quiz" subtitle="Share of eligible students who attempted">
                  {ready ? (
                    <BarChart
                      labels={labels}
                      yMax={100}
                      yUnit="%"
                      series={[{ name: "Participation", color: CHART.brand, values: participation }]}
                    />
                  ) : (
                    <ChartEmpty message="Gathering quiz results…" />
                  )}
                </ChartCard>

                <ChartCard title="Current risk distribution" subtitle="From the latest quiz with attempts">
                  {riskDonut.length > 0 ? (
                    <DonutChart data={riskDonut} centerLabel="students" />
                  ) : (
                    <ChartEmpty message="No risk data yet for this subject." />
                  )}
                </ChartCard>
              </div>
            </div>
          </>
        )}

        {/* ── PER QUIZ ── */}
        {quizSel !== "overall" && selectedOverview && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatTile label="Attempted" value={`${selectedOverview.attempted}/${selectedOverview.eligible_total}`} />
              <StatTile label="Average score" value={selectedOverview.avg_score != null ? `${selectedOverview.avg_score}%` : "–"} accent="#0ea5a4" />
              <StatTile label="Predicted final" value={selectedOverview.avg_predicted != null ? `${selectedOverview.avg_predicted}%` : "–"} accent="#6366f1" />
              <StatTile
                label="High risk"
                value={selectedOverview.risk_counts.High ?? 0}
                accent={RISK_COLOR.High}
                hint="Students flagged"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <ChartCard title={`Score distribution — ${selectedOverview.title}`} subtitle="How many students fell in each band">
                {selectedScores.length > 0 ? (
                  <BarChart
                    labels={SCORE_BUCKETS.map((b) => b.label)}
                    series={[{
                      name: "Students",
                      color: CHART.brand,
                      values: bucketScores(selectedScores).map((b) => b.value),
                      perBarColors: SCORE_BUCKETS.map((b) => b.color),
                    }]}
                    yUnit=""
                  />
                ) : (
                  <ChartEmpty message="No attempts for this quiz yet." />
                )}
              </ChartCard>

              <ChartCard title="Risk distribution" subtitle={`${selectedOverview.title}`}>
                {Object.values(selectedOverview.risk_counts).some((v) => v > 0) ? (
                  <DonutChart
                    data={RISK_ORDER.map((lvl) => ({ label: lvl, value: selectedOverview.risk_counts[lvl] ?? 0, color: RISK_COLOR[lvl] })).filter((d) => d.value > 0)}
                    centerLabel="students"
                  />
                ) : (
                  <ChartEmpty message="No risk data for this quiz yet." />
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
