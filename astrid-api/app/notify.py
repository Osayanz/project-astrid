from datetime import datetime
from typing import Optional, List
from uuid import UUID

from sqlalchemy.orm import Session

from . import models

CURRENT_YEAR = datetime.now().year


def year_of_study(enrollment_year: Optional[int]) -> Optional[int]:
    """enrollment 2022 -> in 2026 this returns 4 (4th year)."""
    if not enrollment_year:
        return None
    return CURRENT_YEAR - enrollment_year


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    type: str,
    title: str,
    body: Optional[str] = None,
    severity: Optional[str] = None,
    ref_id: Optional[UUID] = None,
    commit: bool = True,
) -> models.Notification:
    """Insert a single notification row for one recipient."""
    n = models.Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        severity=severity,
        ref_id=ref_id,
    )
    db.add(n)
    if commit:
        db.commit()
        db.refresh(n)
    return n


def eligible_students_for_subject(db: Session, subject: "models.Subject") -> List["models.User"]:
    """Students whose year_of_study matches the subject's target_year
    (or all students when the subject has no target year)."""
    students = db.query(models.User).filter(models.User.role == "student").all()
    if subject is None or subject.target_year is None:
        return students
    return [
        s for s in students
        if year_of_study(s.enrollment_year) == subject.target_year
    ]


def notify_new_quiz(db: Session, quiz: "models.Quiz") -> int:
    """Notify every eligible student that a new quiz is available.
    Returns the number of notifications created."""
    subject = None
    subject_name = "General"
    if quiz.subject_id:
        subject = db.query(models.Subject).filter(models.Subject.id == quiz.subject_id).first()
        if subject:
            subject_name = subject.name

    recipients = eligible_students_for_subject(db, subject)
    for s in recipients:
        create_notification(
            db,
            user_id=s.id,
            type="new_quiz",
            title="New quiz available",
            body=f'"{quiz.title}" was added to {subject_name}. Give it a try!',
            ref_id=quiz.id,
            commit=False,
        )
    db.commit()
    return len(recipients)


def notify_weak_topics(db: Session, attempt: "models.Attempt") -> Optional[models.Notification]:
    """After a student submits a quiz, build a notification listing the
    topics they were weakest in for that attempt."""
    rows = (
        db.query(models.Question.topic_tag, models.Response.is_correct)
        .join(models.Response, models.Response.question_id == models.Question.id)
        .filter(models.Response.attempt_id == attempt.id)
        .all()
    )

    topic_stats: dict = {}
    for topic, is_correct in rows:
        name = topic or "General"
        d = topic_stats.setdefault(name, {"total": 0, "wrong": 0})
        d["total"] += 1
        if is_correct is False:
            d["wrong"] += 1

    weak = []
    for name, d in topic_stats.items():
        if d["total"] > 0 and (d["wrong"] / d["total"]) >= 0.5:
            weak.append(name)

    quiz = db.query(models.Quiz).filter(models.Quiz.id == attempt.quiz_id).first()
    quiz_title = quiz.title if quiz else "your quiz"

    if weak:
        body = (
            f'You scored {attempt.score_percentage}% on "{quiz_title}". '
            f'Focus on: {", ".join(weak)}.'
        )
    else:
        body = (
            f'You scored {attempt.score_percentage}% on "{quiz_title}". '
            f'No weak topics detected — great work!'
        )

    return create_notification(
        db,
        user_id=attempt.student_id,
        type="weak_topics",
        title=f"Results: {quiz_title}",
        body=body,
        ref_id=attempt.id,
    )
