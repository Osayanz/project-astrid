import pandas as pd
import numpy as np
import os

QUIZ_FILES = {
    1: "data/raw/programming1_quiz1_synthetic_dataset.csv",
    2: "data/raw/quiz2_dataset_fixed.csv",
    3: "data/raw/quiz3_dataset_fixed.csv",
    4: "data/raw/quiz4_dataset_fixed.csv",
}
FINAL_FILE  = "data/raw/final_exam_dataset_fixed.csv"
OUTPUT_DIR  = "data/features"

os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_data():
    quizzes = {}
    for q_num, path in QUIZ_FILES.items():
        df = pd.read_csv(path)
        df.columns = df.columns.str.strip()
        df["quiz_number"] = q_num
        quizzes[q_num] = df
        print(f"  loaded quiz {q_num}: {df.shape[0]} rows, {df['stu_no'].nunique()} students")

    final = pd.read_csv(FINAL_FILE)
    final.columns = final.columns.str.strip()
    print(f"  loaded final: {final.shape[0]} rows")
    return quizzes, final


def features_from_quiz(df: pd.DataFrame, quiz_num: int) -> pd.DataFrame:
    """
    Given raw question-level rows for a single quiz,
    return one feature row per student.
    """
    prefix = f"q{quiz_num}"
    rows = []

    for stu_no, grp in df.groupby("stu_no"):
        total_q    = len(grp)
        correct    = grp["is_correct"].sum()
        accuracy   = correct / total_q if total_q > 0 else 0

        diff_acc = {}
        for diff in ["Easy", "Medium", "Hard"]:
            sub = grp[grp["question_difficulty"] == diff]
            diff_acc[diff] = sub["is_correct"].mean() if len(sub) > 0 else np.nan

        avg_time       = grp["time_spent_sec"].mean()
        quiz_score_pct = (grp["full_marks"].iloc[0] / 30) * 100  # 30 questions per quiz

        slow_wrong = (
            (grp["time_spent_sec"] > avg_time) & (grp["is_correct"] == 0)
        ).sum() / total_q

        fast_wrong = (
            (grp["time_spent_sec"] < 15) & (grp["is_correct"] == 0)
        ).sum() / total_q

        topic_acc = (
            grp.groupby("question_topic")["is_correct"]
            .mean()
            .to_dict()
        )

        row = {
            "stu_no":                            stu_no,
            f"{prefix}_accuracy":                round(accuracy, 4),
            f"{prefix}_score_pct":               round(quiz_score_pct, 2),
            f"{prefix}_avg_time_sec":            round(avg_time, 2),
            f"{prefix}_easy_accuracy":           round(diff_acc.get("Easy",  np.nan), 4),
            f"{prefix}_medium_accuracy":         round(diff_acc.get("Medium", np.nan), 4),
            f"{prefix}_hard_accuracy":           round(diff_acc.get("Hard",  np.nan), 4),
            f"{prefix}_slow_wrong_ratio":        round(slow_wrong, 4),
            f"{prefix}_fast_wrong_ratio":        round(fast_wrong, 4),
            f"{prefix}_num_topics_below_50pct":  sum(1 for v in topic_acc.values() if v < 0.5),
            f"{prefix}_weakest_topic_score":     round(min(topic_acc.values()), 4),
        }

        for topic, acc in topic_acc.items():
            safe = topic.replace(" ", "_").replace("/", "_")
            row[f"{prefix}_topic_{safe}"] = round(acc, 4)

        rows.append(row)

    return pd.DataFrame(rows)


def add_trend_features(merged: pd.DataFrame, up_to: int) -> pd.DataFrame:
    """Add quiz-to-quiz score trend columns."""
    if up_to >= 2:
        merged["trend_q1_q2"] = merged["q2_score_pct"] - merged["q1_score_pct"]
    if up_to >= 3:
        merged["trend_q2_q3"] = merged["q3_score_pct"] - merged["q2_score_pct"]
        merged["trend_q1_q3"] = merged["q3_score_pct"] - merged["q1_score_pct"]
    if up_to >= 4:
        merged["trend_q3_q4"] = merged["q4_score_pct"] - merged["q3_score_pct"]
        merged["trend_q1_q4"] = merged["q4_score_pct"] - merged["q1_score_pct"]
    return merged


def attach_labels(features: pd.DataFrame, final: pd.DataFrame) -> pd.DataFrame:
    """
    Merge final exam results onto the feature table.
    Adds:
        final_mark      — 0 to 100 (regression target)
        passed          — 1 if final_mark >= 50 (classification target)
        risk_label      — 'High' / 'Medium' / 'Low'
    """
    labels = final[["stu_no", "final_mark", "final_grade"]].copy()
    labels["passed"]     = (labels["final_mark"] >= 50).astype(int)
    labels["risk_label"] = labels["final_mark"].apply(
        lambda m: "High" if m < 50 else ("Medium" if m < 65 else "Low")
    )

    merged = features.merge(labels, on="stu_no", how="inner")
    return merged


def run():
    print("\n── loading raw data ──")
    quizzes, final = load_data()

    print("\n── building features ──")
    quiz_feature_dfs = {}
    for q_num, df in quizzes.items():
        fdf = features_from_quiz(df, q_num)
        quiz_feature_dfs[q_num] = fdf
        print(f"  Q{q_num}: {fdf.shape[1]-1} features for {len(fdf)} students")

    stages = {
        1: [1],
        2: [1, 2],
        3: [1, 2, 3],
        4: [1, 2, 3, 4],
    }

    print("\n── merging stages and saving ──")
    for stage, quiz_nums in stages.items():
        merged = quiz_feature_dfs[quiz_nums[0]].copy()
        for q in quiz_nums[1:]:
            merged = merged.merge(quiz_feature_dfs[q], on="stu_no", how="inner")

        merged = add_trend_features(merged, up_to=stage)

        merged = attach_labels(merged, final)

        out_path = os.path.join(OUTPUT_DIR, f"features_stage{stage}.csv")
        merged.to_csv(out_path, index=False)

        feature_cols = [c for c in merged.columns
                        if c not in ("stu_no", "final_mark", "final_grade",
                                     "passed", "risk_label")]
        print(f"  stage {stage}: {len(feature_cols)} features → saved to {out_path}")

        print(f"    rows: {len(merged)}  |  nulls: {merged.isnull().sum().sum()}")
        print(f"    final_mark mean: {merged['final_mark'].mean():.1f}  "
              f"passed: {merged['passed'].mean()*100:.1f}%  "
              f"High risk: {(merged['risk_label']=='High').mean()*100:.1f}%")

    print("\n── done. files in data/features/ ──\n")


if __name__ == "__main__":
    run()