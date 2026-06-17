from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..auth import decode_token
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter(prefix="/attempts", tags=["attempts"])


def require_user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]

    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/start", response_model=schemas.AttemptStartOut)
def start_attempt(
    payload: schemas.AttemptStartIn,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = require_user(authorization)

    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can start attempts")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    existing = (
        db.query(models.Attempt)
        .filter(
            models.Attempt.quiz_id == payload.quiz_id,
            models.Attempt.student_id == UUID(user["sub"]),
        )
        .first()
    )

    if existing:
        # already submitted → block re-attempt
        if existing.score_percentage is not None:
            raise HTTPException(status_code=400,
                detail="You have already completed this quiz")
        # started but never submitted → resume the same attempt
        return {"attempt_id": existing.id}

    attempt = models.Attempt(
        quiz_id=payload.quiz_id,
        student_id=UUID(user["sub"]),
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return {"attempt_id": attempt.id}


@router.post("/submit", response_model=schemas.AttemptResultOut)
def submit_attempt(
    payload: schemas.AttemptSubmitIn,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = require_user(authorization)

    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit attempts")

    attempt = db.query(models.Attempt).filter(models.Attempt.id == payload.attempt_id).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if str(attempt.student_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your attempt")

    questions = db.query(models.Question).filter(models.Question.quiz_id == attempt.quiz_id).all()
    qmap = {str(q.id): q for q in questions}

    score = 0
    max_score = 0

    # clear old responses if re-submitting
    db.query(models.Response).filter(models.Response.attempt_id == attempt.id).delete()

    for q in questions:
        max_score += int(q.points or 1)

    for ans in payload.answers:
        q = qmap.get(str(ans.question_id))

        if not q:
            continue

        is_correct = ans.selected_option == q.correct_option

        if is_correct:
            score += int(q.points or 1)

        response = models.Response(
            attempt_id=attempt.id,
            question_id=q.id,
            selected_option=ans.selected_option,
            is_correct=is_correct,
            time_spent_sec=ans.time_spent_sec,   # FIX 2 — now actually saved
            answered_at=ans.answered_at,          # FIX 2 — now actually saved
        )

        db.add(response)

    attempt.score = score
    attempt.max_score = max_score
    attempt.started_at = payload.started_at or attempt.started_at
    attempt.submitted_at = payload.submitted_at or datetime.now(timezone.utc)

    if payload.duration_sec is not None:
        attempt.duration_sec = payload.duration_sec
    elif attempt.started_at and attempt.submitted_at:
        started_at = attempt.started_at
        submitted_at = attempt.submitted_at

        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)

        if submitted_at.tzinfo is None:
            submitted_at = submitted_at.replace(tzinfo=timezone.utc)

        attempt.duration_sec = int((submitted_at - started_at).total_seconds())
    else:
        attempt.duration_sec = 0

    if max_score > 0:
        attempt.score_percentage = round((score / max_score) * 100, 2)
    else:
        attempt.score_percentage = 0

    if attempt.score_percentage < 40:
        attempt.risk_level = "High"
    elif attempt.score_percentage < 60:
        attempt.risk_level = "Medium"
    else:
        attempt.risk_level = "Low"

    attempt.prediction_status = "rule_based"

    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "duration_sec": attempt.duration_sec,
        "score_percentage": attempt.score_percentage,
        "risk_level": attempt.risk_level,
        "prediction_status": attempt.prediction_status,
    }


@router.get("/{attempt_id}/weak-topics", response_model=list[schemas.WeakTopicOut])
def get_attempt_weak_topics(
    attempt_id: UUID,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = require_user(authorization)

    attempt = db.query(models.Attempt).filter(models.Attempt.id == attempt_id).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if user["role"] == "student" and str(attempt.student_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="You can only view your own weak topics")

    rows = (
        db.query(
            models.Question.topic_tag,
            models.Response.is_correct,
        )
        .join(models.Response, models.Response.question_id == models.Question.id)
        .filter(models.Response.attempt_id == attempt_id)
        .all()
    )

    topic_data = {}

    for topic, is_correct in rows:
        topic_name = topic or "General"

        if topic_name not in topic_data:
            topic_data[topic_name] = {
                "total_answers": 0,
                "wrong_answers": 0,
            }

        topic_data[topic_name]["total_answers"] += 1

        if is_correct is False:
            topic_data[topic_name]["wrong_answers"] += 1

    result = []

    for topic, data in topic_data.items():
        total = data["total_answers"]
        wrong = data["wrong_answers"]

        wrong_percentage = round((wrong / total) * 100, 2) if total > 0 else 0

        result.append(
            schemas.WeakTopicOut(
                topic=topic,
                total_answers=total,
                wrong_answers=wrong,
                wrong_percentage=wrong_percentage,
            )
        )

    result.sort(key=lambda x: x.wrong_percentage, reverse=True)

    return result