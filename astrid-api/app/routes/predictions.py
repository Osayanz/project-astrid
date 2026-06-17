import sys
import os
from fastapi        import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from uuid           import UUID
from pydantic       import BaseModel
from typing         import Optional, List

from ..db   import get_db
from ..     import models
from ..auth import decode_token


API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

try:
    from predict import predict_student
    ML_AVAILABLE = True
except Exception as e:
    ML_AVAILABLE = False
    ML_ERROR     = str(e)
    print(f"[predictions] ML not available: {e}")

router = APIRouter(prefix="/predictions", tags=["predictions"])


class PredictionOut(BaseModel):
    attempt_id:            UUID
    predicted_final_score: Optional[float]
    risk_label:            Optional[str]
    confidence:            Optional[str]
    weak_topics:           List[str]
    strong_topics:         List[str]
    stage:                 int
    prediction_status:     str


def require_user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/{attempt_id}", response_model=PredictionOut)
def run_prediction(
    attempt_id:    UUID,
    db:            Session = Depends(get_db),
    authorization: str     = Header(None),
):
    user = require_user(authorization)

    attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if user["role"] == "student" and str(attempt.student_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your attempt")

    student_id = attempt.student_id

    all_attempts = (
        db.query(models.Attempt, models.Quiz)
        .join(models.Quiz, models.Attempt.quiz_id == models.Quiz.id)
        .filter(
            models.Attempt.student_id == student_id,
            models.Quiz.quiz_number.isnot(None),
            models.Attempt.score_percentage.isnot(None),
        )
        .order_by(models.Quiz.quiz_number)
        .all()
    )

    if not all_attempts:
        raise HTTPException(status_code=400, detail="No completed quiz attempts found")

    responses_per_quiz: dict = {}
    quiz_scores:        dict = {}

    for att, quiz in all_attempts:
        q_num = quiz.quiz_number

        rows = (
            db.query(models.Response, models.Question)
            .join(models.Question, models.Response.question_id == models.Question.id)
            .filter(models.Response.attempt_id == att.id)
            .all()
        )

        response_list = [
            {
                "question_topic":      (q.topic_tag       or "General"),
                "question_difficulty": (q.difficulty_level or "Medium"),
                "is_correct":          int(r.is_correct) if r.is_correct is not None else 0,
                "time_spent_sec":      r.time_spent_sec or 30,
            }
            for r, q in rows
        ]

        if response_list:
            responses_per_quiz[q_num] = response_list
            quiz_scores[q_num]        = float(att.score_percentage or 0)

    quizzes_completed = len(responses_per_quiz)

    if quizzes_completed == 0:
        raise HTTPException(status_code=400, detail="No responses found — cannot predict")

    if not ML_AVAILABLE:
        return _rule_based_fallback(attempt, db)

    try:
        result = predict_student(
            responses_per_quiz = responses_per_quiz,
            quiz_scores        = quiz_scores,
            quizzes_completed  = quizzes_completed,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction failed: {str(e)}")

    attempt.predicted_final_score = result["predicted_final_score"]
    attempt.risk_level            = result["risk_label"]
    attempt.prediction_status     = "ml_predicted"
    db.commit()

    return PredictionOut(
        attempt_id            = attempt.id,
        predicted_final_score = result["predicted_final_score"],
        risk_label            = result["risk_label"],
        confidence            = result["confidence"],
        weak_topics           = result["weak_topics"],
        strong_topics         = result["strong_topics"],
        stage                 = result["stage"],
        prediction_status     = "ml_predicted",
    )


def _rule_based_fallback(attempt, db) -> PredictionOut:
    pct = attempt.score_percentage or 0
    attempt.risk_level        = "High" if pct < 40 else ("Medium" if pct < 60 else "Low")
    attempt.prediction_status = "rule_based"
    db.commit()
    return PredictionOut(
        attempt_id            = attempt.id,
        predicted_final_score = pct,
        risk_label            = attempt.risk_level,
        confidence            = "low",
        weak_topics           = [],
        strong_topics         = [],
        stage                 = 0,
        prediction_status     = "rule_based",
    )