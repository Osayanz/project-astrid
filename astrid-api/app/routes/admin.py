from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import decode_token, hash_password
from ..notify import year_of_study

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        user = decode_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user


def _latest_prediction(attempts):
    done = [a for a in attempts if a.score_percentage is not None]
    if not done:
        return None, None, 0
    last = done[-1]
    return last.risk_level, last.predicted_final_score, len(done)


def _weak_strong_topics(db: Session, attempt_ids: list):
    if not attempt_ids:
        return [], []
    rows = (
        db.query(models.Question.topic_tag, models.Response.is_correct)
        .join(models.Response, models.Response.question_id == models.Question.id)
        .filter(models.Response.attempt_id.in_(attempt_ids))
        .all()
    )
    acc: dict = {}
    for topic, ok in rows:
        t = topic or "General"
        acc.setdefault(t, []).append(1 if ok else 0)
    topic_acc = {t: sum(v) / len(v) for t, v in acc.items()}
    weak = sorted([t for t, a in topic_acc.items() if a < 0.5], key=lambda t: topic_acc[t])
    strong = sorted([t for t, a in topic_acc.items() if a >= 0.8], key=lambda t: -topic_acc[t])
    return weak, strong


# ══════════════════════════════════════════════════════════════════════
# ADD STUDENT
# ══════════════════════════════════════════════════════════════════════
class StudentCreate(BaseModel):
    name:            str
    email:           EmailStr
    password:        str = Field(min_length=6)
    enrollment_year: int


class StudentCreatedOut(BaseModel):
    id:    UUID
    name:  str
    email: str
    enrollment_year: Optional[int]


@router.post("/students", response_model=StudentCreatedOut)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    require_admin(authorization)

    exists = db.query(models.User).filter(models.User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")

    student = models.User(
        name=payload.name.strip(),
        email=payload.email,
        password=hash_password(payload.password),
        role="student",
        enrollment_year=payload.enrollment_year,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentCreatedOut(
        id=student.id, name=student.name, email=student.email,
        enrollment_year=student.enrollment_year,
    )


# ══════════════════════════════════════════════════════════════════════
# YEARS
# ══════════════════════════════════════════════════════════════════════
class YearOut(BaseModel):
    year:          int          # year of study (1, 2, 3, 4 ...)
    student_count: int
    subject_count: int


@router.get("/years", response_model=List[YearOut])
def list_years(
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    require_admin(authorization)

    students = db.query(models.User).filter(models.User.role == "student").all()

    counts: dict = {}
    for s in students:
        y = year_of_study(s.enrollment_year)
        if y is None or y < 1:
            continue
        counts[y] = counts.get(y, 0) + 1

    subjects = db.query(models.Subject).all()
    subj_counts: dict = {}
    for subj in subjects:
        if subj.target_year is None:
            continue
        subj_counts[subj.target_year] = subj_counts.get(subj.target_year, 0) + 1

    years = sorted(set(list(counts.keys()) + list(subj_counts.keys())))
    return [
        YearOut(year=y, student_count=counts.get(y, 0), subject_count=subj_counts.get(y, 0))
        for y in years
    ]


# ══════════════════════════════════════════════════════════════════════
# SUBJECTS FOR A YEAR
# ══════════════════════════════════════════════════════════════════════
class SubjectCardOut(BaseModel):
    id:           UUID
    name:         str
    description:  Optional[str] = None
    target_year:  Optional[int] = None
    quiz_count:   int
    topic_count:  int


@router.get("/years/{year}/subjects", response_model=List[SubjectCardOut])
def subjects_for_year(
    year: int,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    require_admin(authorization)

    subjects = (
        db.query(models.Subject)
        .filter(models.Subject.target_year == year)
        .order_by(models.Subject.created_at)
        .all()
    )

    out = []
    for s in subjects:
        quiz_count = db.query(models.Quiz).filter(models.Quiz.subject_id == s.id).count()
        topic_count = db.query(models.Topic).filter(models.Topic.subject_id == s.id).count()
        out.append(SubjectCardOut(
            id=s.id, name=s.name, description=s.description,
            target_year=s.target_year, quiz_count=quiz_count, topic_count=topic_count,
        ))
    return out


# ══════════════════════════════════════════════════════════════════════
# SUBJECT PERFORMANCE (per-student)
# ══════════════════════════════════════════════════════════════════════
class StudentPerfRow(BaseModel):
    id:                    UUID
    name:                  str
    email:                 str
    enrollment_year:       Optional[int]
    year_of_study:         Optional[int]
    quizzes_completed:     int
    avg_score:             Optional[float]
    risk_level:            Optional[str]
    predicted_final_score: Optional[float]


class SubjectPerformanceOut(BaseModel):
    subject_id:    UUID
    subject_name:  str
    target_year:   Optional[int]
    quiz_count:    int
    class_average: Optional[float]
    students:      List[StudentPerfRow]


@router.get("/subjects/{subject_id}/performance", response_model=SubjectPerformanceOut)
def subject_performance(
    subject_id: UUID,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    require_admin(authorization)

    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    quizzes = db.query(models.Quiz).filter(models.Quiz.subject_id == subject_id).all()
    quiz_ids = [q.id for q in quizzes]

    students = db.query(models.User).filter(models.User.role == "student").all()
    eligible = [
        s for s in students
        if subject.target_year is None
        or year_of_study(s.enrollment_year) == subject.target_year
    ]

    rows: List[StudentPerfRow] = []
    all_scores: List[float] = []
    for s in eligible:
        attempts = []
        if quiz_ids:
            attempts = (
                db.query(models.Attempt)
                .join(models.Quiz, models.Attempt.quiz_id == models.Quiz.id)
                .filter(
                    models.Attempt.student_id == s.id,
                    models.Attempt.quiz_id.in_(quiz_ids),
                    models.Attempt.score_percentage.isnot(None),
                )
                .order_by(models.Quiz.quiz_number)
                .all()
            )
        scores = [a.score_percentage for a in attempts if a.score_percentage is not None]
        avg = round(sum(scores) / len(scores), 1) if scores else None
        if avg is not None:
            all_scores.append(avg)
        risk, predicted, done = _latest_prediction(attempts)
        rows.append(StudentPerfRow(
            id=s.id, name=s.name, email=s.email,
            enrollment_year=s.enrollment_year,
            year_of_study=year_of_study(s.enrollment_year),
            quizzes_completed=done,
            avg_score=avg,
            risk_level=risk,
            predicted_final_score=predicted,
        ))

    class_average = round(sum(all_scores) / len(all_scores), 1) if all_scores else None

    return SubjectPerformanceOut(
        subject_id=subject.id,
        subject_name=subject.name,
        target_year=subject.target_year,
        quiz_count=len(quiz_ids),
        class_average=class_average,
        students=rows,
    )


class TopicsOut(BaseModel):
    weak_topics:   List[str]
    strong_topics: List[str]


@router.get("/subjects/{subject_id}/students/{student_id}/topics", response_model=TopicsOut)
def student_topics(
    subject_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    require_admin(authorization)

    quiz_ids = [q.id for q in db.query(models.Quiz)
                .filter(models.Quiz.subject_id == subject_id).all()]
    attempt_ids = []
    if quiz_ids:
        attempt_ids = [a.id for a in db.query(models.Attempt)
                       .filter(models.Attempt.student_id == student_id,
                               models.Attempt.quiz_id.in_(quiz_ids),
                               models.Attempt.score_percentage.isnot(None)).all()]
    weak, strong = _weak_strong_topics(db, attempt_ids)
    return TopicsOut(weak_topics=weak[:6], strong_topics=strong[:6])
