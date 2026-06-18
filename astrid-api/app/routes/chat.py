import requests
from fastapi        import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from uuid           import UUID
from pydantic       import BaseModel

from ..db   import get_db
from ..     import models
from ..auth import decode_token

# ── settings ──────────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "llama3.2"

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    question: str


def _user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        return decode_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── gather the student's data into a readable summary ─────────────────
def build_student_context(db: Session, student_id: UUID) -> str:
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        return ""

    # all submitted attempts joined to quiz + subject
    rows = (
        db.query(models.Attempt, models.Quiz)
        .join(models.Quiz, models.Attempt.quiz_id == models.Quiz.id)
        .filter(
            models.Attempt.student_id == student_id,
            models.Attempt.score_percentage.isnot(None),
        )
        .order_by(models.Quiz.quiz_number)
        .all()
    )

    if not rows:
        return (
            f"Student name: {student.name}\n"
            "This student has not completed any quizzes yet."
        )

    lines = [f"Student name: {student.name}", ""]

    # group by subject
    by_subject: dict = {}
    for att, quiz in rows:
        sid = str(quiz.subject_id) if quiz.subject_id else "none"
        by_subject.setdefault(sid, {"subject": None, "attempts": []})
        by_subject[sid]["attempts"].append((att, quiz))

    for sid, grp in by_subject.items():
        subject_name = "General"
        if sid != "none":
            subj = db.query(models.Subject).filter(models.Subject.id == sid).first()
            if subj:
                subject_name = subj.name

        lines.append(f"Subject: {subject_name}")

        last_attempt = grp["attempts"][-1][0]
        for att, quiz in grp["attempts"]:
            lines.append(
                f"  - Quiz {quiz.quiz_number}: scored {att.score_percentage}%"
            )

        if last_attempt.predicted_final_score is not None:
            lines.append(f"  Predicted final exam score: {last_attempt.predicted_final_score}%")
        if last_attempt.risk_level:
            lines.append(f"  Current risk level: {last_attempt.risk_level}")

        # weak / strong topics across this subject's attempts
        attempt_ids = [a.id for a, q in grp["attempts"]]
        topic_rows = (
            db.query(models.Question.topic_tag, models.Response.is_correct)
            .join(models.Response, models.Response.question_id == models.Question.id)
            .filter(models.Response.attempt_id.in_(attempt_ids))
            .all()
        )
        acc: dict = {}
        for topic, ok in topic_rows:
            t = topic or "General"
            acc.setdefault(t, []).append(1 if ok else 0)
        topic_acc = {t: sum(v) / len(v) for t, v in acc.items()}
        weak   = [t for t, a in topic_acc.items() if a < 0.5]
        strong = [t for t, a in topic_acc.items() if a >= 0.8]

        if weak:
            lines.append(f"  Weak topics (needs work): {', '.join(weak)}")
        if strong:
            lines.append(f"  Strong topics: {', '.join(strong)}")
        lines.append("")

    return "\n".join(lines)


# ── ask Ollama ────────────────────────────────────────────────────────
def ask_model(context: str, question: str) -> str:
    system_prompt = (
        "You are Astrid, a kind and encouraging study assistant that helps a "
        "student understand their own academic performance and improve. "
        "Use ONLY the data provided below about this student. Do not invent "
        "any numbers, scores, or facts. If the answer is not in the data, say "
        "you don't have that information yet. Keep replies short, supportive, "
        "and practical — when a student asks what to study, point them to their "
        "weak topics and give one or two concrete tips.\n\n"
        f"STUDENT DATA:\n{context}"
    )
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": question},
        ],
        "stream": False,
    }
    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    return response.json()["message"]["content"]


# ── endpoint ──────────────────────────────────────────────────────────
@router.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db), authorization: str = Header(None)):
    user = _user(authorization)
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Chat is for students only")

    student_id = UUID(user["sub"])
    context = build_student_context(db, student_id)

    try:
        answer = ask_model(context, req.question)
    except requests.exceptions.RequestException:
        answer = (
            "I couldn't reach the local AI model. Make sure Ollama is running "
            "and the llama3.2 model is pulled."
        )

    return {"answer": answer}