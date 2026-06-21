import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import AppHeader from "../../components/AppHeader";
import StatTile from "../../components/StatTile";
import { getYears, getYearSubjects, getSubjectPerformance } from "../../lib/api/admin";
import {
  BarChart, DonutChart, ChartCard, ChartEmpty,
  CHART, RISK_COLOR, RISK_ORDER,
} from "../../components/charts";

const ordinal = (n: number) => `${n}${["st", "nd", "rd"][n - 1] ?? "th"}`;
const RISK_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

const SCORE_BUCKETS = [
  { label: "0–39", min: 0, max: 39.999, color: "#dc2626" },
  { label: "40–59", min: 40, max: 59.999, color: "#f97316" },
  { label: "60–74", min: 60, max: 74.999, color: "#d97706" },
  { label: "75–89", min: 75, max: 89.999, color: "#65a30d" },
  { label: "90–100", min: 90, max: 100, color: "#16a34a" },
];

export default function AdminJourney() {
  const [year, setYear] = useState<number | null>(null);

  const { data: years, isLoading: loadingYears } = useQuery({ queryKey: ["admin-years"], queryFn: getYears });
  const activeYear = year ?? years?.[0]?.year ?? null;

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ["admin-year-subjects", activeYear],
    queryFn: () => getYearSubjects(activeYear as number),
    enabled: activeYear != null,
  });

  const perf = useQueries({
    queries: (subjects ?? []).map((s) => ({
      queryKey: ["admin-subject-perf", s.id],
      queryFn: () => getSubjectPerformance(s.id),
      enabled: activeYear != null,
    })),
  });

  const perfData = perf.map((p) => p.data).filter(Boolean) as NonNullable<(typeof perf)[number]["data"]>[];
  const ready = (subjects?.length ?? 0) > 0 && perfData.length === (subjects?.length ?? 0);

  // per-subject actual vs predicted
  const subjLabels = perfData.map((p) => p.subject_name);
  const subjActual = perfData.map((p) => p.class_average);
  const subjPredicted = perfData.map((p) => {
    const preds = p.students.map((s) => s.predicted_final_score).filter((v): v is number => v != null);
    return preds.length ? Math.round((preds.reduce((a, v) => a + v, 0) / preds.length) * 10) / 10 : null;
  });

  // dedupe students across subjects → worst risk + mean score per student
  const studentAgg = useMemo(() => {
    const map = new Map<string, { risks: string[]; scores: number[] }>();
    for (const p of perfData) {
      for (const s of p.students) {
        const e = map.get(s.id) ?? { risks: [], scores: [] };
        if (s.risk_level) e.risks.push(s.risk_level);
        if (s.avg_score != null) e.scores.push(s.avg_score);
        map.set(s.id, e);
      }
    }
    return map;
  }, [perfData]);

  const riskDonut = RISK_ORDER.map((lvl) => {
    let count = 0;
    studentAgg.forEach((e) => {
      const worst = e.risks.sort((a, b) => RISK_RANK[b] - RISK_RANK[a])[0];
      if (worst === lvl) count++;
    });
    return { label: lvl, value: count, color: RISK_COLOR[lvl] };
  }).filter((d) => d.value > 0);

  const meanScores: number[] = [];
  studentAgg.forEach((e) => {
    if (e.scores.length) meanScores.push(e.scores.reduce((a, v) => a + v, 0) / e.scores.length);
  });
  const scoreDist = SCORE_BUCKETS.map((b) => ({
    label: b.label,
    color: b.color,
    value: meanScores.filter((s) => s >= b.min && s <= b.max).length,
  }));

  // KPIs
  const totalStudents = studentAgg.size;
  const cohortAvg = (() => {
    const vals = subjActual.filter((v): v is number => v != null);
    return vals.length ? Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 10) / 10 : null;
  })();
  const highRisk = riskDonut.find((d) => d.label === "High")?.value ?? 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-[var(--paper)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto">
        <AppHeader />

        <div className="mb-5">
          <h1 className="font-display text-2xl font-semibold">Overall Journey</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Cohort-wide performance and risk across a year's subjects.
          </p>
        </div>

        {/* year selector */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <label className="text-sm text-[var(--text-muted)]">Year group</label>
          <select
            value={activeYear ?? ""}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {years?.map((y) => (
              <option key={y.year} value={y.year}>
                {ordinal(y.year)} year — {y.student_count} students · {y.subject_count} subjects
              </option>
            ))}
          </select>
        </div>

        {(loadingYears || loadingSubjects) && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}

        {!loadingSubjects && (subjects?.length ?? 0) === 0 && (
          <div className="bg-[var(--card)] rounded-2xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--text-muted)]">
            No subjects for this year yet.
          </div>
        )}

        {(subjects?.length ?? 0) > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatTile label="Students" value={totalStudents} />
              <StatTile label="Subjects" value={subjects?.length ?? 0} accent="#6366f1" />
              <StatTile label="Cohort average" value={cohortAvg != null ? `${cohortAvg}%` : "–"} accent="#0ea5a4" />
              <StatTile label="High risk" value={highRisk} accent={RISK_COLOR.High} hint="Students flagged" />
            </div>

            <div className="grid gap-5">
              <ChartCard
                title="Actual vs predicted by subject"
                subtitle="Class average against the model's average predicted final"
                legend={[
                  { label: "Class average", color: CHART.brand },
                  { label: "Predicted final", color: "#6366f1" },
                ]}
              >
                {ready ? (
                  <BarChart
                    labels={subjLabels}
                    yMax={100}
                    yUnit="%"
                    showValues={false}
                    series={[
                      { name: "Class average", color: CHART.brand, values: subjActual },
                      { name: "Predicted final", color: "#6366f1", values: subjPredicted },
                    ]}
                  />
                ) : (
                  <ChartEmpty message="Gathering subject performance…" />
                )}
              </ChartCard>

              <div className="grid lg:grid-cols-2 gap-5">
                <ChartCard title="Students by current risk" subtitle="Each student's highest risk across subjects">
                  {riskDonut.length > 0 ? (
                    <DonutChart data={riskDonut} centerLabel="students" />
                  ) : (
                    <ChartEmpty message="No risk predictions yet." />
                  )}
                </ChartCard>

                <ChartCard title="Score distribution" subtitle="Students grouped by mean score across subjects">
                  {meanScores.length > 0 ? (
                    <BarChart
                      labels={SCORE_BUCKETS.map((b) => b.label)}
                      series={[{ name: "Students", color: CHART.brand, values: scoreDist.map((b) => b.value), perBarColors: SCORE_BUCKETS.map((b) => b.color) }]}
                    />
                  ) : (
                    <ChartEmpty message="No scores yet." />
                  )}
                </ChartCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
