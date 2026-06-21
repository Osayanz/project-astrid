from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from .. import models
from ..auth import decode_token

router = APIRouter(tags=["feedback"])

ALLOWED_CONTEXTS = {"quiz_completed", "quiz_created"}


def _user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        return decode_token(authorization.split(" ", 1)[1])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


class FeedbackIn(BaseModel):
    context: str
    quiz_id: Optional[UUID] = None
    rating:  int = Field(ge=1, le=5)
    comment: Optional[str] = None


@router.post("/feedback")
def submit_feedback(
    payload: FeedbackIn,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    if payload.context not in ALLOWED_CONTEXTS:
        raise HTTPException(status_code=400, detail="Invalid feedback context")

    uid = UUID(user["sub"])

    # one rating per user per quiz per context — update if it already exists
    existing = (
        db.query(models.Feedback)
        .filter(
            models.Feedback.user_id == uid,
            models.Feedback.context == payload.context,
            models.Feedback.quiz_id == payload.quiz_id,
        )
        .first()
    )
    if existing:
        existing.rating = payload.rating
        existing.comment = (payload.comment or "").strip() or None
        db.commit()
        return {"ok": True, "updated": True, "id": str(existing.id)}

    fb = models.Feedback(
        user_id=uid,
        role=user.get("role"),
        context=payload.context,
        quiz_id=payload.quiz_id,
        rating=payload.rating,
        comment=(payload.comment or "").strip() or None,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"ok": True, "updated": False, "id": str(fb.id)}


@router.get("/feedback/check")
def check_feedback(
    context: str,
    quiz_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    authorization: str = Header(None),
):
    user = _user(authorization)
    uid = UUID(user["sub"])
    exists = (
        db.query(models.Feedback)
        .filter(
            models.Feedback.user_id == uid,
            models.Feedback.context == context,
            models.Feedback.quiz_id == quiz_id,
        )
        .first()
    )
    return {"submitted": exists is not None}
