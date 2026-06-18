from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..auth import decode_token
from uuid import UUID
from ..deps import get_current_user 
from ..auth import get_current_user

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

def require_user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        return decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("", response_model=schemas.QuizOut)
def create_quiz(payload: schemas.QuizCreate, db: Session = Depends(get_db), authorization: str = Header(None)):
    user = require_user(authorization)

    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can create quizzes")

    quiz = models.Quiz(
        title=payload.title,
        description=payload.description,
        duration=payload.duration,
        quiz_number=payload.quiz_number,      
        subject_id=payload.subject_id,        
        created_by=UUID(user["sub"]),
    )

    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # notify eligible students that a new quiz is available
    try:
        from ..notify import notify_new_quiz
        notify_new_quiz(db, quiz)
    except Exception as e:
        print(f"[quizzes] notify_new_quiz failed: {e}")

    return quiz

@router.post("/{quiz_id}/questions", response_model=schemas.QuestionOut)
def add_question(quiz_id: UUID, payload: schemas.QuestionCreate, db: Session = Depends(get_db), authorization: str = Header(None)):
    user = require_user(authorization)
    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can add questions")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    data = payload.model_dump()

    if data.get("topic_id"):
        topic = db.query(models.Topic).filter(models.Topic.id == data["topic_id"]).first()
        if topic:
            data["topic_tag"] = topic.name

    if not data.get("topic_tag"):
        data["topic_tag"] = "General"

    q = models.Question(quiz_id=quiz_id, **data)
    db.add(q)
    db.commit()
    db.refresh(q)
    return q

@router.get("/{quiz_id}", response_model=schemas.QuizOut)
def get_quiz(quiz_id: UUID, db: Session = Depends(get_db)):
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.get("/{quiz_id}/questions", response_model=list[schemas.QuestionOut])
def list_questions(quiz_id: UUID, db: Session = Depends(get_db)):
    return db.query(models.Question).filter(models.Question.quiz_id == quiz_id).all()

@router.get("/", response_model=list[schemas.QuizOut])
def get_quizzes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    q = db.query(models.Quiz)
    if getattr(current_user, "role", None) == "lecturer":
        q = q.filter(models.Quiz.created_by == current_user.id)  # adjust field name
    return q.all()

@router.get("/{quiz_id}/analytics", response_model=schemas.QuizAnalyticsOut)
def get_quiz_analytics(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    authorization: str = Header(None)
):
    user = require_user(authorization)

    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can view analytics")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempts = db.query(models.Attempt).filter(
        models.Attempt.quiz_id == quiz_id,
        models.Attempt.submitted_at.isnot(None)
    ).all()

    total_attempts = len(attempts)

    if total_attempts == 0:
        return schemas.QuizAnalyticsOut(
            total_attempts=0,
            class_average=0,
            high_risk_count=0,
            medium_risk_count=0,
            low_risk_count=0,
            average_duration_sec=0
        )

    percentages = [
        float(a.score_percentage or 0)
        for a in attempts
    ]

    durations = [
        int(a.duration_sec or 0)
        for a in attempts
    ]

    high_risk_count = len([a for a in attempts if a.risk_level == "High"])
    medium_risk_count = len([a for a in attempts if a.risk_level == "Medium"])
    low_risk_count = len([a for a in attempts if a.risk_level == "Low"])

    class_average = round(sum(percentages) / total_attempts, 2)
    average_duration_sec = round(sum(durations) / total_attempts, 2)

    return schemas.QuizAnalyticsOut(
        total_attempts=total_attempts,
        class_average=class_average,
        high_risk_count=high_risk_count,
        medium_risk_count=medium_risk_count,
        low_risk_count=low_risk_count,
        average_duration_sec=average_duration_sec
    )

@router.get("/{quiz_id}/weak-topics", response_model=list[schemas.WeakTopicOut])
def get_weak_topics(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    authorization: str = Header(None)
):
    user = require_user(authorization)

    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can view weak topics")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    rows = (
        db.query(
            models.Question.topic_tag,
            models.Response.is_correct
        )
        .join(models.Response, models.Response.question_id == models.Question.id)
        .join(models.Attempt, models.Attempt.id == models.Response.attempt_id)
        .filter(models.Attempt.quiz_id == quiz_id)
        .all()
    )

    topic_data = {}

    for topic, is_correct in rows:
        topic_name = topic or "General"

        if topic_name not in topic_data:
            topic_data[topic_name] = {
                "total_answers": 0,
                "wrong_answers": 0
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
                wrong_percentage=wrong_percentage
            )
        )

    result.sort(key=lambda x: x.wrong_percentage, reverse=True)

    return result

@router.get("/{quiz_id}/results", response_model=list[schemas.QuizResultOut])
def get_quiz_results(
    quiz_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can view quiz results")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    results = (
        db.query(models.Attempt, models.User)
        .join(models.User, models.Attempt.student_id == models.User.id)
        .filter(models.Attempt.quiz_id == quiz_id)
        .all()
    )

    return [
        schemas.QuizResultOut(
            attempt_id=attempt.id,
            student_id=user.id,
            student_name=user.name,
            student_email=user.email,
            score=attempt.score,
            max_score=attempt.max_score,
            attempt_no=attempt.attempt_no,
            duration_sec=attempt.duration_sec,
            score_percentage=attempt.score_percentage,
            risk_level=attempt.risk_level,
            prediction_status=attempt.prediction_status,
            submitted_at=attempt.submitted_at,
)
        for attempt, user in results
    ]