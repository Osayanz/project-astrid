"""
predict.py  —  Astrid ML Pipeline
====================================
Takes one live student's quiz responses from the API,
builds their features, loads the right trained model,
and returns a prediction.

This is called by the FastAPI /predict endpoint after
every quiz submission.

Usage (from the API):
    from predict import predict_student

    result = predict_student(
        student_responses=[
            {
                "question_topic":      "Loops",
                "question_difficulty": "Medium",
                "is_correct":          1,
                "time_spent_sec":      45,
            },
            ...
        ],
        quiz_scores={
            1: 63.3,   # score_pct after quiz 1
            2: 58.0,   # score_pct after quiz 2  (omit if not done yet)
        },
        quizzes_completed=2,   # how many quizzes the student has done
    )

    # result looks like:
    # {
    #     "predicted_final_score": 61.4,
    #     "risk_label":            "Medium",
    #     "confidence":            "medium",
    #     "weak_topics":           ["Loops", "Recursion"],
    #     "strong_topics":         ["Strings", "Variables"],
    #     "stage":                 2,
    # }
"""

import os
import pickle
import numpy as np
import warnings
warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# cache loaded models in memory so we don't reload from disk every request
_model_cache: dict = {}


# ══════════════════════════════════════════════════════════════════════
# STEP 1 — load the right model for the stage
# ══════════════════════════════════════════════════════════════════════
def load_model(stage: int) -> dict:
    """Load and cache model_stage{N}.pkl"""
    if stage not in _model_cache:
        path = os.path.join(MODELS_DIR, f"model_stage{stage}.pkl")
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Model file not found: {path}\n"
                f"Run train.py first to generate the model files."
            )
        with open(path, "rb") as f:
            _model_cache[stage] = pickle.load(f)
    return _model_cache[stage]


# ══════════════════════════════════════════════════════════════════════
# STEP 2 — build features from one student's live responses
#          (mirrors feature_engineering.py exactly)
# ══════════════════════════════════════════════════════════════════════
def build_features_for_quiz(responses: list[dict], quiz_num: int) -> dict:
    """
    Given a list of question response dicts for ONE quiz,
    return a flat feature dict with prefix q{quiz_num}_...

    Each response dict must have:
        question_topic      str
        question_difficulty str  ("Easy" / "Medium" / "Hard")
        is_correct          int  (1 or 0)
        time_spent_sec      int
    """
    prefix    = f"q{quiz_num}"
    total_q   = len(responses)

    if total_q == 0:
        return {}

    correct   = sum(r["is_correct"] for r in responses)
    accuracy  = correct / total_q

    # ── difficulty breakdown ──────────────────────────────────────────
    diff_acc = {}
    for diff in ["Easy", "Medium", "Hard"]:
        group = [r for r in responses if r["question_difficulty"] == diff]
        diff_acc[diff] = (
            sum(r["is_correct"] for r in group) / len(group)
            if group else np.nan
        )

    # ── time features ─────────────────────────────────────────────────
    times      = [r["time_spent_sec"] for r in responses]
    avg_time   = sum(times) / total_q

    score_pct  = (correct / total_q) * 100   # same as accuracy × 100

    slow_wrong = sum(
        1 for r in responses
        if r["time_spent_sec"] > avg_time and r["is_correct"] == 0
    ) / total_q

    fast_wrong = sum(
        1 for r in responses
        if r["time_spent_sec"] < 15 and r["is_correct"] == 0
    ) / total_q

    # ── per-topic accuracy ────────────────────────────────────────────
    topic_groups: dict[str, list] = {}
    for r in responses:
        t = r["question_topic"]
        topic_groups.setdefault(t, []).append(r["is_correct"])

    topic_acc = {
        t: sum(vals) / len(vals)
        for t, vals in topic_groups.items()
    }

    # ── assemble feature dict ─────────────────────────────────────────
    features = {
        f"{prefix}_accuracy":               round(accuracy, 4),
        f"{prefix}_score_pct":              round(score_pct, 2),
        f"{prefix}_avg_time_sec":           round(avg_time, 2),
        f"{prefix}_easy_accuracy":          round(diff_acc.get("Easy",   np.nan), 4),
        f"{prefix}_medium_accuracy":        round(diff_acc.get("Medium", np.nan), 4),
        f"{prefix}_hard_accuracy":          round(diff_acc.get("Hard",   np.nan), 4),
        f"{prefix}_slow_wrong_ratio":       round(slow_wrong, 4),
        f"{prefix}_fast_wrong_ratio":       round(fast_wrong, 4),
        f"{prefix}_num_topics_below_50pct": sum(1 for v in topic_acc.values() if v < 0.5),
        f"{prefix}_weakest_topic_score":    round(min(topic_acc.values()), 4),
    }

    for topic, acc in topic_acc.items():
        safe = topic.replace(" ", "_").replace("/", "_")
        features[f"{prefix}_topic_{safe}"] = round(acc, 4)

    return features


# ══════════════════════════════════════════════════════════════════════
# STEP 3 — add trend features (mirrors feature_engineering.py exactly)
# ══════════════════════════════════════════════════════════════════════
def add_trend_features(features: dict, quiz_scores: dict[int, float]) -> dict:
    """
    quiz_scores = {1: 63.3, 2: 58.0, ...}  (score_pct per completed quiz)
    """
    if 1 in quiz_scores and 2 in quiz_scores:
        features["trend_q1_q2"] = round(quiz_scores[2] - quiz_scores[1], 4)
    if 2 in quiz_scores and 3 in quiz_scores:
        features["trend_q2_q3"] = round(quiz_scores[3] - quiz_scores[2], 4)
        features["trend_q1_q3"] = round(quiz_scores[3] - quiz_scores[1], 4)
    if 3 in quiz_scores and 4 in quiz_scores:
        features["trend_q3_q4"] = round(quiz_scores[4] - quiz_scores[3], 4)
        features["trend_q1_q4"] = round(quiz_scores[4] - quiz_scores[1], 4)
    return features


# ══════════════════════════════════════════════════════════════════════
# STEP 4 — weak / strong topic analysis (for personalised suggestions)
# ══════════════════════════════════════════════════════════════════════
def analyse_topics(all_responses: list[dict]) -> tuple[list[str], list[str]]:
    """
    Returns (weak_topics, strong_topics) across ALL quizzes completed so far.
    Weak  = accuracy < 50%
    Strong = accuracy >= 80%
    """
    topic_groups: dict[str, list] = {}
    for r in all_responses:
        t = r["question_topic"]
        topic_groups.setdefault(t, []).append(r["is_correct"])

    topic_acc = {
        t: sum(vals) / len(vals)
        for t, vals in topic_groups.items()
    }

    weak   = sorted([t for t, a in topic_acc.items() if a < 0.5],
                    key=lambda t: topic_acc[t])          # worst first
    strong = sorted([t for t, a in topic_acc.items() if a >= 0.8],
                    key=lambda t: -topic_acc[t])         # best first

    return weak, strong


# ══════════════════════════════════════════════════════════════════════
# MAIN PUBLIC FUNCTION — called by the FastAPI endpoint
# ══════════════════════════════════════════════════════════════════════
def predict_student(
    responses_per_quiz: dict[int, list[dict]],
    quiz_scores:        dict[int, float],
    quizzes_completed:  int,
) -> dict:
    """
    Parameters
    ----------
    responses_per_quiz : {quiz_num: [response_dict, ...]}
        All responses grouped by quiz number.
        e.g. {1: [...30 responses...], 2: [...30 responses...]}

    quiz_scores : {quiz_num: score_pct}
        The score percentage for each completed quiz.
        e.g. {1: 63.3, 2: 58.0}

    quizzes_completed : int
        How many quizzes the student has finished (1–4).
        Determines which model to load.

    Returns
    -------
    dict with keys:
        predicted_final_score  float   0–100
        risk_label             str     "High" / "Medium" / "Low"
        confidence             str     "low" / "medium" / "high"
        weak_topics            list[str]
        strong_topics          list[str]
        stage                  int
    """
    stage = min(quizzes_completed, 4)

    # ── build features for each completed quiz ────────────────────────
    all_features: dict = {}
    for q_num in range(1, stage + 1):
        responses = responses_per_quiz.get(q_num, [])
        q_features = build_features_for_quiz(responses, q_num)
        all_features.update(q_features)

    # ── add trend features ────────────────────────────────────────────
    all_features = add_trend_features(all_features, quiz_scores)

    # ── load model and align feature columns ─────────────────────────
    bundle       = load_model(stage)
    feature_cols = bundle["feature_cols"]
    regressor    = bundle["regressor"]
    classifier   = bundle["classifier"]

    # fill any missing columns with 0 (handles topics not seen in this quiz)
    feature_vector = [all_features.get(col, 0.0) for col in feature_cols]
    X = np.array(feature_vector).reshape(1, -1)

    # ── run predictions ───────────────────────────────────────────────
    predicted_score = float(regressor.predict(X)[0])
    predicted_score = round(max(0.0, min(100.0, predicted_score)), 1)

    risk_label      = str(classifier.predict(X)[0])

    # ── confidence — higher stage = more confident ────────────────────
    confidence_map  = {1: "low", 2: "low", 3: "medium", 4: "high"}
    confidence      = confidence_map[stage]

    # ── topic analysis across all quizzes done so far ─────────────────
    all_responses = []
    for q_num in range(1, stage + 1):
        all_responses.extend(responses_per_quiz.get(q_num, []))

    weak_topics, strong_topics = analyse_topics(all_responses)

    return {
        "predicted_final_score": predicted_score,
        "risk_label":            risk_label,
        "confidence":            confidence,
        "weak_topics":           weak_topics,
        "strong_topics":         strong_topics,
        "stage":                 stage,
    }


# ══════════════════════════════════════════════════════════════════════
# QUICK TEST — run this file directly to verify it works
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import pandas as pd

    print("\n── Testing predict.py with real student data ──\n")

    # load STU0002 from the real CSVs as a test
    q1 = pd.read_csv("data/raw/programming1_quiz1_synthetic_dataset.csv")
    q2 = pd.read_csv("data/raw/quiz2_dataset_fixed.csv")

    stu = "STU0002"

    def to_responses(df, stu_no):
        rows = df[df["stu_no"] == stu_no]
        return [
            {
                "question_topic":      r["question_topic"],
                "question_difficulty": r["question_difficulty"],
                "is_correct":          int(r["is_correct"]),
                "time_spent_sec":      int(r["time_spent_sec"]),
            }
            for _, r in rows.iterrows()
        ]

    r1 = to_responses(q1, stu)
    r2 = to_responses(q2, stu)

    s1 = round((sum(r["is_correct"] for r in r1) / len(r1)) * 100, 2)
    s2 = round((sum(r["is_correct"] for r in r2) / len(r2)) * 100, 2)

    # test stage 1 (only Q1 done)
    result1 = predict_student(
        responses_per_quiz = {1: r1},
        quiz_scores        = {1: s1},
        quizzes_completed  = 1,
    )
    print(f"After Q1 only:")
    print(f"  Predicted final score : {result1['predicted_final_score']}")
    print(f"  Risk label            : {result1['risk_label']}")
    print(f"  Confidence            : {result1['confidence']}")
    print(f"  Weak topics           : {result1['weak_topics'][:3]}")
    print(f"  Strong topics         : {result1['strong_topics'][:3]}")

    # test stage 2 (Q1 + Q2 done)
    result2 = predict_student(
        responses_per_quiz = {1: r1, 2: r2},
        quiz_scores        = {1: s1, 2: s2},
        quizzes_completed  = 2,
    )
    print(f"\nAfter Q1 + Q2:")
    print(f"  Predicted final score : {result2['predicted_final_score']}")
    print(f"  Risk label            : {result2['risk_label']}")
    print(f"  Confidence            : {result2['confidence']}")
    print(f"  Weak topics           : {result2['weak_topics'][:3]}")
    print(f"  Strong topics         : {result2['strong_topics'][:3]}")

    print("\n── predict.py working correctly ──\n")