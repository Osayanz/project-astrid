"""
routes/overview.py  —  Astrid API (Update 2)
==============================================
  GET /students/me/overview
      → per-subject prediction + weak/strong topics for the logged-in student

  GET /subjects/{subject_id}/detail
      → lecturer view: quizzes in subject + eligible student list
        (eligible = year_of_study matches subject.target_year)

  GET /subjects/{subject_id}/students/{student_id}/weak-topics
      → weak topics for one student across the subject's quizzes

  GET /quizzes/{quiz_id}/overview
      → lecturer quiz analysis: attempted/eligible counts, class averages,
        risk distribution, per-student rows (with attempt_id for popups)
"""

from datetime       import datetime
from fastapi        import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from uuid           import UUID
from pydantic       import BaseModel
from typing         import Optional, List

from ..db   import get_db
from ..     import models
from ..auth import decode_token

router = APIRouter(tags=["overview"])

CURRENT_YEAR = datetime.now().year


def _user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        return decode_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def year_of_study(enrollment_year: Optional[int]) -> Optional[int]:
    """enrollment 2022 → in 2026 this returns 4 (4th year)."""
    if not enrollment_year:
        return None
    return CURRENT_YEAR - enrollment_year


def _weak_strong_topics(db: Session, attempt_ids: list):
    """Aggregate topic accuracy across the given attempts."""
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
    weak   = sorted([t for t, a in topic_acc.items() if a < 0.5],  key=lambda t: topic_acc[t])
    strong = sorted([t for t, a in topic_acc.items() if a >= 0.8], key=lambda t: -topic_acc[t])
    return weak, strong


def _latest_prediction(attempts):
    """From a list of Attempt rows, return (risk, predicted) of the most
    advanced submitted attempt (highest quiz_number)."""
    done = [a for a in attempts if a.score_percentage is not None]
    if not done:
        return None, None, 0
    last = done[-1]
    return last.risk_level, last.predicted_final_score, len(done)


# ══════════════════════════════════════════════════════════════════════
# STUDENT — per-subject overview for the dashboard
# ══════════════════════════════════════════════════════════════════════
class SubjectOverviewOut(BaseModel):
    subject_id:            Optional[UUID]
    subject_name:          str
    quizzes_completed:     int
    quizzes_total:         int
    predicted_final_score: Optional[float]
    risk_level:            Optional[str]
    weak_topics:           List[str]
    strong_topics:         List[str]


@router.get("/students/me/overview", response_model=List[SubjectOverviewOut])
def my_overview(db: Session = Depends(get_db), authorization: str = Header(None)):
    user = _user(authorization)
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")
    sid = UUID(user["sub"])

    # all submitted attempts joined to quiz (for subject + ordering)
    rows = (
        db.query(models.Attempt, models.Quiz)
        .join(models.Quiz, models.Attempt.quiz_id == models.Quiz.id)
        .filter(models.Attempt.student_id == sid)
        .order_by(models.Quiz.quiz_number)
        .all()
    )

    by_subject: dict = {}
    for att, quiz in rows:
        key = str(quiz.subject_id) if quiz.subject_id else "none"
        by_subject.setdefault(key, {"subject_id": quiz.subject_id, "attempts": []})
        by_subject[key]["attempts"].append(att)

    result = []
    for key, grp in by_subject.items():
        subject_name = "General"
        quizzes_total = 4
        if grp["subject_id"]:
            subj = db.query(models.Subject).filter(models.Subject.id == grp["subject_id"]).first()
            if subj:
                subject_name = subj.name
            quizzes_total = (
                db.query(models.Quiz)
                .filter(models.Quiz.subject_id == grp["subject_id"]).count()
            )

        risk, predicted, done_count = _latest_prediction(grp["attempts"])
        attempt_ids = [a.id for a in grp["attempts"] if a.score_percentage is not None]
        weak, strong = _weak_strong_topics(db, attempt_ids)

        result.append(SubjectOverviewOut(
            subject_id            = grp["subject_id"],
            subject_name          = subject_name,
            quizzes_completed     = done_count,
            quizzes_total         = quizzes_total,
            predicted_final_score = predicted,
            risk_level            = risk,
            weak_topics           = weak[:5],
            strong_topics         = strong[:5],
        ))
    return result


# ══════════════════════════════════════════════════════════════════════
# LECTURER — subject detail (quizzes + eligible students)
# ══════════════════════════════════════════════════════════════════════
class QuizCardOut(BaseModel):
    id:            UUID
    title:         str
    quiz_number:   Optional[int]
    attempt_count: int

class StudentRowOut(BaseModel):
    id:                    UUID
    name:                  str
    email:                 str
    enrollment_year:       Optional[int]
    year_of_study:         Optional[int]
    quizzes_completed:     int
    risk_level:            Optional[str]
    predicted_final_score: Optional[float]

class SubjectDetailOut(BaseModel):
    subject_id:   UUID
    subject_name: str
    target_year:  Optional[int]
    quizzes:      List[QuizCardOut]
    students:     List[StudentRowOut]


@router.get("/subjects/{subject_id}/detail", response_model=SubjectDetailOut)
def subject_detail(subject_id: UUID, db: Session = Depends(get_db),
                   authorization: str = Header(None)):
    user = _user(authorization)
    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Lecturers only")

    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    quizzes = (
        db.query(models.Quiz)
        .filter(models.Quiz.subject_id == subject_id)
        .order_by(models.Quiz.quiz_number)
        .all()
    )
    quiz_ids = [q.id for q in quizzes]

    quiz_cards = []
    for q in quizzes:
        cnt = (db.query(models.Attempt)
               .filter(models.Attempt.quiz_id == q.id,
                       models.Attempt.score_percentage.isnot(None)).count())
        quiz_cards.append(QuizCardOut(id=q.id, title=q.title,
                                      quiz_number=q.quiz_number, attempt_count=cnt))

    # eligible students: year_of_study == subject.target_year (or all if not set)
    students_q = db.query(models.User).filter(models.User.role == "student")
    all_students = students_q.all()
    eligible = [
        s for s in all_students
        if subject.target_year is None
        or year_of_study(s.enrollment_year) == subject.target_year
    ]

    rows = []
    for s in eligible:
        attempts = []
        if quiz_ids:
            attempts = (
                db.query(models.Attempt)
                .join(models.Quiz, models.Attempt.quiz_id == models.Quiz.id)
                .filter(models.Attempt.student_id == s.id,
                        models.Attempt.quiz_id.in_(quiz_ids))
                .order_by(models.Quiz.quiz_number)
                .all()
            )
        risk, predicted, done = _latest_prediction(attempts)
        rows.append(StudentRowOut(
            id=s.id, name=s.name, email=s.email,
            enrollment_year=s.enrollment_year,
            year_of_study=year_of_study(s.enrollment_year),
            quizzes_completed=done,
            risk_level=risk,
            predicted_final_score=predicted,
        ))

    return SubjectDetailOut(
        subject_id=subject.id, subject_name=subject.name,
        target_year=subject.target_year,
        quizzes=quiz_cards, students=rows,
    )


# ══════════════════════════════════════════════════════════════════════
# LECTURER — one student's weak topics within a subject
# ══════════════════════════════════════════════════════════════════════
class TopicsOut(BaseModel):
    weak_topics:   List[str]
    strong_topics: List[str]


@router.get("/subjects/{subject_id}/students/{student_id}/weak-topics",
            response_model=TopicsOut)
def student_subject_topics(subject_id: UUID, student_id: UUID,
                           db: Session = Depends(get_db),
                           authorization: str = Header(None)):
    user = _user(authorization)
    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Lecturers only")

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


# ══════════════════════════════════════════════════════════════════════
# LECTURER — full quiz overview
# ══════════════════════════════════════════════════════════════════════
class QuizStudentRow(BaseModel):
    student_id:            UUID
    attempt_id:            UUID
    name:                  str
    email:                 str
    score_percentage:      Optional[float]
    risk_level:            Optional[str]
    predicted_final_score: Optional[float]

class QuizOverviewOut(BaseModel):
    quiz_id:        UUID
    title:          str
    quiz_number:    Optional[int]
    eligible_total: int
    attempted:      int
    avg_score:      Optional[float]
    avg_predicted:  Optional[float]
    risk_counts:    dict
    students:       List[QuizStudentRow]


@router.get("/quizzes/{quiz_id}/overview", response_model=QuizOverviewOut)
def quiz_overview(quiz_id: UUID, db: Session = Depends(get_db),
                  authorization: str = Header(None)):
    user = _user(authorization)
    if user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Lecturers only")

    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # eligible count — students matching the subject's target year
    target_year = None
    if quiz.subject_id:
        subj = db.query(models.Subject).filter(models.Subject.id == quiz.subject_id).first()
        target_year = subj.target_year if subj else None

    all_students = db.query(models.User).filter(models.User.role == "student").all()
    eligible = [s for s in all_students
                if target_year is None or year_of_study(s.enrollment_year) == target_year]
    eligible_total = len(eligible)

    # submitted attempts for this quiz
    rows = (
        db.query(models.Attempt, models.User)
        .join(models.User, models.Attempt.student_id == models.User.id)
        .filter(models.Attempt.quiz_id == quiz_id,
                models.Attempt.score_percentage.isnot(None))
        .all()
    )

    students, scores, preds = [], [], []
    risk_counts = {"High": 0, "Medium": 0, "Low": 0}
    for att, stu in rows:
        students.append(QuizStudentRow(
            student_id=stu.id, attempt_id=att.id,
            name=stu.name, email=stu.email,
            score_percentage=att.score_percentage,
            risk_level=att.risk_level,
            predicted_final_score=att.predicted_final_score,
        ))
        if att.score_percentage is not None:
            scores.append(att.score_percentage)
        if att.predicted_final_score is not None:
            preds.append(att.predicted_final_score)
        if att.risk_level in risk_counts:
            risk_counts[att.risk_level] += 1

    return QuizOverviewOut(
        quiz_id=quiz.id, title=quiz.title, quiz_number=quiz.quiz_number,
        eligible_total=eligible_total, attempted=len(rows),
        avg_score=round(sum(scores)/len(scores), 1) if scores else None,
        avg_predicted=round(sum(preds)/len(preds), 1) if preds else None,
        risk_counts=risk_counts,
        students=students,
    )