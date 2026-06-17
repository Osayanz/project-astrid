import os
import pickle
import warnings
import pandas as pd
import numpy as np
warnings.filterwarnings("ignore")

from sklearn.ensemble         import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection  import train_test_split, cross_val_score
from sklearn.metrics          import (mean_absolute_error, r2_score,
                                      classification_report, accuracy_score)
from sklearn.preprocessing    import LabelEncoder

FEATURES_DIR = "data/features"
MODELS_DIR   = "models"
REPORT_PATH  = "models/evaluation_report.txt"

os.makedirs(MODELS_DIR, exist_ok=True)

LABEL_COLS = {"stu_no", "final_mark", "final_grade", "passed", "risk_label"}



def load_stage(stage: int):
    path = os.path.join(FEATURES_DIR, f"features_stage{stage}.csv")
    df   = pd.read_csv(path)
    feat_cols = [c for c in df.columns if c not in LABEL_COLS]
    X = df[feat_cols]
    y_reg  = df["final_mark"]          
    y_clf  = df["risk_label"]          
    return X, y_reg, y_clf, feat_cols


def train_and_evaluate(stage: int, report_lines: list):
    print(f"\n── stage {stage} ──────────────────────────────")
    X, y_reg, y_clf, feat_cols = load_stage(stage)

    X_train, X_test, yr_train, yr_test, yc_train, yc_test = train_test_split(
        X, y_reg, y_clf, test_size=0.2, random_state=42
    )

    reg = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=-1,
    )
    reg.fit(X_train, yr_train)
    yr_pred = reg.predict(X_test)
    mae  = mean_absolute_error(yr_test, yr_pred)
    r2   = r2_score(yr_test, yr_pred)

    cv_mae = -cross_val_score(reg, X, y_reg,
                              cv=5, scoring="neg_mean_absolute_error",
                              n_jobs=-1).mean()

    print(f"  Regression  — MAE: {mae:.2f}  R²: {r2:.3f}  CV-MAE: {cv_mae:.2f}")

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=4,
        class_weight="balanced",   
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, yc_train)
    yc_pred = clf.predict(X_test)
    acc = accuracy_score(yc_test, yc_pred)

    cv_acc = cross_val_score(clf, X, y_clf,
                             cv=5, scoring="accuracy",
                             n_jobs=-1).mean()

    print(f"  Classifier  — Accuracy: {acc*100:.1f}%  CV-Accuracy: {cv_acc*100:.1f}%")

    importance = pd.Series(reg.feature_importances_, index=feat_cols)
    top10 = importance.nlargest(10)
    print("  Top 10 predictive features:")
    for fname, score in top10.items():
        print(f"    {score:.3f}  {fname}")

    bundle = {
        "stage":         stage,
        "feature_cols":  feat_cols,
        "regressor":     reg,
        "classifier":    clf,
        "risk_thresholds": {"High": 50, "Medium": 65},
    }
    model_path = os.path.join(MODELS_DIR, f"model_stage{stage}.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"  saved → {model_path}")

    report_lines += [
        f"\n{'='*55}",
        f"Stage {stage}  ({len(feat_cols)} features, "
        f"{len(X_train)} train / {len(X_test)} test)",
        f"{'='*55}",
        f"Regression  (predict final_mark 0–100)",
        f"  MAE        : {mae:.2f} marks  (on average, off by {mae:.1f} marks)",
        f"  R²         : {r2:.3f}  (1.0 = perfect, 0 = no better than mean)",
        f"  CV-MAE     : {cv_mae:.2f} marks  (5-fold cross-validation)",
        f"",
        f"Classification  (predict High / Medium / Low risk)",
        f"  Accuracy   : {acc*100:.1f}%",
        f"  CV-Accuracy: {cv_acc*100:.1f}%  (5-fold cross-validation)",
        f"",
        f"Classification report:",
        classification_report(yc_test, yc_pred),
        f"Top 10 features by importance:",
    ] + [f"  {s:.3f}  {n}" for n, s in top10.items()]

    return {"stage": stage, "mae": mae, "r2": r2, "cv_mae": cv_mae,
            "acc": acc, "cv_acc": cv_acc}


def run():
    print("\n══ ASTRID — Model Training ══════════════════════")
    report_lines = ["ASTRID — Model Evaluation Report", "="*55]
    results = []

    for stage in [1, 2, 3, 4]:
        r = train_and_evaluate(stage, report_lines)
        results.append(r)

    print("\n\n── Summary ──────────────────────────────────────")
    print(f"{'Stage':<8} {'MAE':>8} {'R²':>8} {'CV-MAE':>10} {'Acc%':>8} {'CV-Acc%':>10}")
    print("-" * 56)
    for r in results:
        print(f"  Q{r['stage']:<5}  {r['mae']:>6.2f}  {r['r2']:>6.3f}  "
              f"{r['cv_mae']:>8.2f}  {r['acc']*100:>6.1f}%  {r['cv_acc']*100:>8.1f}%")

    summary = [
        "\n\nSummary",
        "-"*56,
        f"{'Stage':<8} {'MAE':>8} {'R²':>8} {'CV-MAE':>10} {'Acc%':>8} {'CV-Acc%':>10}",
        "-"*56,
    ] + [
        f"  Q{r['stage']:<5}  {r['mae']:>6.2f}  {r['r2']:>6.3f}  "
        f"{r['cv_mae']:>8.2f}  {r['acc']*100:>6.1f}%  {r['cv_acc']*100:>8.1f}%"
        for r in results
    ]
    report_lines += summary

    with open(REPORT_PATH, "w") as f:
        f.write("\n".join(report_lines))
    print(f"\nReport saved → {REPORT_PATH}")
    print("Models saved → models/model_stage1.pkl … model_stage4.pkl")
    print("\n══ Training complete ════════════════════════════\n")


if __name__ == "__main__":
    run()